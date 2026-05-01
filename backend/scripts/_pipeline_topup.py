"""
Pipeline otomatis setelah top-up scraping selesai:
  1. Clean raw_jobs_top_up.csv → gabung ke cleaned_jobs.csv
  2. Import ke DB (append, skip duplicate)
  3. Embed baris baru (WHERE embedding IS NULL)

Jalankan setelah _topup_scraper.py selesai:
    python scripts/_pipeline_topup.py
"""
import sys, os, re, asyncio, asyncpg, csv
import pandas as pd

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
load_dotenv()

BASE_DIR     = os.path.join(os.path.dirname(__file__), "..", "..")
RAW_TOPUP    = os.path.join(BASE_DIR, "data", "raw_jobs_top_up.csv")
CLEANED_FILE = os.path.join(BASE_DIR, "data", "cleaned_jobs.csv")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")

SKILL_KEYWORDS = {
    "python": ["Python"], "javascript": ["JavaScript"], "react": ["React", "JavaScript"],
    "node": ["Node.js", "JavaScript"], "java": ["Java"], "golang": ["Go", "Golang"],
    "backend": ["Backend Development", "API Development"],
    "frontend": ["Frontend Development", "HTML", "CSS"],
    "full stack": ["Full Stack", "Backend Development", "Frontend Development"],
    "data analyst": ["SQL", "Excel", "Python", "Data Visualization"],
    "product analyst": ["SQL", "Product Analytics", "Data Visualization", "Python"],
    "business intelligence": ["Power BI", "Tableau", "SQL", "Data Visualization"],
    "business analyst": ["Business Analysis", "SQL", "Excel"],
    "ui ux": ["Figma", "UI Design", "UX Research"],
    "graphic": ["Photoshop", "Illustrator", "Canva"],
    "digital marketing": ["Digital Marketing", "SEO", "Google Ads"],
    "social media": ["Social Media Management", "Content Creation"],
    "seo": ["SEO", "Google Analytics"],
    "project manager": ["Project Management", "Agile", "Scrum"],
    "business development": ["Business Development", "Negotiation"],
    "operations": ["Operations Management", "Process Improvement"],
    "general affairs": ["General Affairs", "Facility Management"],
    "sales": ["Sales", "Negotiation", "Communication"],
    "customer service": ["Customer Service", "Communication", "CRM"],
    "call center": ["Call Center", "Communication", "Problem Solving"],
    "account executive": ["Account Management", "Sales", "Negotiation"],
    "telemarketing": ["Telemarketing", "Communication", "Sales"],
    "customer success": ["Customer Success", "CRM", "Communication"],
    "accounting": ["Accounting", "Financial Reporting", "Excel"],
    "finance": ["Financial Analysis", "Excel", "Financial Modeling"],
    "auditor": ["Auditing", "Financial Reporting", "Compliance"],
    "tax": ["Tax Compliance", "Excel", "Accounting"],
    "teacher": ["Teaching", "Communication", "Curriculum Development"],
    "tutor": ["Tutoring", "Communication", "Subject Expertise"],
    "trainer": ["Training & Development", "Facilitation", "Communication"],
    "instruktur": ["Instruction", "Communication", "Subject Expertise"],
    "learning": ["Learning & Development", "Facilitation", "Training Design"],
    "content": ["Content Creation", "Copywriting"],
    "admin": ["Administration", "Microsoft Office"],
    "finance analyst": ["Financial Analysis", "Excel", "Financial Modeling"],
}

DEFAULT_SKILLS = {
    "Analisis Data":              ["SQL", "Excel", "Data Analysis"],
    "Teknologi & Perangkat Lunak":["Programming", "Problem Solving", "Teamwork"],
    "Teknologi":                  ["Programming", "Problem Solving", "Teamwork"],
    "Desain & Kreatif":           ["Creativity", "Design Tools", "Communication"],
    "Pemasaran Digital":          ["Marketing", "Communication", "Social Media"],
    "Bisnis & Administrasi":      ["Communication", "Microsoft Office", "Analysis"],
    "Sales & Customer Service":   ["Communication", "Sales", "Customer Handling"],
    "Finance & Accounting":       ["Accounting", "Excel", "Financial Reporting"],
    "Education & Training":       ["Teaching", "Communication", "Subject Expertise"],
}

