"""Trace hybrid_search internals dengan debug print"""
import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__) + "/..")
from dotenv import load_dotenv; load_dotenv()
from rag.embed import get_embedding
from rag.search import _expand_query, _build_fts_keywords
from config import settings

DB = settings.DATABASE_URL
QUERY = "Saya bekerja sebagai customer service selama 3 tahun, terbiasa menangani keluhan pelanggan melalui telepon dan chat."

async def main():
    conn = await asyncpg.connect(DB)
    top_k = 10
    
    # Replicate hybrid_search step by step
    expanded_query = _expand_query(QUERY)
    print(f"expanded: {expanded_query[:80]}")
    
    if " | Domain: " in expanded_query:
        domain_part = expanded_query.split(" | Domain: ")[1]
        domain_terms = " | ".join(domain_part.split(" | ")[:2])
        embedding_input = f"search_query: {domain_terms}"
    else:
        embedding_input = f"search_query: {QUERY}"
    
    print(f"embedding_input: {embedding_input[:80]}")
    
    query_embedding = await get_embedding(embedding_input)
    print(f"embedding type: {type(query_embedding)}, len: {len(query_embedding)}")
    
    # Test the exact SQL from search.py
    print("\n--- Semantic search (exact SQL from search.py) ---")
    params_semantic = [str(query_embedding), top_k]
    print(f"params_semantic[0][:50]: {params_semantic[0][:50]}")
    print(f"params_semantic[1]: {params_semantic[1]}")
    
    try:
        semantic_results = await conn.fetch(
            """
            SELECT
                id, title, company, location, salary_text, skills, cluster,
                1 - (embedding <=> $1::vector) AS sim_score
            FROM knowledge_base
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> $1::vector
            LIMIT $2
            """,
            *params_semantic
        )
        print(f"Semantic results count: {len(semantic_results)}")
        for r in semantic_results[:5]:
            print(f"  [{r['cluster']}] {r['title']} sim={r['sim_score']:.4f}")
    except Exception as e:
        print(f"Semantic ERROR: {type(e).__name__}: {e}")

    # FTS
    keywords = _build_fts_keywords(QUERY)
    print(f"\n--- FTS: keywords='{keywords}' ---")
    try:
        fulltext_results = await conn.fetch(
            """
            SELECT
                id, title, company, location, salary_text, skills, cluster,
                ts_rank(search_vector, to_tsquery('simple', $1)) AS fts_score
            FROM knowledge_base
            WHERE search_vector @@ to_tsquery('simple', $1)
            ORDER BY fts_score DESC
            LIMIT $2
            """,
            keywords, top_k
        )
        print(f"FTS results count: {len(fulltext_results)}")
    except Exception as e:
        print(f"FTS error: {type(e).__name__}: {e}")

    await conn.close()

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

asyncio.run(main())
