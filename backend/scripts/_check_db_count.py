import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv; load_dotenv()
DB = os.getenv('DATABASE_URL')

async def main():
    conn = await asyncpg.connect(DB)
    
    # Total di DB
    total = await conn.fetchval("SELECT COUNT(*) FROM knowledge_base")
    print(f"Total rows di DB: {total}")
    
    # Per cluster
    rows = await conn.fetch("""
        SELECT cluster, COUNT(*) AS n 
        FROM knowledge_base 
        GROUP BY cluster 
        ORDER BY cluster
    """)
    print(f"\n{'Cluster':<35} {'Count':>5}")
    print('-' * 42)
    for r in rows:
        flag = " ✓" if r['n'] == 90 else f" ← KURANG {90 - r['n']}" if r['n'] < 90 else f" ← LEBIH {r['n'] - 90}"
        print(f"{r['cluster']:<35} {r['n']:>5}{flag}")
    
    await conn.close()

asyncio.run(main())
