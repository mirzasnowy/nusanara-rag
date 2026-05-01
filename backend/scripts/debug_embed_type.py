import asyncio
import asyncpg
import sys
sys.path.insert(0, ".")
from config import settings
from rag.embed import get_embedding
from rag.search import _expand_query

async def main():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    # Cek tipe kolom embedding
    col_info = await conn.fetch("""
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_name = 'knowledge_base'
        ORDER BY ordinal_position
    """)
    print("Kolom knowledge_base:")
    for row in col_info:
        print(f"  {row['column_name']:<25} {row['data_type']} ({row['udt_name']})")
    print()
    
    # Cek sample embedding (apakah berupa vector atau text?)
    sample = await conn.fetchrow("""
        SELECT id, title, pg_typeof(embedding) as embed_type,
               length(embedding::text) as embed_len
        FROM knowledge_base
        WHERE embedding IS NOT NULL
        LIMIT 1
    """)
    if sample:
        print(f"Sample doc: {sample['title']}")
        print(f"  Tipe embedding: {sample['embed_type']}")
        print(f"  Panjang string repr: {sample['embed_len']} chars")
    
    # Test raw distance query
    query = "python developer backend"
    embedding = await get_embedding(f"search_query: {query}")
    
    rows = await conn.fetch("""
        SELECT id, title,
               1 - (embedding <=> $1::vector) AS sim_score
        FROM knowledge_base
        WHERE embedding IS NOT NULL
        ORDER BY sim_score DESC
        LIMIT 5
    """, str(embedding))
    
    print(f"\nTop 5 by sim_score for 'python developer backend':")
    for row in rows:
        print(f"  {row['sim_score']:.4f} — {row['title']}")
    
    await conn.close()

asyncio.run(main())
