"""Cek distribusi keyword/sub-role per cluster dari DB"""
import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    clusters = await conn.fetch(
        "SELECT DISTINCT cluster FROM knowledge_base ORDER BY cluster"
    )
    for r in clusters:
        cluster = r["cluster"]
        rows = await conn.fetch(
            "SELECT title, COUNT(*) n FROM knowledge_base WHERE cluster=$1 GROUP BY title ORDER BY n DESC",
            cluster
        )
        print(f"\n{'='*55}")
        print(f"  {cluster} — {sum(r2['n'] for r2 in rows)} total")
        print(f"{'='*55}")
        for row in rows:
            bar = "#" * row["n"]
            print(f"  {row['n']:>3}x  {row['title'][:48]}")
    await conn.close()

asyncio.run(main())
