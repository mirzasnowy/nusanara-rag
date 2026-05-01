"""
Rebuild content Analisis Data dengan konteks lebih tepat per sub-peran.
Fokus: data analyst, BI, data science, product analyst.
"""
import asyncio, asyncpg, os, sys, httpx
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv; load_dotenv()

DB         = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")
OLLAMA_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text-v2-moe")

def build_analisis_content(title: str, company: str, location: str,
                           salary_text: str, skills: list) -> str:
    """Build rich context for Analisis Data cluster."""
    tl = title.lower()

    if any(w in tl for w in ["data scientist", "machine learning", "ml", "ai engineer", "artificial intelligence"]):
        context = ("data scientist, machine learning, AI, deep learning, Python, R, "
                   "model prediktif, statistik, analisis data lanjutan")
    elif any(w in tl for w in ["business intelligence", "bi analyst", "bi developer", "bi engineer"]):
        context = ("business intelligence, BI analyst, Power BI, Tableau, dashboard, "
                   "SQL, data visualization, reporting bisnis, ETL")
    elif any(w in tl for w in ["data engineer", "data architect", "data pipeline"]):
        context = ("data engineer, data pipeline, ETL, SQL, database, data warehouse, "
                   "big data, Apache Spark, cloud data platform")
    elif any(w in tl for w in ["product analyst", "product data", "product owner", "product manager", "product"]):
        context = ("product analyst, analisis produk, SQL, metrics, A/B testing, "
                   "user analytics, growth, data driven product, KPI")
    elif any(w in tl for w in ["business analyst", "business & data", "business consultant"]):
        context = ("business analyst, analisis bisnis, SQL, Excel, Power BI, "
                   "requirements gathering, process improvement, data bisnis")
    elif any(w in tl for w in ["data analyst", "junior data", "intern data", "real time analyst"]):
        context = ("data analyst, SQL, Excel, Python, visualisasi data, dashboard, "
                   "laporan analitik, data driven, reporting, insight bisnis")
    else:
        context = ("analisis data, SQL, Excel, Python, visualisasi, dashboard, "
                   "reporting, data driven, business intelligence")

    skills_text = ", ".join(skills) if skills else "SQL, Excel, Python, Data Analysis"
    salary_part = f"Gaji: {salary_text}. " if salary_text else ""
    loc_part    = f"Lokasi: {location}. " if location else ""

    return (
        f"search_document: {title} di {company}. "
        f"{loc_part}"
        f"{salary_part}"
        f"Klaster: Analisis Data. "
        f"Konteks karier: {context}. "
        f"Keahlian: {skills_text}. "
        f"Syarat: Minimal 1 tahun pengalaman analisis data."
    )

async def main():
    conn = await asyncpg.connect(DB)

    rows = await conn.fetch(
        "SELECT id, title, company, location, salary_text, skills, content "
        "FROM knowledge_base WHERE cluster='Analisis Data'"
    )
    print(f"Analisis Data: {len(rows)} baris")

    ok = fail = 0
    async with httpx.AsyncClient(timeout=120) as client:
        for row in rows:
            new_content = build_analisis_content(
                row['title'],
                row['company'] or "Perusahaan",
                row['location'] or "Indonesia",
                row['salary_text'],
                row['skills'] or []
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
                if ok % 20 == 0 or ok == 1:
                    print(f"  [{ok}/{len(rows)}] {row['title'][:50]}")
            except Exception as e:
                print(f"  ERR {row['title']}: {e}")
                fail += 1

    print(f"\n✓ Re-embedded: {ok} OK, {fail} gagal")

    # Sample verifikasi
    print("\nSample content setelah rebuild:")
    samples = await conn.fetch(
        "SELECT title, content FROM knowledge_base "
        "WHERE cluster='Analisis Data' ORDER BY RANDOM() LIMIT 3"
    )
    for r in samples:
        title   = r['title']
        content = r['content']
        print(f"\n  [{title}]")
        print(f"  {content[:160]}...")

    await conn.close()

asyncio.run(main())
