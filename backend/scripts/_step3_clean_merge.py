"""
Step 3: Clean raw_jobs_new_clusters.csv dan gabungkan ke cleaned_jobs.csv
Input  : data/raw_jobs_new_clusters.csv
Output : data/cleaned_jobs.csv  (append, data lama tetap ada)
"""
import sys, os, re
import pandas as pd

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR     = os.path.join(os.path.dirname(__file__), "..", "..")
INPUT_FILE   = os.path.join(BASE_DIR, "data", "raw_jobs_new_clusters.csv")
CLEANED_FILE = os.path.join(BASE_DIR, "data", "cleaned_jobs.csv")

# ── Skill keywords (sama seperti clean_jobs.py, ditambah 3 cluster baru) ──
SKILL_KEYWORDS = {
    # Teknologi
    "python": ["Python"], "javascript": ["JavaScript"], "react": ["React", "JavaScript"],
    "node": ["Node.js", "JavaScript"], "java": ["Java"], "golang": ["Go", "Golang"],
    "backend": ["Backend Development", "API Development"],
    "frontend": ["Frontend Development", "HTML", "CSS"],
    "full stack": ["Full Stack", "Backend Development", "Frontend Development"],
    "mobile": ["Mobile Development"], "android": ["Android", "Kotlin"],
    "devops": ["DevOps", "Docker", "CI/CD"], "cloud": ["Cloud Computing", "AWS"],
    # Data
    "data analyst": ["SQL", "Excel", "Python", "Data Visualization"],
    "product analyst": ["SQL", "Product Analytics", "Data Visualization", "Python"],
    "business intelligence": ["Power BI", "Tableau", "SQL", "Data Visualization"],
    "data engineer": ["Python", "SQL", "Spark", "ETL"],
    "business analyst": ["Business Analysis", "SQL", "Excel"],
    # Desain
    "ui ux": ["Figma", "UI Design", "UX Research"], "graphic": ["Photoshop", "Illustrator", "Canva"],
    "content": ["Content Creation", "Copywriting"],
    # Marketing
    "digital marketing": ["Digital Marketing", "SEO", "Google Ads"],
    "social media": ["Social Media Management", "Content Creation"],
    "seo": ["SEO", "Google Analytics"],
    # Bisnis
    "project manager": ["Project Management", "Agile", "Scrum"],
    "business development": ["Business Development", "Negotiation"],
    "finance": ["Financial Analysis", "Excel", "Accounting"],
    "admin": ["Administration", "Microsoft Office"],
    # Sales & Customer Service
    "sales": ["Sales", "Negotiation", "Communication"],
    "customer service": ["Customer Service", "Communication", "CRM"],
    "call center": ["Call Center", "Communication", "Problem Solving"],
    "account executive": ["Account Management", "Sales", "Negotiation"],
    "telemarketing": ["Telemarketing", "Communication", "Sales"],
    "customer success": ["Customer Success", "CRM", "Communication"],
    # Finance & Accounting
    "accounting": ["Accounting", "Financial Reporting", "Excel"],
    "finance analyst": ["Financial Analysis", "Excel", "Financial Modeling"],
    "auditor": ["Auditing", "Financial Reporting", "Compliance"],
    "tax": ["Tax Compliance", "Excel", "Accounting"],
    "akuntan": ["Accounting", "Financial Reporting", "Excel"],
    # Education & Training
    "teacher": ["Teaching", "Communication", "Curriculum Development"],
    "tutor": ["Tutoring", "Communication", "Subject Expertise"],
    "trainer": ["Training & Development", "Facilitation", "Communication"],
    "instruktur": ["Instruction", "Communication", "Subject Expertise"],
    "guru": ["Teaching", "Communication", "Lesson Planning"],
    "learning": ["Learning & Development", "Facilitation", "Training Design"],
}

