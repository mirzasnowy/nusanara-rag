# backend/scripts/clean_jobs.py — Cleaning & Strukturisasi Data Lowongan
# Input:  data/raw_jobs.csv
# Output: data/cleaned_jobs.csv
import sys
import pandas as pd

# Fix encoding di Windows
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
import re
import os

INPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw_jobs.csv")
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "cleaned_jobs.csv")

# Mapping skills berdasarkan klaster dan keyword di title/company
SKILL_KEYWORDS = {
    # Teknologi
    "python": ["Python"],
    "javascript": ["JavaScript"],
    "react": ["React", "JavaScript"],
    "node": ["Node.js", "JavaScript"],
    "java": ["Java"],
    "golang": ["Go", "Golang"],
    "backend": ["Backend Development", "API Development"],
    "frontend": ["Frontend Development", "HTML", "CSS"],
    "full stack": ["Full Stack", "Backend Development", "Frontend Development"],
    "mobile": ["Mobile Development"],
    "android": ["Android", "Kotlin", "Java"],
    "ios": ["iOS", "Swift"],
    "devops": ["DevOps", "Docker", "CI/CD"],
    "cloud": ["Cloud Computing", "AWS", "GCP"],
    # Data
    "data scientist": ["Python", "Machine Learning", "SQL", "Statistics"],
    "data analyst": ["SQL", "Excel", "Python", "Data Visualization"],
    "machine learning": ["Python", "Machine Learning", "TensorFlow", "PyTorch"],
    "data engineer": ["Python", "SQL", "Spark", "ETL"],
    # Desain
    "ui ux": ["Figma", "UI Design", "UX Research", "Prototyping"],
    "graphic design": ["Adobe Illustrator", "Photoshop", "Canva"],
    "creative": ["Creative Design", "Storytelling"],
    "content": ["Content Creation", "Copywriting"],
    # Pemasaran
    "digital marketing": ["Digital Marketing", "SEO", "SEM", "Google Ads"],
    "social media": ["Social Media Management", "Content Creation"],
    "seo": ["SEO", "Content Writing", "Google Analytics"],
    "marketing": ["Marketing Strategy", "Campaign Management"],
    # Bisnis
    "business analyst": ["Business Analysis", "SQL", "Excel", "Tableau"],
    "product manager": ["Product Management", "Agile", "Scrum"],
    "hr": ["Recruitment", "HR Management"],
    "finance": ["Financial Analysis", "Excel", "Accounting"],
    # Sales & Customer Service
    "sales": ["Sales", "Negotiation", "Communication"],
    "customer service": ["Customer Service", "Communication", "CRM"],
    "call center": ["Call Center", "Communication", "Problem Solving"],
    "account executive": ["Account Management", "Sales", "Negotiation"],
    "telemarketing": ["Telemarketing", "Communication", "Sales"],
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
    "admin": ["Administration", "Microsoft Office"],
}

# Default skills per klaster jika tidak ada keyword match
DEFAULT_SKILLS = {
    "Teknologi & Perangkat Lunak": ["Programming", "Problem Solving", "Teamwork"],
    "Analisis Data": ["SQL", "Excel", "Data Analysis"],
    "Desain & Kreatif": ["Creativity", "Design Tools", "Communication"],
    "Pemasaran Digital": ["Marketing", "Communication", "Social Media"],
    "Bisnis & Administrasi": ["Communication", "Microsoft Office", "Analysis"],
    "Sales & Customer Service": ["Communication", "Sales", "Customer Handling"],
    "Finance & Accounting": ["Accounting", "Excel", "Financial Reporting"],
    "Education & Training": ["Teaching", "Communication", "Subject Expertise"],
    # Backward-compat aliases
    "Teknologi": ["Programming", "Problem Solving", "Teamwork"],
}


