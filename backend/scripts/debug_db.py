import asyncio
import asyncpg
import sys
sys.path.insert(0, ".")
from config import settings

async def main():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    total = await conn.fetchval("SELECT COUNT(*) FROM knowledge_base")
    has_embed = await conn.fetchval("SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NOT NULL")
    
    print(f"Total dokumen di knowledge_base : {total}")
    print(f"Sudah punya embedding           : {has_embed}")
    print(f"Belum di-embed                  : {total - has_embed}")
    print()
    
    # Distribusi per cluster
    clusters = await conn.fetch("""
        SELECT cluster, COUNT(*) as count
        FROM knowledge_base
        GROUP BY cluster
        ORDER BY count DESC
        LIMIT 15
    """)
    print("Distribusi per cluster:")
    for row in clusters:
        print(f"  {row['cluster'] or 'NULL':<30} {row['count']}")
    
    await conn.close()

asyncio.run(main())
