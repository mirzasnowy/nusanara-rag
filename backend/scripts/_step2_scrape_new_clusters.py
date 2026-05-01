"""
Scrape hanya 3 cluster yang masih kurang:
  - Sales & Customer Service   (80 jobs)
  - Finance & Accounting       (80 jobs)
  - Education & Training       (80 jobs)

Jalankan dari folder backend/:
    python scripts/_step2_scrape_new_clusters.py
"""
import sys, os, time, csv, hashlib
from datetime import datetime

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

import pandas as pd
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_stealth import stealth
from webdriver_manager.chrome import ChromeDriverManager

# Import fungsi scraping dari scraper utama
sys.path.insert(0, os.path.dirname(__file__))
from scraper_glints import (
    create_driver, scrape_job_list, scrape_job_detail,
    QuotaTracker, Deduplicator, CSV_FIELDNAMES, OUTPUT_DIR, OUTPUT_FILE
)

# Hanya cluster yang masih kurang
NEW_CLUSTERS = [
    {
        "name": "Analisis Data",
        "quota": 33,   # DB sudah punya 57 → target 90 → perlu 33 lagi
        "keywords": [
            "Product+Analyst",     # ← keyword baru yang ditambah user
            "Data+Analyst",
            "Business+Intelligence",
            "Junior+Data+Analyst",
            "Excel+Analyst",
            "Power+BI",
        ],
    },
    {
        "name": "Sales & Customer Service",
        "quota": 80,
        "keywords": [
            "Sales+Executive", "Customer+Service", "Call+Center",
            "Account+Executive", "Sales+Representative", "Customer+Success",
            "Telemarketing",
        ],
    },
    {
        "name": "Finance & Accounting",
        "quota": 80,
        "keywords": [
            "Accounting+Staff", "Finance+Analyst", "Auditor",
            "Tax+Staff", "Finance+Staff", "Akuntan",
            "Finance+Manager",
        ],
    },
    {
        "name": "Education & Training",
        "quota": 80,
        "keywords": [
            "Teacher", "Tutor", "Trainer",
            "Instruktur", "Guru", "Pengajar",
            "Learning+Development",
        ],
    },
]

NEW_OUTPUT = os.path.join(OUTPUT_DIR, "raw_jobs_new_clusters.csv")

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total = sum(c["quota"] for c in NEW_CLUSTERS)
    print("=" * 65)
    print("  Scraping 3 Cluster Baru")
    print(f"  Target  : {total} job postings")
    print("=" * 65)

    quota_tracker = QuotaTracker(NEW_CLUSTERS)
    dedup         = Deduplicator()

    print("\n[1/3] Inisialisasi browser...")
    driver = create_driver()
    print("✓ Browser siap\n")

    print("[2/3] Scraping daftar lowongan...")
    all_jobs = []

    for cfg in NEW_CLUSTERS:
        cluster = cfg["name"]
        print(f"\n--- {cluster} (target: {cfg['quota']}) ---")
        for kw in cfg["keywords"]:
            if quota_tracker.is_full(cluster):
                print(f"  ✓ Quota penuh")
                break
            jobs = scrape_job_list(driver, kw, cluster, quota_tracker, dedup)
            all_jobs.extend(jobs)
            print(f"  {cluster}: {quota_tracker.collected[cluster]}/{cfg['quota']}")
            time.sleep(4)

    print(f"\n[3/3] Mengambil detail {len(all_jobs)} lowongan...")
    for i, job in enumerate(all_jobs, 1):
        if i % 25 == 0 or i == 1:
            print(f"  {i}/{len(all_jobs)} — {job.get('title','')[:45]}")
        scrape_job_detail(driver, job)

    driver.quit()
    print("\n✓ Browser ditutup")

    with open(NEW_OUTPUT, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_jobs)

    print(f"\n✓ {len(all_jobs)} lowongan disimpan ke:\n  {NEW_OUTPUT}")

    df = pd.read_csv(NEW_OUTPUT)
    print("\nDistribusi:")
    print(df["cluster"].value_counts().to_string())

if __name__ == "__main__":
    main()
