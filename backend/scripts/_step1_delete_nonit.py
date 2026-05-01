import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")

async def main():
    conn = await asyncpg.connect(DATABASE_URL)
    deleted = await conn.execute("DELETE FROM knowledge_base WHERE cluster = 'Non-IT (Kontrol)'")
    print("Deleted:", deleted)
    rows = await conn.fetch("SELECT cluster, COUNT(*) as n FROM knowledge_base GROUP BY cluster ORDER BY n DESC")
    print("\nDistribusi setelah hapus:")
    for r in rows:
        print(f"  {r['cluster']:<35} {r['n']}")
    total = await conn.fetchval("SELECT COUNT(*) FROM knowledge_base")
    print(f"\nTotal: {total}")
    await conn.close()

asyncio.run(main())