def parse_salary(s):
    if not s or pd.isna(s): return None, None
    s = str(s).lower().replace(",","").replace(".","")
    nums = re.findall(r'\d+', s)
    if not nums: return None, None
    m = 1_000_000 if any(k in s for k in ["jt","juta"]) else 1_000
    ints = [int(n)*m for n in nums[:2]]
    return (min(ints), max(ints)) if len(ints)>=2 else (ints[0], ints[0])

def infer_skills(row):
    text = f"{row.get('title','')}{row.get('keyword','')}".lower()
    skills = set()
    for kw, sl in SKILL_KEYWORDS.items():
        if kw in text: skills.update(sl)
    if not skills:
        skills.update(DEFAULT_SKILLS.get(row.get("cluster",""), ["Communication"]))
    return sorted(skills)

def infer_exp(title):
    tl = title.lower()
    if any(w in tl for w in ["senior","lead","manager","head","director"]): return 3
    if any(w in tl for w in ["junior","intern","magang","fresh"]): return 0
    return 1

def to_int(val):
    try: return int(float(val)) if val and str(val).strip() not in ("","nan") else None
    except: return None

def parse_skills_arr(s):
    if not s or s=="{}": return []
    s = s.strip("{}")
    return [x.strip().strip('"') for x in s.split(",") if x.strip().strip('"')]


# ── STEP 1: Clean & Merge ───────────────────────────────────
def step1_clean_merge():
    print("\n" + "="*55)
    print("  STEP 1: Clean & Merge")
    print("="*55)

    if not os.path.exists(RAW_TOPUP):
        print(f"  ⚠ File tidak ditemukan: {RAW_TOPUP}")
        print("  Pastikan _topup_scraper.py sudah selesai.")
        return False

    df = pd.read_csv(RAW_TOPUP)
    print(f"  Raw top-up: {len(df)} baris")

    df = df.dropna(subset=["title","company"])
    df = df[df["title"].str.strip() != ""]
    df = df[df["company"].str.strip() != ""]
    df = df.drop_duplicates(subset=["title","company"], keep="first")
    df["title"]   = df["title"].str.strip()
    df["company"] = df["company"].str.strip()
    df["location"]= df["location"].fillna("Indonesia").str.strip()

    sal = df.apply(lambda r: parse_salary(r.get("salary_text")), axis=1)
    df["salary_min"] = sal.apply(lambda x: x[0])
    df["salary_max"] = sal.apply(lambda x: x[1])
    df["skills"]      = df.apply(infer_skills, axis=1).apply(
        lambda x: "{" + ",".join(f'"{s}"' for s in x) + "}"
    )
    df["experience_min"] = df["title"].apply(infer_exp)
    df["requirements"]   = df["experience_min"].apply(lambda n: f"Minimal {n} tahun pengalaman.")

    output_cols = ["title","company","location","salary_text","salary_min","salary_max",
                   "requirements","skills","cluster","experience_min","source_url","date_posted"]
    for col in output_cols:
        if col not in df.columns: df[col] = None
    new_clean = df[output_cols]

    old_clean = pd.read_csv(CLEANED_FILE)
    combined  = pd.concat([old_clean, new_clean], ignore_index=True)
    before    = len(combined)
    combined  = combined.drop_duplicates(subset=["title","company"], keep="first")
    print(f"  Gabungan: {before} → {len(combined)} baris")

    combined.to_csv(CLEANED_FILE, index=False, encoding="utf-8")
    print(f"  ✓ cleaned_jobs.csv diupdate ({len(combined)} baris)")
    print("\n  Distribusi akhir:")
    print(combined["cluster"].value_counts().to_string())
    return True


