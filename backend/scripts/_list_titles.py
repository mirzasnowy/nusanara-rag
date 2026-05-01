import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv; load_dotenv()
DB = os.getenv('DATABASE_URL')

async def main():
    conn = await asyncpg.connect(DB)
    for cluster in ['Analisis Data', 'Education & Training']:
        rows = await conn.fetch(
            "SELECT DISTINCT title FROM knowledge_base WHERE cluster=$1 ORDER BY title",
            cluster
        )
        print(f"\n=== {cluster} ({len(rows)} unik) ===")
        for r in rows:
            title = r['title']
            print(f"  {title}")
    await conn.close()

asyncio.run(main())
