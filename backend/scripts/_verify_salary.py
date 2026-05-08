import asyncio, asyncpg, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import settings

async def run():
    conn = await asyncpg.connect(settings.DATABASE_URL)

    # Cek 10 baris dengan koma desimal di salary_text
    rows = await conn.fetch(
        "SELECT salary_text, salary_min, salary_max FROM knowledge_base "
        "WHERE salary_text LIKE '%,%' LIMIT 10"
    )
    print("=== VERIFIKASI DB SETELAH FIX ===")
    print(f"{'salary_text':<30} {'salary_min':>12} {'salary_max':>12}")
    print("-" * 56)
    for r in rows:
        print(f"{str(r['salary_text']):<30} {str(r['salary_min']):>12} {str(r['salary_max']):>12}")

    # Cek apakah masih ada nilai fatal (> 100jt)
    bad = await conn.fetchval(
        "SELECT COUNT(*) FROM knowledge_base WHERE salary_min > 100000000"
    )
    print(f"\nBaris dengan salary_min > 100jt (harusnya 0): {bad}")

    total_fixed = await conn.fetchval(
        "SELECT COUNT(*) FROM knowledge_base WHERE salary_min IS NOT NULL"
    )
    print(f"Total baris dengan salary_min terisi: {total_fixed}")

    await conn.close()

asyncio.run(run())
