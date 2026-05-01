"""
Skrip debug: periksa distribusi sim_score dari semantic search
untuk query "python sql backend data" agar bisa kalibrasi threshold.
"""
import asyncio
import asyncpg
import sys
sys.path.insert(0, ".")
from config import settings
from rag.embed import get_embedding
from rag.search import _expand_query

async def main():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    query = "Saya bisa Python dan SQL dasar. Saya tertarik di bidang data atau backend."
    expanded = _expand_query(query)
    print(f"Expanded query:\n  {expanded}\n")
    
    embedding = await get_embedding(f"search_query: {expanded}")
    
    rows = await conn.fetch("""
        SELECT
            id, title, company,
            1 - (embedding <=> $1::vector) AS sim_score,
            skills
        FROM knowledge_base
        WHERE embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT 15
    """, str(embedding))
    
    print(f"{'#':<3} {'sim_score':<10} {'title':<40} {'skills'}")
    print("-" * 90)
    for i, row in enumerate(rows, 1):
        skills = ", ".join(row["skills"][:3]) if row["skills"] else "-"
        print(f"{i:<3} {row['sim_score']:<10.4f} {row['title'][:38]:<40} {skills}")
    
    await conn.close()

asyncio.run(main())
