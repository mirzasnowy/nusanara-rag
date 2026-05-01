"""
Final balancing: trim kelebihan dan check distribusi
"""
import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")

TARGET = 90

async def main():
    conn = await asyncpg.connect(DATABASE_URL)

    clusters = await conn.fetch(
        "SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster ORDER BY n DESC"
    )
    print("Distribusi saat ini:")
    for r in clusters:
        print(f"  {r['cluster']:<35} {r['n']}")

    # Trim cluster yang > TARGET
    for r in clusters:
        cluster = r["cluster"]
        n = r["n"]
        if n > TARGET:
            excess = n - TARGET
            # Hapus baris paling lama (id terkecil) yang melebihi target
            deleted = await conn.execute(
                """DELETE FROM knowledge_base
                   WHERE id IN (
                     SELECT id FROM knowledge_base
                     WHERE cluster=$1
                     ORDER BY id ASC
                     LIMIT $2
                   )""",
                cluster, excess
            )
            print(f"\n  Trim '{cluster}': {n} → {TARGET} (hapus {excess})")

    final = await conn.fetch(
        "SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster ORDER BY cluster"
    )
    print("\nDistribusi final:")
    total = 0
    for r in final:
        print(f"  {r['cluster']:<35} {r['n']}")
        total += r["n"]
    print(f"\nTotal: {total}")
    await conn.close()

asyncio.run(main())