def parse_salary(salary_text: str) -> tuple[int | None, int | None]:
    """
    Parse salary text Indonesia ke min/max integer (Rupiah).
    Contoh: 'Rp 4,5 jt - 4,8 jt' → (4_500_000, 4_800_000)

    Fix bug lama: replace(",","") menghapus koma desimal sehingga
    "4,5" → "45" → 45_000_000 (salah). Parser baru mengonversi
    koma ke titik SETELAH menghapus unit (jt/rb).
    """
    if not salary_text or pd.isna(salary_text):
        return None, None

    t = salary_text.lower().strip()
    # Hapus prefix "rp", spasi non-breaking, dan trim
    t = re.sub(r'rp\.?\s*', '', t)
    t = t.replace('\xa0', ' ').strip()

    def parse_single(s: str):
        s = s.strip()
        multiplier = 1

        if 'juta' in s or 'jt' in s:
            multiplier = 1_000_000
            s = re.sub(r'juta|jt', '', s).strip()
        elif 'ribu' in s or 'rb' in s:
            multiplier = 1_000
            s = re.sub(r'ribu|rb', '', s).strip()

        # Koma di konteks ini SELALU desimal (bukan pemisah ribuan)
        s = s.replace(',', '.').strip()

        try:
            val = float(s)
            return int(round(val * multiplier))
        except (ValueError, TypeError):
            return None

    # Pisahkan range min–max
    parts = re.split(r'\s*[–\-]\s*', t, maxsplit=1)

    if len(parts) == 2:
        lo = parse_single(parts[0])
        hi = parse_single(parts[1])
        if lo is not None and hi is not None and lo > hi:
            lo, hi = hi, lo
        return lo, hi
    else:
        val = parse_single(parts[0])
        return val, val



def infer_skills(row: pd.Series) -> list[str]:
    """Inferensi skills dari title, company, dan cluster."""
    text = f"{row.get('title', '')} {row.get('query_keyword', '')}".lower()
    skills = set()

    for keyword, skill_list in SKILL_KEYWORDS.items():
        if keyword in text:
            skills.update(skill_list)

    # Tambahkan default skills jika kosong
    if not skills:
        cluster = row.get("cluster", "")
        skills.update(DEFAULT_SKILLS.get(cluster, []))

    return sorted(list(skills))


def infer_experience_min(title: str) -> int:
    """Inferensi minimum pengalaman dari title."""
    title_lower = title.lower()
    if any(w in title_lower for w in ["senior", "lead", "manager", "head", "director"]):
        return 3
    elif any(w in title_lower for w in ["junior", "intern", "magang", "fresh"]):
        return 0
    return 1  # default: 1 tahun


def clean():
    print(f"Membaca: {INPUT_FILE}")
    df = pd.read_csv(INPUT_FILE)
    print(f"Baris awal: {len(df)}")

    # 1. Hapus baris tanpa title atau company
    df = df.dropna(subset=["title", "company"])
    df = df[df["title"].str.strip() != ""]
    df = df[df["company"].str.strip() != ""]

    # 2. Hapus duplikat
    df = df.drop_duplicates(subset=["title", "company"], keep="first")
    print(f"Setelah hapus duplikat: {len(df)}")

    # 3. Normalisasi teks
    df["title"] = df["title"].str.strip()
    df["company"] = df["company"].str.strip()
    df["location"] = df["location"].fillna("Indonesia").str.strip()

    # 4. Parse salary
    salary_parsed = df.apply(lambda r: parse_salary(r.get("salary_text")), axis=1)
    df["salary_min"] = salary_parsed.apply(lambda x: x[0])
    df["salary_max"] = salary_parsed.apply(lambda x: x[1])

    # 5. Inferensi skills
    df["skills"] = df.apply(infer_skills, axis=1).apply(lambda x: "{" + ",".join(f'"{s}"' for s in x) + "}")

    # 6. Inferensi experience_min
    df["experience_min"] = df["title"].apply(infer_experience_min)

    # 7. Kolom requirements (dari experience + basic info)
    df["requirements"] = df.apply(
        lambda r: f"Minimal {r['experience_min']} tahun pengalaman.",
        axis=1
    )

    # 8. Pilih dan urutkan kolom output
    output_cols = [
        "title", "company", "location", "salary_text", "salary_min", "salary_max",
        "requirements", "skills", "cluster", "experience_min",
        "source_url", "date_posted"
    ]

    # Tambahkan kolom yang mungkin belum ada
    for col in output_cols:
        if col not in df.columns:
            df[col] = None

    df = df[output_cols]

    # 9. Simpan
    df.to_csv(OUTPUT_FILE, index=False, encoding="utf-8")
    print(f"\n[OK] {len(df)} baris bersih disimpan ke: {OUTPUT_FILE}")
    print("\nDistribusi per klaster:")
    print(df["cluster"].value_counts().to_string())


if __name__ == "__main__":
    clean()
