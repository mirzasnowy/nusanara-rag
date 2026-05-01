"""
Step: Scrape kekurangan menuju 90 per cluster.
Otomatis hitung gap dari DB, lalu scrape hanya sebanyak yang kurang.
"""
import sys, os, time, csv, asyncio, asyncpg
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
load_dotenv()

sys.path.insert(0, os.path.dirname(__file__) + "/..")
sys.path.insert(0, os.path.dirname(__file__))
from scraper_glints import (
    create_driver, scrape_job_list, scrape_job_detail,
    Deduplicator, CSV_FIELDNAMES, OUTPUT_DIR
)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")
TARGET       = 90
OUTPUT_FILE  = os.path.join(OUTPUT_DIR, "raw_jobs_top_up.csv")

# Keyword terbaik per cluster (prioritaskan variasi yg lebih bermakna)
CLUSTER_KEYWORDS = {
    "Pemasaran Digital": [
        "SEO+Content+Specialist", "Digital+Marketing+Manager",
        "Performance+Marketing", "Email+Marketing",
    ],
    "Bisnis & Administrasi": [
        # Hindari Admin+E-commerce, fokus ke Project Mgmt & Bisnis
        "Project+Manager", "Business+Development+Executive",
        "Operations+Manager", "General+Affairs",
        "Business+Development+Manager",
    ],
    "Analisis Data": [
        "Junior+Data+Analyst", "Data+Intelligence+Analyst",
        "Product+Analyst", "Marketing+Data+Analyst",
    ],
    "Education & Training": [
        "Instruktur", "Learning+Development",
        "Trainer", "Pengajar", "Tutor",
        "Corporate+Trainer",
    ],
    "Finance & Accounting": [
        "Finance+Staff", "Tax+Staff",
        "Accounting+Manager", "Finance+Accounting+Tax",
        "Akuntan", "Staff+Accounting+Tax",
    ],
    "Sales & Customer Service": [
        "Customer+Success", "Call+Center",
        "Account+Executive", "Telemarketing",
        "Sales+Representative",
    ],
}


async def get_db_counts():
    conn = await asyncpg.connect(DATABASE_URL)
    rows = await conn.fetch(
        "SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster"
    )
    await conn.close()
    return {r["cluster"]: r["n"] for r in rows}


async def main_async():
    counts = await get_db_counts()
    
    # Hitung gap
    gaps = {}
    for cluster, keywords in CLUSTER_KEYWORDS.items():
        current = counts.get(cluster, 0)
        need    = max(0, TARGET - current)
        gaps[cluster] = need

    print("=" * 60)
    print(f"  Top-Up Scraper — Target: {TARGET} per cluster")
    print("=" * 60)
    for cluster, need in gaps.items():
        current = counts.get(cluster, 0)
        print(f"  {cluster:<35} {current:>3} → {TARGET}  (ambil {need})")
    
    total_need = sum(gaps.values())
    if total_need == 0:
        print("\n✓ Semua cluster sudah >= 90. Tidak perlu scraping.")
        return

    print(f"\n  Total perlu: {total_need} job baru")

    # Filter hanya yang masih kurang
    to_scrape = {c: (gaps[c], kws) for c, kws in CLUSTER_KEYWORDS.items()
                 if gaps.get(c, 0) > 0}

    print("\n[1/3] Inisialisasi browser...")
    driver = create_driver()
    print("✓ Browser siap\n")

    all_jobs = []
    dedup    = Deduplicator()

    print("[2/3] Scraping...\n")
    for cluster, (quota, keywords) in to_scrape.items():
        # Buat QuotaTracker mini
        class MiniQuota:
            def __init__(self, q):
                self.q = q; self.n = 0
            def is_full(self, _): return self.n >= self.q
            def increment(self, _): self.n += 1
            def collected(self): return self.n

        qt = MiniQuota(quota)
        print(f"--- {cluster} (ambil {quota}) ---")
        for kw in keywords:
            if qt.is_full(cluster):
                break
            jobs = scrape_job_list(driver, kw, cluster, qt, dedup)
            all_jobs.extend(jobs)
            print(f"  {cluster}: {qt.n}/{quota}")
            time.sleep(4)
        print(f"  ✓ Terkumpul: {qt.n}/{quota}\n")

    print(f"[3/3] Mengambil detail {len(all_jobs)} lowongan...")
    for i, job in enumerate(all_jobs, 1):
        if i % 20 == 0 or i == 1:
            print(f"  {i}/{len(all_jobs)} — {job.get('title','')[:45]}")
        scrape_job_detail(driver, job)

    driver.quit()
    print("\n✓ Browser ditutup")

    # Simpan CSV
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_jobs)

    print(f"\n✓ {len(all_jobs)} lowongan disimpan ke:\n  {OUTPUT_FILE}")


# Wrap agar bisa akses asyncio di Windows
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

def main():
    asyncio.run(main_async())

if __name__ == "__main__":
    main()
