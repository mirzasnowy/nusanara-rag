"""Trace hybrid_search step by step untuk q12 CS"""
import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__) + "/..")
from dotenv import load_dotenv; load_dotenv()
from rag.embed import get_embedding
from rag.search import _expand_query, _build_fts_keywords

DB = os.getenv('DATABASE_URL')

QUERY = "Saya bekerja sebagai customer service selama 3 tahun, terbiasa menangani keluhan pelanggan melalui telepon dan chat."

async def main():
    conn = await asyncpg.connect(DB)
    
    expanded = _expand_query(QUERY)
    if " | Domain: " in expanded:
        domain_part = expanded.split(" | Domain: ")[1]
        domain_terms = " | ".join(domain_part.split(" | ")[:2])
        embedding_input = f"search_query: {domain_terms}"
    else:
        embedding_input = f"search_query: {QUERY}"
    
    print(f"Embedding input: {embedding_input[:100]}")
    
    try:
        vec = await get_embedding(embedding_input)
        print(f"Vector dims: {len(vec)}")
        print(f"Vector sample: {vec[:3]}")
    except Exception as e:
        print(f"Embedding FAILED: {e}")
        await conn.close()
        return

    # Step 1: Semantic search
    print("\n--- Step 1: Semantic Search ---")
    semantic_results = await conn.fetch("""
        SELECT id, title, cluster,
               1 - (embedding <=> $1::vector) AS sim_score
        FROM knowledge_base
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 10
    """, str(vec))
    print(f"Semantic results: {len(semantic_results)}")
    for r in semantic_results[:5]:
        title   = r['title']
        cluster = r['cluster']
        sim     = r['sim_score']
        print(f"  [{cluster:<25}] {title[:35]} sim={sim:.4f}")

    # Step 2: FTS
    keywords = _build_fts_keywords(QUERY)
    print(f"\n--- Step 2: FTS keywords: '{keywords}' ---")
    try:
        fts_results = await conn.fetch("""
            SELECT id, title, cluster,
                   ts_rank(search_vector, to_tsquery('simple', $1)) AS fts_score
            FROM knowledge_base
            WHERE search_vector @@ to_tsquery('simple', $1)
            ORDER BY fts_score DESC
            LIMIT 10
        """, keywords)
        print(f"FTS results: {len(fts_results)}")
        for r in fts_results[:5]:
            title   = r['title']
            cluster = r['cluster']
            score   = r['fts_score']
            print(f"  [{cluster:<25}] {title[:35]} fts={score:.4f}")
    except Exception as e:
        print(f"FTS error: {e}")

    await conn.close()

asyncio.run(main())
