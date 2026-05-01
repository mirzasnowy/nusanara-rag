import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")

async def main():
    conn = await asyncpg.connect(DATABASE_URL)

    clusters = await conn.fetch(
        "SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster ORDER BY cluster"
    )
    print(f"{'='*60}")
    print(f"  DISTRIBUSI DB — Total: {sum(r['n'] for r in clusters)}")
    print(f"{'='*60}")
    for r in clusters:
        print(f"  {r['cluster']:<35} {r['n']} docs")

    # Untuk setiap cluster, tampilkan semua judul yang unik
    for r in clusters:
        cluster = r['cluster']
        rows = await conn.fetch(
            "SELECT DISTINCT title FROM knowledge_base WHERE cluster=$1 ORDER BY title",
            cluster
        )
        print(f"\n{'─'*60}")
        print(f"  CLUSTER: {cluster} ({len(rows)} unique titles)")
        print(f"{'─'*60}")
        for row in rows:
            print(f"    {row['title']}")

    await conn.close()

asyncio.run(main())
