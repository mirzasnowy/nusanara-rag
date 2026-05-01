"""
Fix Bisnis & Administrasi:
1. Hapus semua varian Admin E-commerce dari DB
2. Scrape 30 Project Manager + 30 Business Development Mgr + 30 Admin/Office
"""
import asyncio, asyncpg, os, sys, time, csv
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, os.path.dirname(__file__))
from scraper_glints import (
    create_driver, scrape_job_list, scrape_job_detail,
    Deduplicator, CSV_FIELDNAMES, OUTPUT_DIR
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")
OUTPUT_FILE  = os.path.join(OUTPUT_DIR, "raw_jobs_bisnis_fix.csv")

# 3 sub-kelompok yang balanced
BISNIS_SUBCLUSTERS = [
    {
        "label": "Project Manager (target 30)",
        "quota": 30,
        "keywords": [
            "Project+Manager", "IT+Project+Manager",
            "Product+Manager", "Scrum+Master",
        ],
    },
    {
        "label": "Business Development (target 30)",
        "quota": 30,
        "keywords": [
            "Business+Development+Manager",
            "Business+Development+Executive",
            "Account+Manager",
            "Partnership+Manager",
        ],
    },
    {
        "label": "Admin & Operations (target 30)",
        "quota": 30,
        "keywords": [
            "Office+Manager",
            "Operations+Manager",
            "General+Affairs",
            "Administrative+Manager",
            "Business+Administrator",
        ],
    },
]

# Pattern Admin E-commerce yang akan dihapus dari DB
ADMIN_ECOM_PATTERNS = [
    "admin e-commerce", "admin e commerce", "admin e-commerce",
    "ADMIN E-COMMERCE", "ADMIN E-commerce", "staff admin e",
]

async def step1_delete_admin_ecom():
    conn = await asyncpg.connect(DATABASE_URL)
    before = await conn.fetchval(
        "SELECT COUNT(*) FROM knowledge_base WHERE cluster='Bisnis & Administrasi'"
    )
    deleted = await conn.execute(
        """DELETE FROM knowledge_base
           WHERE cluster='Bisnis & Administrasi'
           AND (
             LOWER(title) LIKE '%admin e-commerce%'
             OR LOWER(title) LIKE '%admin e commerce%'
             OR LOWER(title) LIKE '%staff admin e%'
             OR LOWER(title) LIKE '%admin ecommerce%'
           )"""
    )
    after = await conn.fetchval(
        "SELECT COUNT(*) FROM knowledge_base WHERE cluster='Bisnis & Administrasi'"
    )
    print(f"  Bisnis & Adm: {before} → {after} (dihapus {before - after})")
    rows = await conn.fetch(
        "SELECT title, COUNT(*) n FROM knowledge_base WHERE cluster='Bisnis & Administrasi' GROUP BY title ORDER BY n DESC"
    )
    print("\n  Sisa data Bisnis & Adm:")
    for r in rows:
        print(f"    {r['n']:>3}x  {r['title'][:50]}")
    await conn.close()
    return before - after

async def step2_scrape():
    print("\n[2/3] Scraping 3 sub-role baru...")
    driver = create_driver()
    dedup  = Deduplicator()
    all_jobs = []

    for sub in BISNIS_SUBCLUSTERS:
        print(f"\n  --- {sub['label']} ---")

        class MiniQuota:
            def __init__(self, q): self.q = q; self.n = 0
            def is_full(self, _): return self.n >= self.q
            def increment(self, _): self.n += 1

        qt = MiniQuota(sub["quota"])
        for kw in sub["keywords"]:
            if qt.is_full(""):
                break
            jobs = scrape_job_list(driver, kw, "Bisnis & Administrasi", qt, dedup)
            all_jobs.extend(jobs)
            print(f"    {kw}: total {qt.n}/{sub['quota']}")
            time.sleep(4)
        print(f"  ✓ Terkumpul: {qt.n}/{sub['quota']}")

    print(f"\n  Mengambil detail {len(all_jobs)} lowongan...")
    for i, job in enumerate(all_jobs, 1):
        if i % 20 == 0 or i == 1:
            print(f"    {i}/{len(all_jobs)} — {job.get('title','')[:45]}")
        scrape_job_detail(driver, job)

    driver.quit()

    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_jobs)

    print(f"\n  ✓ {len(all_jobs)} job disimpan ke: {OUTPUT_FILE}")
    return all_jobs

