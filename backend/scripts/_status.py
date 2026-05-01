import asyncio, asyncpg, os, sys
sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv; load_dotenv()
DB = os.getenv('DATABASE_URL', 'postgresql://mirza:devpassword@localhost:5432/nusanara_dev')

async def f():
    conn = await asyncpg.connect(DB)
    rows = await conn.fetch('SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster ORDER BY cluster')
    total = 0
    print("Distribusi DB saat ini:")
    for r in rows:
        n = r['n']
        gap = 90 - n
        status = 'OK' if gap <= 0 else f'kurang {gap}'
        print(f'  {r["cluster"]:<35} {n:>4}  {status}')
        total += n
    print(f'\nTotal: {total}')
    await conn.close()

asyncio.run(f())
