"""Test apakah pgvector ORDER BY bekerja dengan connection berbeda"""
import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__) + "/..")
from dotenv import load_dotenv; load_dotenv()
from rag.embed import get_embedding
from config import settings

DB = settings.DATABASE_URL

async def main():
    conn = await asyncpg.connect(DB)
    
    vec = await get_embedding("search_query: customer service cs pelanggan")
    vec_str = str(vec)
    
    print(f"vec_str[:60]: {vec_str[:60]}")
    
    # Test A: WHERE saja, no ORDER BY
    r = await conn.fetchval("SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NOT NULL")
    print(f"Total rows: {r}")
    
    # Test B: cast to vector, ORDER BY
    print("\nTest B: ORDER BY cosine distance")
    try:
        rows = await conn.fetch("""
            SELECT title, cluster
            FROM knowledge_base
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT 5
        """, vec_str)
        print(f"  Count: {len(rows)}")
        for r in rows:
            print(f"  {r['cluster']}: {r['title']}")
    except Exception as e:
        print(f"  ERROR: {e}")

    # Test C: calculate cosine sim manually (subquery)
    print("\nTest C: Subquery with 1 - cosine")
    try:
        rows = await conn.fetch("""
            SELECT title, cluster, 1 - (embedding <=> $1::vector) AS sim
            FROM knowledge_base
            WHERE embedding IS NOT NULL
            ORDER BY sim DESC
            LIMIT 5
        """, vec_str)
        print(f"  Count: {len(rows)}")
        for r in rows:
            sim = r['sim']
            print(f"  sim={sim:.4f} [{r['cluster']}] {r['title']}")
    except Exception as e:
        print(f"  ERROR: {e}")

    await conn.close()

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

asyncio.run(main())
