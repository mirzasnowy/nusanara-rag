"""
Rebuild content + re-embed semua cluster yang punya content pendek/miskin.
Target: Sales & Customer Service (dan cluster lain yang butuh fix).
"""
import asyncio, asyncpg, os, sys, httpx
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv; load_dotenv()

DB         = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")
OLLAMA_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text-v2-moe")

# Content yang kaya konteks per cluster
CLUSTER_CONTEXT = {
    "Sales & Customer Service": {
        "sales executive":   "sales executive, penjualan, negosiasi, closing deal, target revenue, B2B, B2C, pelanggan",
        "sales manager":     "sales manager, manajer penjualan, tim sales, target, negosiasi, strategi penjualan",
        "account manager":   "account manager, manajemen akun, hubungan klien, negosiasi, penjualan",
        "customer service":  "customer service, layanan pelanggan, handling complaint, komunikasi, CRM",
        "customer success":  "customer success, kepuasan pelanggan, retensi, onboarding, CRM",
        "call center":       "call center, inbound, outbound, telepon, pelanggan, handling",
        "default":           "sales, penjualan, layanan pelanggan, komunikasi, negosiasi, customer handling",
    },
    "Analisis Data": {
        "data analyst":      "data analyst, analisis data, SQL, Excel, Python, visualisasi data, dashboard",
        "business intelligence": "business intelligence, BI, Power BI, Tableau, SQL, dashboard, reporting",
        "product analyst":   "product analyst, analisis produk, SQL, metrics, A/B testing, data driven",
        "data science":      "data science, machine learning, Python, R, statistik, model prediktif",
        "default":           "analisis data, SQL, Excel, Python, visualisasi, reporting, data driven",
    },
}

def build_rich_content(title: str, company: str, location: str, 
                       salary_text: str, skills: list, cluster: str) -> str:
    """Build rich content like embed_knowledge.py format"""
    tl = title.lower()
    
    # Tentukan konteks berdasarkan judul
    context_map = CLUSTER_CONTEXT.get(cluster, {})
    context = context_map.get("default", "")
    for key, ctx in context_map.items():
        if key != "default" and key in tl:
            context = ctx
            break
    
    skills_text = ", ".join(skills) if skills else "Communication"
    salary_part = f"Gaji: {salary_text}. " if salary_text else ""
    loc_part    = f"Lokasi: {location}. " if location else ""
    
    return (
        f"search_document: {title} di {company}. "
        f"{loc_part}"
        f"{salary_part}"
        f"Klaster: {cluster}. "
        f"Konteks karier: {context}. "
        f"Keahlian: {skills_text}. "
        f"Syarat: Minimal 1 tahun pengalaman."
    )

async def rebuild_cluster(conn, cluster: str, client: httpx.AsyncClient):
    """Rebuild content dan re-embed semua baris dalam satu cluster"""
    # Ambil semua yang punya content pendek (< 150 karakter) atau format lama
    rows = await conn.fetch(
        """SELECT id, title, company, location, salary_text, skills, content
           FROM knowledge_base WHERE cluster=$1""",
        cluster
    )
    
    needs_rebuild = [r for r in rows if not r['content'] or 
                     'search_document' not in (r['content'] or '') or
                     len(r['content'] or '') < 150]
    
    print(f"\n  {cluster}: {len(needs_rebuild)}/{len(rows)} perlu rebuild")
    
    ok = fail = 0
    for row in needs_rebuild:
        new_content = build_rich_content(
            row['title'], row['company'] or "Perusahaan",
            row['location'] or "Indonesia", row['salary_text'],
            row['skills'] or [], cluster
        )
        try:
            resp = await client.post(
                f"{OLLAMA_URL}/api/embeddings",
                json={"model": EMBED_MODEL, "prompt": new_content}
            )
            vec = resp.json()["embedding"]
            await conn.execute(
                "UPDATE knowledge_base SET content=$1, embedding=$2::vector WHERE id=$3",
                new_content, str(vec), row['id']
            )
            ok += 1
        except Exception as e:
            print(f"    ERR {row['title']}: {e}")
            fail += 1
    
    print(f"  → Rebuilt: {ok} OK, {fail} gagal")

async def main():
    conn = await asyncpg.connect(DB)
    
    print("Rebuild content yang miskin konteks...")
    async with httpx.AsyncClient(timeout=120) as client:
        for cluster in ["Sales & Customer Service", "Analisis Data"]:
            await rebuild_cluster(conn, cluster, client)
    
    # Verifikasi
    print("\nSample content setelah rebuild:")
    for cluster in ["Sales & Customer Service", "Analisis Data"]:
        row = await conn.fetchrow(
            "SELECT title, content FROM knowledge_base WHERE cluster=$1 LIMIT 1", cluster
        )
        if row:
            print(f"\n  [{cluster}]")
            print(f"  title: {row['title']}")
            print(f"  content: {row['content'][:150]}...")
    
    await conn.close()
    print("\n✓ Selesai! Jalankan evaluasi ulang.")

asyncio.run(main())
