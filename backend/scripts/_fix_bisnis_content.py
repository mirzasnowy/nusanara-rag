"""
Fix Bisnis & Administrasi cluster:
1. Hapus Office Boy dan jabatan non-manajerial dari DB
2. Update content field agar lebih kaya konteks bisnis/manajemen
3. Re-embed semua Bisnis & Adm jobs dengan content baru
"""
import asyncio, asyncpg, os, sys, httpx
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv; load_dotenv()

DB         = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")
OLLAMA_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text-v2-moe")

# Judul yang tidak cocok untuk cluster Bisnis & Administrasi manajerial
NOISE_TITLES_PATTERN = [
    "office boy", "office girl", "cleaning", "security", "kurir", "driver",
    "pramubakti", "satpam", "OB", "bellman",
]

def build_bisnis_content(title: str, skills: list) -> str:
    """Buat content yang kaya konteks untuk Bisnis & Administrasi"""
    tl = title.lower()
    
    if any(w in tl for w in ["project manager", "pm ", "scrum", "agile"]):
        context = "project management, koordinasi tim, perencanaan proyek, agile, scrum, pemimpin tim, manajemen"
    elif any(w in tl for w in ["business development", "bd ", "partnership", "account manager"]):
        context = "business development, pengembangan bisnis, kemitraan, negosiasi, sales B2B, akuisisi klien"
    elif any(w in tl for w in ["operation", "general affairs", "ga "]):
        context = "operations management, general affairs, fasilitas kantor, administrasi operasional"
    elif any(w in tl for w in ["admin", "sekretaris", "secretary", "receptionist"]):
        context = "administrasi kantor, sekretaris, microsoft office, pengelolaan dokumen, komunikasi bisnis"
    elif any(w in tl for w in ["office manager", "branch manager"]):
        context = "manajemen kantor, pemimpin operasional, koordinasi staf, administrasi bisnis"
    else:
        context = "bisnis dan administrasi, manajemen, koordinasi, komunikasi, organisasi"

    skills_text = ", ".join(skills) if skills else "Communication, Analysis, Microsoft Office"
    return (
        f"Posisi: {title}. "
        f"Klaster: Bisnis & Administrasi. "
        f"Konteks: {context}. "
        f"Keahlian: {skills_text}. "
        f"Syarat: Minimal 1 tahun pengalaman di bidang bisnis dan manajemen."
    )

async def main():
    conn = await asyncpg.connect(DB)

    # STEP 1: Cek dan hapus noise
    print("=== STEP 1: Hapus noise dari Bisnis & Administrasi ===")
    all_bisnis = await conn.fetch(
        "SELECT id, title FROM knowledge_base WHERE cluster='Bisnis & Administrasi' ORDER BY id"
    )
    noise_ids = []
    for r in all_bisnis:
        tl = r['title'].lower()
        if any(p in tl for p in NOISE_TITLES_PATTERN):
            print(f"  NOISE: {r['title']} (id={r['id']})")
            noise_ids.append(r['id'])
    
    if noise_ids:
        await conn.execute(
            "DELETE FROM knowledge_base WHERE id = ANY($1)", noise_ids
        )
        print(f"  Dihapus: {len(noise_ids)} baris noise")
    else:
        print("  Tidak ada noise ditemukan")

    # Cek sisa
    count_after = await conn.fetchval(
        "SELECT COUNT(*) FROM knowledge_base WHERE cluster='Bisnis & Administrasi'"
    )
    print(f"  Sisa Bisnis & Adm: {count_after}")

    # STEP 2: Update content field dengan konteks yang lebih kaya
    print("\n=== STEP 2: Update content dengan konteks bisnis lebih kaya ===")
    bisnis_rows = await conn.fetch(
        "SELECT id, title, skills FROM knowledge_base WHERE cluster='Bisnis & Administrasi'"
    )
    
    updated = 0
    async with httpx.AsyncClient(timeout=120) as client:
        for row in bisnis_rows:
            new_content = build_bisnis_content(row['title'], row['skills'] or [])
            
            # Embed ulang
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
                updated += 1
                if updated % 20 == 0 or updated == 1:
                    print(f"  [{updated}/{len(bisnis_rows)}] Re-embedded: {row['title'][:45]}")
            except Exception as e:
                print(f"  ERR {row['title']}: {e}")

    print(f"\n  ✓ Re-embedded: {updated}/{len(bisnis_rows)}")

    # STEP 3: Verifikasi semantic similarity sekarang
    print("\n=== STEP 3: Verifikasi semantic similarity setelah fix ===")
    import sys
    sys.path.insert(0, "..")
    from rag.embed import get_embedding
    
    vec_q = await get_embedding("search_query: project management business development coordination")
    closest = await conn.fetch("""
        SELECT title, cluster, 1-(embedding<=>$1::vector) AS sim
        FROM knowledge_base WHERE embedding IS NOT NULL
        ORDER BY embedding<=>$1::vector LIMIT 10
    """, str(vec_q))
    for r in closest:
        print(f"  [{r['cluster']:<30}] {r['title'][:40]}  sim={r['sim']:.4f}")

    await conn.close()
    print("\n✓ Selesai! Jalankan evaluasi ulang.")

asyncio.run(main())