DEFAULT_SKILLS = {
    "Analisis Data":           ["SQL", "Excel", "Data Analysis"],
    "Teknologi & Perangkat Lunak": ["Programming", "Problem Solving", "Teamwork"],
    "Teknologi":               ["Programming", "Problem Solving", "Teamwork"],
    "Desain & Kreatif":        ["Creativity", "Design Tools", "Communication"],
    "Pemasaran Digital":       ["Marketing", "Communication", "Social Media"],
    "Bisnis & Administrasi":   ["Communication", "Microsoft Office", "Analysis"],
    "Sales & Customer Service":["Communication", "Sales", "Customer Handling"],
    "Finance & Accounting":    ["Accounting", "Excel", "Financial Reporting"],
    "Education & Training":    ["Teaching", "Communication", "Subject Expertise"],
}

def parse_salary(s):
    if not s or pd.isna(s): return None, None
    s = str(s).lower().replace(",", "").replace(".", "")
    nums = re.findall(r'\d+', s)
    if not nums: return None, None
    m = 1_000_000 if any(k in s for k in ["jt", "juta"]) else 1_000
    ints = [int(n) * m for n in nums[:2]]
    return (min(ints), max(ints)) if len(ints) >= 2 else (ints[0], ints[0])

def infer_skills(row):
    text = f"{row.get('title','')}{row.get('keyword','')}".lower()
    skills = set()
    for kw, sl in SKILL_KEYWORDS.items():
        if kw in text:
            skills.update(sl)
    if not skills:
        skills.update(DEFAULT_SKILLS.get(row.get("cluster", ""), ["Communication"]))
    return sorted(skills)

def infer_exp(title):
    tl = title.lower()
    if any(w in tl for w in ["senior", "lead", "manager", "head", "director"]): return 3
    if any(w in tl for w in ["junior", "intern", "magang", "fresh"]): return 0
    return 1

def clean():
    print(f"Membaca: {INPUT_FILE}")
    df = pd.read_csv(INPUT_FILE)
    print(f"  Raw baris: {len(df)}")

    # Hapus tanpa title/company
    df = df.dropna(subset=["title", "company"])
    df = df[df["title"].str.strip() != ""]
    df = df[df["company"].str.strip() != ""]

    # Normalisasi
    df["title"]    = df["title"].str.strip()
    df["company"]  = df["company"].str.strip()
    df["location"] = df["location"].fillna("Indonesia").str.strip()

    # Hapus duplikat dalam file baru
    df = df.drop_duplicates(subset=["title", "company"], keep="first")
    print(f"  Setelah dedup internal: {len(df)}")

    # Parse salary
    sal = df.apply(lambda r: parse_salary(r.get("salary_text")), axis=1)
    df["salary_min"] = sal.apply(lambda x: x[0])
    df["salary_max"] = sal.apply(lambda x: x[1])

    # Skills + experience
    df["skills"]        = df.apply(infer_skills, axis=1).apply(
        lambda x: "{" + ",".join(f'"{s}"' for s in x) + "}"
    )
    df["experience_min"] = df["title"].apply(infer_exp)
    df["requirements"]   = df["experience_min"].apply(
        lambda n: f"Minimal {n} tahun pengalaman."
    )

    # Kolom output
    output_cols = [
        "title", "company", "location", "salary_text", "salary_min", "salary_max",
        "requirements", "skills", "cluster", "experience_min", "source_url", "date_posted"
    ]
    for col in output_cols:
        if col not in df.columns:
            df[col] = None
    new_clean = df[output_cols]

    # Load data lama
    old_clean = pd.read_csv(CLEANED_FILE)
    print(f"\nData lama (cleaned_jobs.csv): {len(old_clean)} baris")

    # Gabung, hapus duplikat dengan data lama
    combined = pd.concat([old_clean, new_clean], ignore_index=True)
    before = len(combined)
    combined = combined.drop_duplicates(subset=["title", "company"], keep="first")
    print(f"Gabungan: {before} → {len(combined)} (hapus {before - len(combined)} duplikat)")

    # Simpan
    combined.to_csv(CLEANED_FILE, index=False, encoding="utf-8")
    print(f"\n✓ {len(combined)} baris disimpan ke: {CLEANED_FILE}")
    print("\nDistribusi akhir per cluster:")
    print(combined["cluster"].value_counts().to_string())

if __name__ == "__main__":
    clean()
