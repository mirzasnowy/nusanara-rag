"""Cek apakah search_vector ter-populate dan content field ada untuk Bisnis & Adm"""
import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv; load_dotenv()
DB = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")

async def main():
    conn = await asyncpg.connect(DB)

    # Cek search_vector dan content per cluster
    print("=== search_vector & content status per cluster ===")
    rows = await conn.fetch("""
        SELECT cluster,
               COUNT(*) total,
               COUNT(search_vector) has_sv,
               COUNT(content) has_content,
               COUNT(embedding) has_embed
        FROM knowledge_base
        GROUP BY cluster ORDER BY cluster
    """)
    for r in rows:
        print(f"  {r['cluster']:<35} total={r['total']}  sv={r['has_sv']}  content={r['has_content']}  embed={r['has_embed']}")

    # Sample content dari Bisnis & Adm
    print("\n=== Sample content Bisnis & Administrasi ===")
    sample = await conn.fetch("""
        SELECT title, content, search_vector::text
        FROM knowledge_base
        WHERE cluster='Bisnis & Administrasi'
        LIMIT 5
    """)
    for r in sample:
        print(f"\n  title: {r['title']}")
        print(f"  content: {r['content']}")
        print(f"  search_vector (truncated): {str(r['search_vector'])[:120] if r['search_vector'] else 'NULL'}")

    # Cek apakah FTS bisa match untuk "project manager"
    print("\n=== FTS test: 'project manager' ===")
    try:
        fts = await conn.fetch("""
            SELECT title, cluster,
                   ts_rank(search_vector, to_tsquery('simple', 'project & manager')) AS score
            FROM knowledge_base
            WHERE search_vector @@ to_tsquery('simple', 'project & manager')
            ORDER BY score DESC LIMIT 5
        """)
        if fts:
            for r in fts: print(f"  [{r['cluster']}] {r['title']} (score={r['score']:.4f})")
        else:
            print("  TIDAK ADA hasil FTS untuk 'project & manager'")
    except Exception as e:
        print(f"  FTS error: {e}")

    # Cek embedding similarity langsung
    print("\n=== Semantic test: ambil top-5 closest to 'project management business' ===")
    from rag.embed import get_embedding
    vec = await get_embedding("search_query: project management business development")
    closest = await conn.fetch("""
        SELECT title, cluster, 1-(embedding<=>$1::vector) AS sim
        FROM knowledge_base WHERE embedding IS NOT NULL
        ORDER BY embedding<=>$1::vector LIMIT 8
    """, str(vec))
    for r in closest:
        print(f"  [{r['cluster']:<30}] {r['title'][:40]}  sim={r['sim']:.4f}")

    await conn.close()

import sys
sys.path.insert(0, os.path.dirname(__file__) + "/..")
asyncio.run(main())
