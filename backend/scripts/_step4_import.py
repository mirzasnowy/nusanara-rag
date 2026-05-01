"""
Step 4: Import cleaned_jobs.csv ke DB — hanya baris yang belum ada.
Skip jika title + company sudah ada di knowledge_base.
"""
import sys, os, asyncio, asyncpg, csv
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")
INPUT_FILE   = os.path.join(os.path.dirname(__file__), "..", "..", "data", "cleaned_jobs.csv")

def to_int(val):
    try:
        return int(float(val)) if val and str(val).strip() not in ("", "nan") else None
    except: return None

def parse_skills(s):
    if not s or s == "{}": return []
    s = s.strip("{}")
    return [x.strip().strip('"') for x in s.split(",") if x.strip().strip('"')]

async def run():
    conn = await asyncpg.connect(DATABASE_URL)

    existing = await conn.fetchval("SELECT COUNT(*) FROM knowledge_base")
    print(f"DB sekarang: {existing} baris")

    with open(INPUT_FILE, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"CSV: {len(rows)} baris → import hanya yang belum ada...\n")

    inserted = skipped = errors = 0

    for i, row in enumerate(rows, 1):
        title   = (row.get("title") or "").strip()
        company = (row.get("company") or "").strip()
        if not title:
            skipped += 1; continue

        exists = await conn.fetchval(
            "SELECT id FROM knowledge_base WHERE title=$1 AND company=$2 LIMIT 1",
            title, company
        )
        if exists:
            skipped += 1; continue

        try:
            await conn.execute(
                """
                INSERT INTO knowledge_base
                  (title, company, location, salary_text, salary_min, salary_max,
                   requirements, skills, cluster, experience_min, source_url)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
                """,
                title, company,
                row.get("location") or "Indonesia",
                row.get("salary_text") or None,
                to_int(row.get("salary_min")),
                to_int(row.get("salary_max")),
                row.get("requirements") or None,
                parse_skills(row.get("skills", "{}")),
                row.get("cluster") or None,
                to_int(row.get("experience_min")) or 0,
                row.get("source_url") or None,
            )
            inserted += 1
            if inserted % 50 == 0:
                print(f"  ...{inserted} inserted sejauh ini")
        except Exception as e:
            print(f"  [ERR] {title}: {e}")
            errors += 1

    await conn.close()

    print(f"\n✓ Import selesai:")
    print(f"  Inserted : {inserted}")
    print(f"  Skipped  : {skipped} (sudah ada)")
    print(f"  Errors   : {errors}")

    # Verifikasi distribusi
    conn2 = await asyncpg.connect(DATABASE_URL)
    rows2 = await conn2.fetch(
        "SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster ORDER BY n DESC"
    )
    print("\nDistribusi DB setelah import:")
    for r in rows2:
        print(f"  {r['cluster']:<35} {r['n']}")
    total = await conn2.fetchval("SELECT COUNT(*) FROM knowledge_base")
    print(f"\nTotal: {total}")
    await conn2.close()

asyncio.run(run())
