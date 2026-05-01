"""
backend/scripts/scraper_glints.py — Glints Job Scraper
=======================================================
Scrape lowongan kerja untuk 8 cluster karier NusaNara.
Quota-based: setiap cluster berhenti setelah target terpenuhi.

Output: data/raw_jobs.csv

Jalankan dari folder backend/:
    python scripts/scraper_glints.py

Prasyarat:
    pip install selenium selenium-stealth webdriver-manager pandas
"""
import sys
import os
import time
import csv
import hashlib
import pandas as pd
from datetime import datetime

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium_stealth import stealth
from webdriver_manager.chrome import ChromeDriverManager


# ─────────────────────────────────────────────────────
# KONFIGURASI 8 CLUSTER
# ─────────────────────────────────────────────────────

CLUSTER_CONFIGS = [
    {
        "name": "Teknologi & Perangkat Lunak",
        "quota": 80,
        "keywords": [
            "Software+Engineer", "Web+Developer", "IT+Support",
            "Backend+Developer", "Frontend+Developer", "Mobile+Developer",
            "Fullstack+Developer", "PHP+Developer",
        ],
    },
    {
        "name": "Desain & Kreatif",
        "quota": 80,
        "keywords": [
            "Graphic+Designer", "UI+UX+Designer", "Content+Writer",
            "Motion+Graphic+Designer", "Video+Editor", "Creative+Designer",
        ],
    },
    {
        "name": "Analisis Data",
        "quota": 80,
        "keywords": [
            "Product+Analyst",
            "Data+Analyst",
            "Business+Intelligence",
            "Data+Engineer",
            "Business+Analyst",
            "Power+BI",
            "Excel+Analyst",
        ],
    },
    {
        "name": "Pemasaran Digital",
        "quota": 80,
        "keywords": [
            "Digital+Marketing", "Social+Media+Specialist", "SEO+Specialist",
            "Google+Ads", "Content+Marketing", "Performance+Marketing",
        ],
    },
    {
        "name": "Bisnis & Administrasi",
        "quota": 80,
        "keywords": [
            "Project+Manager", "Business+Development", "Admin+Staff",
            "IT+Project+Manager", "Product+Manager", "Operations+Manager",
        ],
    },
    # ─── 3 cluster baru yang sebelumnya hilang ────────
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

MAX_PAGES_PER_KEYWORD = 3
DELAY_BETWEEN_PAGES   = 3   # detik
DELAY_BETWEEN_KEYWORDS = 4  # detik

OUTPUT_DIR  = os.path.join(os.path.dirname(__file__), "..", "..", "data")
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "raw_jobs.csv")

CSV_FIELDNAMES = [
    "id", "title", "company", "location", "date_posted", "salary_text",
    "description", "requirements", "skills", "level", "employment_type",
    "cluster", "keyword", "source_url",
]


# ─────────────────────────────────────────────────────
# QUOTA TRACKER
# ─────────────────────────────────────────────────────

class QuotaTracker:
    def __init__(self, configs):
        self.quotas    = {c["name"]: c["quota"] for c in configs}
        self.collected = {c["name"]: 0 for c in configs}

    def is_full(self, cluster):
        return self.collected[cluster] >= self.quotas[cluster]

    def increment(self, cluster):
        self.collected[cluster] += 1

    def summary(self):
        lines = []
        for name, target in self.quotas.items():
            got = self.collected[name]
            pct = int(got / target * 100) if target else 0
            bar = "#" * (pct // 5) + "-" * (20 - pct // 5)
            lines.append(f"  {name:<35} {got:>3}/{target:<3} [{bar}] {pct}%")
        return "\n".join(lines)


# ─────────────────────────────────────────────────────
# DEDUPLICATOR
# ─────────────────────────────────────────────────────

class Deduplicator:
    def __init__(self):
        self._seen = set()

    def is_dup(self, job):
        url = job.get("source_url", "")
        if url:
            if url in self._seen:
                return True
            self._seen.add(url)
            return False
        h = hashlib.md5(f"{job.get('title','').lower()}::{job.get('company','').lower()}".encode()).hexdigest()
        if h in self._seen:
            return True
        self._seen.add(h)
        return False


# ─────────────────────────────────────────────────────
# BROWSER
# ─────────────────────────────────────────────────────

def create_driver():
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--window-size=1920,1080")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    opts.add_experimental_option("excludeSwitches", ["enable-automation"])
    opts.add_experimental_option("useAutomationExtension", False)

    svc    = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=svc, options=opts)
    driver.set_page_load_timeout(60)

    stealth(driver,
        languages=["id-ID", "id", "en-US", "en"],
        vendor="Google Inc.", platform="Win32",
        webgl_vendor="Intel Inc.", renderer="Intel Iris OpenGL Engine",
        fix_hairline=True,
    )
    return driver


