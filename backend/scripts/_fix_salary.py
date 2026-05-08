"""
backend/scripts/_fix_salary.py
Memperbaiki parsing salary yang salah: "4,5 jt" → 4500000 (bukan 45000000).

Bug asal: replace(",", "") menghapus koma desimal sebelum parsing,
sehingga "4,5" → "45" → 45 × 1_000_000 = 45_000_000.

Langkah:
  1. Verifikasi parser baru pada sample CSV (DRY RUN)
  2. Terapkan ke database jika hasil verifikasi benar
"""
import sys, os, re
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import asyncio
import asyncpg
from config import settings


def parse_salary_id(text: str):
    """
    Parser salary Indonesia yang benar.
    Contoh:
      'Rp 4,5 jt - 4,8 jt'   → (4_500_000,  4_800_000)
      'Rp 5 jt - 7 jt'        → (5_000_000,  7_000_000)
      'Rp 500 rb - 1 jt'      → (  500_000,  1_000_000)
      '2,5 jt'                 → (2_500_000,  2_500_000)
    """
    if not text:
        return None, None

    t = text.lower().strip()
    # Hapus prefix "rp", spasi non-breaking (0xa0), dan trim
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

        # Koma di konteks ini SELALU desimal (bukan ribuan)
        # karena format Indonesia: "4,5 jt" bukan "4.500"
        s = s.replace(',', '.').strip()

        try:
            val = float(s)
            return int(round(val * multiplier))
        except (ValueError, TypeError):
            return None

    # Pisahkan range min–max (separator: " - " atau " – ")
    parts = re.split(r'\s*[–\-]\s*', t, maxsplit=1)

    if len(parts) == 2:
        lo = parse_single(parts[0])
        hi = parse_single(parts[1])
        # Pastikan lo <= hi
        if lo is not None and hi is not None and lo > hi:
            lo, hi = hi, lo
        return lo, hi
    else:
        val = parse_single(parts[0])
        return val, val


# ──────────────────────────────────────────────
# DRY RUN: verifikasi parser pada data CSV
# ──────────────────────────────────────────────
def dry_run_csv():
    import pandas as pd
    csv_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'cleaned_jobs.csv')
    df = pd.read_csv(csv_path)
    has_salary = df[df['salary_text'].notna()].copy()

    results = has_salary['salary_text'].apply(lambda x: parse_salary_id(x))
    has_salary['new_min'] = results.apply(lambda x: x[0])
    has_salary['new_max'] = results.apply(lambda x: x[1])

    # Tampilkan contoh yang punya koma (kasus bug lama)
    comma_cases = has_salary[has_salary['salary_text'].str.contains(',', na=False)]
    print("=== VERIFIKASI: 20 kasus dengan koma desimal ===")
    print(f"{'salary_text':<30} {'old_min':>12} {'new_min':>12} {'old_max':>12} {'new_max':>12}")
    print("-" * 80)
    for _, row in comma_cases.head(20).iterrows():
        old_min = int(row['salary_min']) if pd.notna(row['salary_min']) else None
        old_max = int(row['salary_max']) if pd.notna(row['salary_max']) else None
        print(f"{str(row['salary_text']):<30} {str(old_min):>12} {str(row['new_min']):>12} {str(old_max):>12} {str(row['new_max']):>12}")

    # Cek kasus yang gagal parse
    failed = has_salary[has_salary['new_min'].isna()]
    print(f"\nGagal parse: {len(failed)} baris")
    for _, row in failed.head(10).iterrows():
        print(f"  '{row['salary_text']}'")

    # Sanity check: tidak ada nilai > 100 jt yang mencurigakan
    suspicious = has_salary[has_salary['new_min'] > 100_000_000]
    print(f"\nWaspada (new_min > 100jt): {len(suspicious)} baris")
    for _, row in suspicious.head(5).iterrows():
        print(f"  '{row['salary_text']}' → min={row['new_min']}")

    return has_salary


# ──────────────────────────────────────────────
# UPDATE DATABASE
# ──────────────────────────────────────────────
async def update_db():
    import pandas as pd
    csv_path = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'cleaned_jobs.csv')
    df = pd.read_csv(csv_path)

    conn = await asyncpg.connect(settings.DATABASE_URL)

    rows = await conn.fetch(
        "SELECT id, salary_text FROM knowledge_base WHERE salary_text IS NOT NULL"
    )

    fixed = 0
    errors = []

    for row in rows:
        rid, salary_text = row['id'], row['salary_text']
        salary_min, salary_max = parse_salary_id(salary_text)

        if salary_min is not None:
            await conn.execute(
                "UPDATE knowledge_base SET salary_min=$1, salary_max=$2 WHERE id=$3",
                salary_min, salary_max, rid
            )
            fixed += 1
        else:
            errors.append((rid, salary_text))

    await conn.close()
    print(f"\n✓ Fixed: {fixed} rows")
    print(f"✗ Could not parse ({len(errors)} rows):")
    for r in errors[:20]:
        print(f"  id={r[0]}: '{r[1]}'")


if __name__ == "__main__":
    import sys

    print("=== LANGKAH 1: DRY RUN VERIFIKASI ===\n")
    df_result = dry_run_csv()

    if "--apply" in sys.argv:
        print("\n=== LANGKAH 2: UPDATE DATABASE ===\n")
        asyncio.run(update_db())
        print("\nSelesai. Verifikasi ulang dengan:")
        print("  SELECT salary_text, salary_min, salary_max FROM knowledge_base")
        print("  WHERE salary_text LIKE '%,%' LIMIT 10;")
    else:
        print("\n>>> DRY RUN selesai. Jalankan dengan --apply untuk update DB.")
        print("    python scripts/_fix_salary.py --apply")