async def step3_import(all_jobs):
    """Import jobs baru ke DB."""
    print(f"\n[3/3] Import {len(all_jobs)} job ke DB...")
    conn = await asyncpg.connect(DATABASE_URL)
    import re, httpx

    OLLAMA_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text-v2-moe")

    inserted = skipped = 0
    for job in all_jobs:
        title   = (job.get("title") or "").strip()
        company = (job.get("company") or "").strip()
        if not title: skipped += 1; continue

        exists = await conn.fetchval(
            "SELECT id FROM knowledge_base WHERE title=$1 AND company=$2 LIMIT 1",
            title, company
        )
        if exists: skipped += 1; continue

        # Inferensi skills sederhana
        tl = title.lower()
        if "project" in tl: skills = ["Project Management", "Agile", "Scrum", "Communication"]
        elif "business dev" in tl or "account" in tl: skills = ["Business Development", "Negotiation", "Communication"]
        elif "product manager" in tl: skills = ["Product Management", "Agile", "Scrum"]
        elif "operation" in tl or "general affairs" in tl or "admin" in tl:
            skills = ["Operations Management", "Microsoft Office", "Communication"]
        else: skills = ["Communication", "Analysis", "Microsoft Office"]

        exp = 3 if any(w in tl for w in ["senior","manager","head"]) else 1

        try:
            new_id = await conn.fetchval(
                """INSERT INTO knowledge_base
                   (title, company, location, requirements, skills, cluster, experience_min, source_url)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id""",
                title, company,
                job.get("location") or "Indonesia",
                f"Minimal {exp} tahun pengalaman.",
                skills, "Bisnis & Administrasi", exp,
                job.get("source_url") or None,
            )

            # Embed langsung
            content = f"Posisi: {title}. Klaster: Bisnis & Administrasi. Keahlian: {', '.join(skills)}. Syarat: Minimal {exp} tahun pengalaman."
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    f"{OLLAMA_URL}/api/embeddings",
                    json={"model": EMBED_MODEL, "prompt": content}
                )
                vec = resp.json()["embedding"]
                await conn.execute(
                    "UPDATE knowledge_base SET content=$1, embedding=$2::vector WHERE id=$3",
                    content, str(vec), new_id
                )
            inserted += 1
        except Exception as e:
            print(f"  [ERR] {title}: {e}")

    await conn.close()
    print(f"  ✓ Inserted: {inserted}, Skipped: {skipped}")

    # Verifikasi akhir
    conn2 = await asyncpg.connect(DATABASE_URL)
    rows = await conn2.fetch(
        "SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster ORDER BY n DESC"
    )
    print("\n  Distribusi DB akhir:")
    for r in rows:
        print(f"    {r['cluster']:<35} {r['n']}")
    await conn2.close()

async def main():
    print("="*55)
    print("  Fix Bisnis & Administrasi")
    print("="*55)

    print("\n[1/3] Hapus Admin E-commerce dari DB...")
    deleted = await step1_delete_admin_ecom()

    print(f"\n  → Perlu scrape ~{max(deleted, 90 - (88 - deleted))} job baru")
    all_jobs = await step2_scrape()
    await step3_import(all_jobs)

    print("\n✓ Selesai! Jalankan evaluasi ulang:")
    print("  python -X utf8 scripts/evaluate_retrieval.py")

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

asyncio.run(main())