# ─────────────────────────────────────────────────────
# SCRAPE DAFTAR JOBS
# ─────────────────────────────────────────────────────

def scrape_job_list(driver, keyword, cluster, quota_tracker, dedup):
    result = []

    for page in range(1, MAX_PAGES_PER_KEYWORD + 1):
        if quota_tracker.is_full(cluster):
            break

        url = (
            f"https://glints.com/id/opportunities/jobs/explore"
            f"?keyword={keyword}&country=ID"
            f"&locationName=All+Cities%2FProvinces&lowestLocationLevel=1"
        )
        print(f"    [p{page}] {keyword.replace('+', ' ')} ...")

        try:
            driver.get(url)
            time.sleep(4)

            try:
                WebDriverWait(driver, 15).until(
                    EC.presence_of_element_located(
                        (By.CSS_SELECTOR, 'div[class*="JobCardsc__JobcardContainer"]')
                    )
                )
            except Exception:
                print("    ⚠ Timeout / tidak ada job card")
                break

            driver.execute_script("window.scrollTo(0, document.body.scrollHeight/2);")
            time.sleep(1)
            driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(2)

            cards = driver.find_elements(By.CSS_SELECTOR, 'div[class*="JobCardsc__JobcardContainer"]')
            if not cards:
                break

            for i, card in enumerate(cards):
                if quota_tracker.is_full(cluster):
                    break
                try:
                    title_el = card.find_element(By.CSS_SELECTOR,
                        'a[class*="CompactOpportunityCardsc__JobCardTitleNoStyleAnchor"]')
                    title = title_el.get_attribute("innerText").strip()
                    link  = title_el.get_attribute("href") or ""
                    job_id = link.split("/")[-1].split("?")[0] if link else f"j{i}"

                    try:
                        company = card.find_element(By.CSS_SELECTOR,
                            'a[class*="CompactOpportunityCardsc__CompanyLink"]'
                        ).get_attribute("innerText").strip()
                    except Exception:
                        company = "Hidden"

                    try:
                        location = card.find_element(By.CSS_SELECTOR,
                            'div[class*="CardJobLocation__LocationWrapper"]'
                        ).get_attribute("innerText").strip()
                    except Exception:
                        location = "Indonesia"

                    try:
                        date_text = card.find_element(By.CSS_SELECTOR,
                            'p[class*="CompactOpportunityCardsc__UpdatedAtMessage"]'
                        ).get_attribute("innerText").strip()
                    except Exception:
                        date_text = ""

                    salary = None
                    try:
                        salary = card.find_element(By.CSS_SELECTOR,
                            'span[class*="CompactOpportunityCardsc__SalaryWrapper"]'
                        ).get_attribute("innerText").strip()
                    except Exception:
                        try:
                            salary = card.find_element(By.CSS_SELECTOR,
                                'span[class*="CompactOpportunityCardsc__NotDisclosedMessage"]'
                            ).get_attribute("innerText").strip()
                        except Exception:
                            pass

                    job = {
                        "id": job_id, "title": title, "company": company,
                        "location": location, "date_posted": date_text,
                        "salary_text": salary, "cluster": cluster,
                        "keyword": keyword.replace("+", " "), "source_url": link,
                    }

                    if dedup.is_dup(job):
                        continue

                    result.append(job)
                    quota_tracker.increment(cluster)

                except Exception as e:
                    print(f"    ⚠ skip card {i}: {str(e)[:50]}")

            # Next page
            if page < MAX_PAGES_PER_KEYWORD and not quota_tracker.is_full(cluster):
                try:
                    nxt = driver.find_element(By.CSS_SELECTOR, 'button[aria-label="Next"]')
                    driver.execute_script("arguments[0].click();", nxt)
                    time.sleep(DELAY_BETWEEN_PAGES)
                except Exception:
                    break

        except Exception as e:
            print(f"    ✗ Error: {str(e)[:60]}")
            break

    return result


# ─────────────────────────────────────────────────────
# SCRAPE DETAIL
# ─────────────────────────────────────────────────────

