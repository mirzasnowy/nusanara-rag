"""
backend/scripts/import_to_db.py — Import CSV ke PostgreSQL (Tanpa Embedding)
"""
import sys
import asyncio
import asyncpg
import csv
import os
from dotenv import load_dotenv

# Fix encoding Windows
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")
INPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "cleaned_jobs.csv")


def parse_skills_array(skills_str: str) -> list[str]:
    """Parse format PostgreSQL array string '{\"Python\",\"SQL\"}' ke list Python."""
    if not skills_str or skills_str == "{}":
        return []

    # Format dari CSV: {"Python","SQL","ML"}
    skills_str = skills_str.strip("{}")
    if not skills_str:
        return []

    # Split by comma, bersihkan quotes
    skills = []
    for s in skills_str.split(","):
        s = s.strip().strip('"')
        if s:
            skills.append(s)
    return skills


async def import_data():
    print(f"Membaca: {INPUT_FILE}")

    conn = await asyncpg.connect(DATABASE_URL)

    # Cek berapa yang sudah ada
    existing = await conn.fetchval("SELECT COUNT(*) FROM knowledge_base")
    print(f"Saat ini ada {existing} baris di knowledge_base")

    inserted = 0
    skipped = 0
    errors = 0

    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    print(f"Akan import {len(rows)} baris dari CSV...")

    for i, row in enumerate(rows, 1):
        try:
            title = row.get("title", "").strip()
            company = row.get("company", "").strip()

            if not title:
                skipped += 1
                continue

            # Cek apakah sudah ada (berdasarkan title + company)
            exists = await conn.fetchval(
                "SELECT id FROM knowledge_base WHERE title = $1 AND company = $2 LIMIT 1",
                title, company
            )
            if exists:
                skipped += 1
                continue

            # Parse tipe data — salary CSV disimpan sebagai float (e.g. '3000000.0')
            def to_int(val):
                try:
                    return int(float(val)) if val and str(val).strip() not in ("", "nan") else None
                except (ValueError, TypeError):
                    return None

            skills = parse_skills_array(row.get("skills", "{}"))
            salary_min = to_int(row.get("salary_min"))
            salary_max = to_int(row.get("salary_max"))
            experience_min = to_int(row.get("experience_min")) or 0

            await conn.execute(
                """
                INSERT INTO knowledge_base
                (title, company, location, salary_text, salary_min, salary_max,
                 requirements, skills, cluster, experience_min, source_url)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                """,
                title,
                company,
                row.get("location", "Indonesia"),
                row.get("salary_text") or None,
                salary_min,
                salary_max,
                row.get("requirements") or None,
                skills,
                row.get("cluster") or None,
                experience_min,
                row.get("source_url") or None,
            )

            inserted += 1

            if i % 50 == 0:
                print(f"  Progress: {i}/{len(rows)} ({inserted} inserted, {skipped} skipped)")

        except Exception as e:
            print(f"  [ERR] baris {i} ({row.get('title', 'N/A')}): {e}")
            errors += 1

    await conn.close()

    print(f"\n[OK] Import selesai:")
    print(f"  - Inserted : {inserted}")
    print(f"  - Skipped  : {skipped} (sudah ada atau data kosong)")
    print(f"  - Errors   : {errors}")

    print("\nVerifikasi: jalankan 'docker exec -it pg-nusanara psql -U mirza -d nusanara_dev -c \"SELECT cluster, COUNT(*) FROM knowledge_base GROUP BY cluster;\"'")


if __name__ == "__main__":
    asyncio.run(import_data())
