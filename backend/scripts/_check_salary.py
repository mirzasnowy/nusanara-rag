import asyncio, asyncpg, sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import settings

async def run():
    conn = await asyncpg.connect(settings.DATABASE_URL)

    total = await conn.fetchval("SELECT COUNT(*) FROM knowledge_base")
    print(f"Total rows: {total}")

    # Skema semua kolom
    cols = await conn.fetch(
        "SELECT column_name, data_type FROM information_schema.columns "
        "WHERE table_name='knowledge_base' ORDER BY ordinal_position"
    )
    print("\nSkema tabel knowledge_base:")
    for c in cols:
        print(f"  {c['column_name']:<30} {c['data_type']}")

    # Count NOT NULL untuk setiap kolom yang mengandung "salary"
    salary_cols = [c['column_name'] for c in cols if 'salary' in c['column_name'].lower()]
    print(f"\nKolom salary ditemukan: {salary_cols}")
    for col in salary_cols:
        n = await conn.fetchval(f'SELECT COUNT(*) FROM knowledge_base WHERE "{col}" IS NOT NULL')
        null = total - n
        print(f"  {col}: NOT NULL={n}, NULL={null}, pct={n/total*100:.1f}%")

    await conn.close()

asyncio.run(run())