# ── STEP 2: Import ke DB ────────────────────────────────────
async def step2_import():
    print("\n" + "="*55)
    print("  STEP 2: Import ke DB")
    print("="*55)

    conn = await asyncpg.connect(DATABASE_URL)
    existing = await conn.fetchval("SELECT COUNT(*) FROM knowledge_base")
    print(f"  DB sekarang: {existing} baris")

    with open(CLEANED_FILE, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    inserted = skipped = errors = 0
    for i, row in enumerate(rows, 1):
        title   = (row.get("title") or "").strip()
        company = (row.get("company") or "").strip()
        if not title: skipped += 1; continue

        exists = await conn.fetchval(
            "SELECT id FROM knowledge_base WHERE title=$1 AND company=$2 LIMIT 1",
            title, company
        )
        if exists: skipped += 1; continue

        try:
            await conn.execute(
                """INSERT INTO knowledge_base
                   (title, company, location, salary_text, salary_min, salary_max,
                    requirements, skills, cluster, experience_min, source_url)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)""",
                title, company,
                row.get("location") or "Indonesia",
                row.get("salary_text") or None,
                to_int(row.get("salary_min")), to_int(row.get("salary_max")),
                row.get("requirements") or None,
                parse_skills_arr(row.get("skills","{}")),
                row.get("cluster") or None,
                to_int(row.get("experience_min")) or 0,
                row.get("source_url") or None,
            )
            inserted += 1
        except Exception as e:
            print(f"  [ERR] {title}: {e}")
            errors += 1

    print(f"  Inserted: {inserted} | Skipped: {skipped} | Errors: {errors}")

    rows2 = await conn.fetch(
        "SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster ORDER BY n DESC"
    )
    print("\n  Distribusi DB setelah import:")
    for r in rows2:
        print(f"    {r['cluster']:<35} {r['n']}")
    total = await conn.fetchval("SELECT COUNT(*) FROM knowledge_base")
    print(f"\n  Total: {total}")
    await conn.close()


# ── STEP 3: Embed baru ──────────────────────────────────────
async def step3_embed():
    print("\n" + "="*55)
    print("  STEP 3: Embed baris baru")
    print("="*55)

    import httpx
    OLLAMA_URL   = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    EMBED_MODEL  = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text-v2-moe")

    conn = await asyncpg.connect(DATABASE_URL)
    rows = await conn.fetch(
        """SELECT id, title, company, cluster, requirements, skills
           FROM knowledge_base WHERE embedding IS NULL ORDER BY id"""
    )
    total = len(rows)
    print(f"  Perlu di-embed: {total} dokumen")

    ok = fail = 0
    async with httpx.AsyncClient(timeout=60) as client:
        for i, row in enumerate(rows, 1):
            skills_text = ", ".join(row["skills"] or [])
            content = (
                f"Posisi: {row['title']}. "
                f"Klaster: {row['cluster'] or ''}. "
                f"Keahlian: {skills_text}. "
                f"Syarat: {row['requirements'] or ''}."
            )
            try:
                resp = await client.post(
                    f"{OLLAMA_URL}/api/embeddings",
                    json={"model": EMBED_MODEL, "prompt": content}
                )
                vec = resp.json()["embedding"]
                # Update content juga (untuk debug)
                await conn.execute(
                    "UPDATE knowledge_base SET content=$1 WHERE id=$2",
                    content, row["id"]
                )
                # Simpan embedding dengan cast ::vector (sama seperti embed_knowledge.py)
                await conn.execute(
                    "UPDATE knowledge_base SET embedding=$1::vector WHERE id=$2",
                    str(vec), row["id"]
                )
                ok += 1
                if i % 25 == 0 or i == 1:
                    print(f"  [{i}/{total}] OK: {row['title'][:45]}")
            except Exception as e:
                print(f"  [{i}/{total}] ERR: {e}")
                fail += 1

    await conn.close()
    print(f"\n  ✓ Embed selesai: {ok} OK, {fail} gagal")


async def main():
    ok = step1_clean_merge()
    if not ok:
        return
    await step2_import()
    await step3_embed()

    print("\n" + "="*55)
    print("  SELESAI. Jalankan evaluasi:")
    print("  python -X utf8 scripts/evaluate_retrieval.py")
    print("="*55)

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

asyncio.run(main())
