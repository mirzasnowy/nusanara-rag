"""Rename cluster 'Teknologi' -> 'Teknologi & Perangkat Lunak' di DB"""
import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    result = await conn.execute(
        "UPDATE knowledge_base SET cluster='Teknologi & Perangkat Lunak' WHERE cluster='Teknologi'"
    )
    print(f"Updated: {result}")
    rows = await conn.fetch("SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster ORDER BY n DESC")
    print("\nDistribusi cluster setelah rename:")
    for r in rows:
        print(f"  {r['cluster']:<35} {r['n']}")
    await conn.close()

asyncio.run(main())
