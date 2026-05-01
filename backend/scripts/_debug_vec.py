"""Cek dimensi query embedding dan similarity langsung ke DB (bypass hybrid_search)"""
import asyncio, asyncpg, os, sys, httpx
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__) + "/..")
from dotenv import load_dotenv; load_dotenv()
from rag.embed import get_embedding

DB = os.getenv('DATABASE_URL')

async def main():
    conn = await asyncpg.connect(DB)
    
    # Test query embedding
    test_queries = [
        "search_query: sales executive account manager business development negosiasi",
        "search_query: customer service cs call center helpdesk pelanggan",
        "search_query: guru teacher pengajar pendidikan mengajar kurikulum",
    ]
    
    for q in test_queries:
        vec = await get_embedding(q)
        print(f"Query: {q[:60]}")
        print(f"  Vec len: {len(vec)}, first 3: {vec[:3]}")
        
        # Cek seberapa banyak baris yang eligible di DB
        count = await conn.fetchval("""
            SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NOT NULL
        """)
        print(f"  Total eligible rows: {count}")
        
        # Raw pgvector similarity tanpa limit
        rows = await conn.fetch("""
            SELECT title, cluster, 1-(embedding<=>$1::vector) AS sim
            FROM knowledge_base WHERE embedding IS NOT NULL
            ORDER BY sim DESC LIMIT 10
        """, str(vec))
        print(f"  Top 10 similarity:")
        for r in rows:
            cluster = r['cluster']
            title   = r['title']
            sim     = r['sim']
            print(f"    [{cluster:<30}] {title[:35]} sim={sim:.4f}")
        print()
    
    await conn.close()

asyncio.run(main())
