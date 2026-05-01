import asyncio, asyncpg, os, sys
sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv; load_dotenv()
DB = os.getenv('DATABASE_URL')

async def main():
    conn = await asyncpg.connect(DB)
    
    for cluster in ["Sales & Customer Service", "Education & Training"]:
        print(f"\n{'='*55}")
        print(f"  {cluster} — sample content")
        print('='*55)
        rows = await conn.fetch(
            "SELECT title, content FROM knowledge_base WHERE cluster=$1 LIMIT 4",
            cluster
        )
        for r in rows:
            title   = r['title']
            content = r['content']
            print(f"  title: {title}")
            print(f"  content: {content}")
            print()

    await conn.close()

asyncio.run(main())