def scrape_job_detail(driver, job):
    if not job.get("source_url"):
        _fill_defaults(job)
        return job

    try:
        driver.get(job["source_url"])
        time.sleep(2)

        # Description
        try:
            desc_el = WebDriverWait(driver, 8).until(
                EC.presence_of_element_located(
                    (By.CSS_SELECTOR, 'div[class*="DraftjsReadersc__ContentContainer"]')
                )
            )
            job["description"] = " ".join(
                desc_el.get_attribute("innerText").replace("\n", " ").split()
            )[:600]
        except Exception:
            job["description"] = ""

        # Requirements tags
        try:
            req_wrapper = driver.find_element(By.CSS_SELECTOR,
                'div[class*="JobRequirementssc__TagsWrapper"]')
            tags = req_wrapper.find_elements(By.CSS_SELECTOR,
                'div[class*="JobRequirementssc__Tag"]')
            job["requirements"] = ", ".join(
                t.get_attribute("innerText").strip()
                for t in tags if t.get_attribute("innerText")
            )
        except Exception:
            job["requirements"] = ""

        # Skills
        try:
            sc = driver.find_element(By.CSS_SELECTOR, 'div[class*="Skillssc__TagContainer"]')
            skill_tags = sc.find_elements(By.CSS_SELECTOR, 'div[class*="Skillssc__TagOverride"]')
            job["skills"] = ", ".join(
                t.get_attribute("innerText").strip()
                for t in skill_tags if t.get_attribute("innerText")
            )
        except Exception:
            job["skills"] = ""

        # Level & Employment Type
        job["level"] = ""
        job["employment_type"] = ""
        try:
            badges = driver.find_elements(By.CSS_SELECTOR,
                'div[class*="TopFoldExperimentsc__BadgesContainer"] div[class*="Badge"]')
            for badge in badges:
                text = badge.get_attribute("innerText").strip()
                tl = text.lower()
                if any(k in tl for k in ["tahun", "year", "senior", "junior", "entry", "fresh"]):
                    job["level"] = text
                elif any(k in tl for k in ["full-time", "part-time", "contract", "freelance", "internship", "magang"]):
                    job["employment_type"] = text
        except Exception:
            pass

    except Exception as e:
        print(f"    ⚠ detail err ({job.get('title','?')[:30]}): {str(e)[:50]}")
        _fill_defaults(job)

    return job


def _fill_defaults(job):
    for k in ["description", "requirements", "skills", "level", "employment_type"]:
        job.setdefault(k, "")


# ─────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total_target = sum(c["quota"] for c in CLUSTER_CONFIGS)
    print("=" * 65)
    print("  NusaNara — Glints Scraper (8 Cluster)")
    print(f"  Target  : {total_target} job postings")
    print(f"  Cluster : {len(CLUSTER_CONFIGS)}")
    print("=" * 65)

    quota_tracker = QuotaTracker(CLUSTER_CONFIGS)
    dedup         = Deduplicator()

    print("\n[1/3] Menginisialisasi browser...")
    driver = create_driver()
    print("✓ Browser siap\n")

    # ── STEP 1: Scraping per cluster ────────────────────────
    print("[2/3] Scraping lowongan...\n")
    all_jobs = []

    for cfg in CLUSTER_CONFIGS:
        cluster = cfg["name"]
        print(f"\n{'─'*65}")
        print(f"  CLUSTER: {cluster}  (target: {cfg['quota']})")
        print(f"{'─'*65}")

        for kw in cfg["keywords"]:
            if quota_tracker.is_full(cluster):
                print(f"  ✓ Quota tercapai — lanjut cluster berikutnya")
                break
            jobs = scrape_job_list(driver, kw, cluster, quota_tracker, dedup)
            all_jobs.extend(jobs)
            print(f"  → {cluster}: {quota_tracker.collected[cluster]}/{cfg['quota']}")
            time.sleep(DELAY_BETWEEN_KEYWORDS)

        got = quota_tracker.collected[cluster]
        status = "✓" if got >= cfg["quota"] else "⚠"
        print(f"\n  {status} Final '{cluster}': {got}/{cfg['quota']}\n")

    print("\nDistribusi terkumpul:")
    print(quota_tracker.summary())

    # ── STEP 2: Scrape detail ──────────────────────────────
    print(f"\n[3/3] Mengambil detail {len(all_jobs)} lowongan...")
    for i, job in enumerate(all_jobs, 1):
        if i % 25 == 0 or i == 1:
            print(f"  {i}/{len(all_jobs)} — {job.get('title','')[:45]}")
        scrape_job_detail(driver, job)

    driver.quit()
    print("\n✓ Browser ditutup")

    # ── STEP 3: Simpan CSV ─────────────────────────────────
    with open(OUTPUT_FILE, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(all_jobs)

    print(f"\n{'='*65}")
    print(f"✓ SELESAI! {len(all_jobs)} lowongan disimpan ke:")
    print(f"  {OUTPUT_FILE}")
    print(f"{'='*65}\n")

    df = pd.read_csv(OUTPUT_FILE)
    print("Distribusi per cluster:")
    print(df["cluster"].value_counts().to_string())
    print(f"\nTotal: {len(df)}")


if __name__ == "__main__":
    main()
