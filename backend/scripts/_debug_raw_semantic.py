"""Debug: cek raw semantic search untuk query Sales dan Education"""
import asyncio, asyncpg, os, sys, httpx
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__) + "/..")
from dotenv import load_dotenv; load_dotenv()
from rag.embed import get_embedding
from rag.search import _expand_query, _DOMAIN_KEYWORDS
import re

DB = os.getenv('DATABASE_URL')

TESTS = [
    ('q11 Sales',     'Saya berpengalaman 2 tahun sebagai Sales Executive di perusahaan B2B. Terbiasa negosiasi dan closing deal.'),
    ('q12 CS',        'Saya bekerja sebagai customer service selama 3 tahun, terbiasa menangani keluhan pelanggan melalui telepon dan chat.'),
    ('q15 Education', 'Saya guru matematika SMA dengan pengalaman 3 tahun. Ingin beralih ke bidang pelatihan dan training korporat.'),
]

async def main():
    conn = await asyncpg.connect(DB)
    
    for label, q in TESTS:
        expanded = _expand_query(q)
        if " | Domain: " in expanded:
            domain_part = expanded.split(" | Domain: ")[1]
            domain_terms = " | ".join(domain_part.split(" | ")[:2])
            embedding_input = f"search_query: {domain_terms}"
        else:
            embedding_input = f"search_query: {q}"
        
        print(f"\n{'='*60}")
        print(f"  {label}")
        print(f"  Embedding: {embedding_input[:80]}")
        
        vec = await get_embedding(embedding_input)
        
        # Raw semantic search top 10
        rows = await conn.fetch("""
            SELECT title, cluster, 1-(embedding<=>$1::vector) AS sim
            FROM knowledge_base WHERE embedding IS NOT NULL
            ORDER BY embedding<=>$1::vector
            LIMIT 10
        """, str(vec))
        
        print(f"  Top 10 semantic results:")
        for r in rows:
            cluster = r['cluster']
            title   = r['title']
            sim     = r['sim']
            print(f"    [{cluster:<30}] {title[:35]:<35} sim={sim:.4f}")
    
    await conn.close()

asyncio.run(main())
