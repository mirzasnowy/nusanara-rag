"""
Direct scrape + import + embed untuk Finance (8 lagi) dan Sales (18 lagi)
menggunakan keyword yang berbeda dari sebelumnya.
"""
import asyncio, asyncpg, os, sys, time, httpx
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv; load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))
from scraper_glints import create_driver, scrape_job_list, scrape_job_detail, Deduplicator

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")
OLLAMA_URL   = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL  = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text-v2-moe")
TARGET = 90

EXTRA_SCRAPE = [
    # keyword,                      cluster,                    max
    ("Data+Science",                "Analisis Data",            5),
    ("BI+Analyst",                  "Analisis Data",            5),
    ("Market+Research+Analyst",     "Analisis Data",            5),
    ("Auditor",                     "Finance & Accounting",     5),
    ("Finance+Manager",             "Finance & Accounting",     5),
    ("Content+Marketing+Specialist","Pemasaran Digital",        5),
    ("Email+Marketing",             "Pemasaran Digital",        5),
]

def infer_skills(title, cluster):
    tl = title.lower()
    if "sales" in tl or "account" in tl: return ["Sales", "Negotiation", "Communication"]
    if "customer" in tl: return ["Customer Service", "Communication", "CRM"]
    if "finance" in tl or "account" in tl or "junior acc" in tl: return ["Accounting", "Excel", "Financial Reporting"]
    if "data" in tl or "analyst" in tl: return ["SQL", "Excel", "Data Analysis"]
    if "seo" in tl: return ["SEO", "Google Analytics", "Content Writing"]
    defaults = {
        "Finance & Accounting":       ["Accounting", "Excel", "Financial Reporting"],
        "Sales & Customer Service":   ["Communication", "Sales", "Customer Handling"],
        "Analisis Data":              ["SQL", "Excel", "Data Analysis"],
        "Pemasaran Digital":          ["Marketing", "Communication", "Social Media"],
    }
    return defaults.get(cluster, ["Communication", "Analysis"])

async def get_counts(conn):
    rows = await conn.fetch("SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster")
    return {r["cluster"]: r["n"] for r in rows}

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    counts = await get_counts(conn)
    print("Distribusi sekarang:")
    for c, n in sorted(counts.items()):
        print(f"  {c:<35} {n}")

    # Hitung gap per cluster
    gaps = {c: max(0, TARGET - n) for c, n in counts.items()}
    print("\nGap menuju 90:")
    for c, g in gaps.items():
        if g > 0:
            print(f"  {c}: perlu {g} lagi")

    if all(g == 0 for g in gaps.values()):
        print("✓ Semua cluster sudah 90!")
        await conn.close()
        return

    # Scrape
    driver = create_driver()
    dedup  = Deduplicator()

    # Isi dedup dengan URL yang sudah ada
    existing_urls = await conn.fetch("SELECT source_url FROM knowledge_base WHERE source_url IS NOT NULL")
    for r in existing_urls:
        dedup._seen.add(r["source_url"])

    new_jobs = []
    cluster_counts = {c: 0 for c in gaps}

    for kw, cluster, max_take in EXTRA_SCRAPE:
        if gaps.get(cluster, 0) <= cluster_counts[cluster]:
            continue
        still_need = gaps[cluster] - cluster_counts[cluster]
        if still_need <= 0:
            continue

        print(f"\nScraping '{kw}' for {cluster} (masih perlu {still_need})...")

        class MiniQ:
            def __init__(self, q): self.q = min(q, max_take); self.n = 0
            def is_full(self, _): return self.n >= self.q
            def increment(self, _): self.n += 1

        qt = MiniQ(still_need)
        jobs = scrape_job_list(driver, kw, cluster, qt, dedup)
        for j in jobs:
            scrape_job_detail(driver, j)
        new_jobs.extend(jobs)
        cluster_counts[cluster] = cluster_counts.get(cluster, 0) + len(jobs)
        print(f"  → {cluster}: +{len(jobs)} jobs")
        time.sleep(3)

    driver.quit()
    print(f"\n✓ Total scraped: {len(new_jobs)}")

    # Import + embed
    ok = skip = 0
    async with httpx.AsyncClient(timeout=60) as client:
        for job in new_jobs:
            title   = (job.get("title") or "").strip()
            company = (job.get("company") or "").strip()
            cluster = (job.get("cluster") or "").strip()
            if not title: skip += 1; continue

            exists = await conn.fetchval(
                "SELECT id FROM knowledge_base WHERE title=$1 AND company=$2 LIMIT 1",
                title, company
            )
            if exists: skip += 1; continue

            skills = infer_skills(title, cluster)
            content = f"Posisi: {title}. Klaster: {cluster}. Keahlian: {', '.join(skills)}."

            try:
                resp = await client.post(f"{OLLAMA_URL}/api/embeddings",
                    json={"model": EMBED_MODEL, "prompt": content})
                vec = resp.json()["embedding"]

                await conn.execute(
                    """INSERT INTO knowledge_base
                       (title, company, location, requirements, skills, cluster,
                        experience_min, source_url, content, embedding)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::vector)""",
                    title, company,
                    job.get("location") or "Indonesia",
                    "Minimal 1 tahun pengalaman.",
                    skills, cluster, 1,
                    job.get("source_url") or None,
                    content, str(vec),
                )
                ok += 1
            except Exception as e:
                print(f"  ERR {title}: {e}"); skip += 1

    print(f"Inserted+embedded: {ok}, Skipped: {skip}")

    # Distribusi final
    final = await conn.fetch(
        "SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster ORDER BY cluster"
    )
    print("\nDistribusi FINAL:")
    total = 0
    for r in final:
        status = "✓" if r["n"] >= TARGET else f"⚠ (kurang {TARGET - r['n']})"
        print(f"  {r['cluster']:<35} {r['n']}  {status}")
        total += r["n"]
    print(f"\nTotal: {total}")
    await conn.close()

asyncio.run(main())
