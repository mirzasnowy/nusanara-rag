"""Test berbagai format vector parameter untuk pgvector"""
import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__) + "/..")
from dotenv import load_dotenv; load_dotenv()
from rag.embed import get_embedding

DB = os.getenv('DATABASE_URL')

async def main():
    conn = await asyncpg.connect(DB)
    
    vec = await get_embedding("search_query: customer service cs pelanggan")
    print(f"Vec type: {type(vec)}, len: {len(vec)}")
    
    # Test 1: str(list) - cara sekarang
    print("\n--- Test 1: str(list) ---")
    try:
        r = await conn.fetch("""
            SELECT COUNT(*) AS n FROM knowledge_base
            WHERE embedding IS NOT NULL
              AND embedding <=> $1::vector < 1.0
        """, str(vec))
        print(f"  Result count: {r[0]['n']}")
    except Exception as e:
        print(f"  ERROR: {e}")
    
    # Test 2: Python list langsung (tanpa str)
    print("\n--- Test 2: list langsung ---")
    try:
        r = await conn.fetch("""
            SELECT COUNT(*) AS n FROM knowledge_base
            WHERE embedding IS NOT NULL
              AND embedding <=> $1 < 1.0
        """, vec)
        print(f"  Result count: {r[0]['n']}")
    except Exception as e:
        print(f"  ERROR: {e}")
    
    # Test 3: pgvector register codec
    print("\n--- Test 3: register pgvector + list ---")
    try:
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
    except:
        pass
    try:
        r = await conn.fetch("""
            SELECT COUNT(*) AS n FROM knowledge_base 
            WHERE embedding IS NOT NULL
        """)
        print(f"  Total rows: {r[0]['n']}")
    except Exception as e:
        print(f"  ERROR count: {e}")
    
    # Test 4: manual string format pgvector
    vec_str = "[" + ",".join(str(x) for x in vec) + "]"
    print(f"\n--- Test 4: manual pgvector string format ---")
    print(f"  vec_str[:50]: {vec_str[:50]}")
    try:
        r = await conn.fetch("""
            SELECT COUNT(*) AS n FROM knowledge_base
            WHERE embedding IS NOT NULL
              AND embedding <=> $1::vector < 1.0
        """, vec_str)
        print(f"  Result count: {r[0]['n']}")
    except Exception as e:
        print(f"  ERROR: {e}")
    
    await conn.close()

asyncio.run(main())
