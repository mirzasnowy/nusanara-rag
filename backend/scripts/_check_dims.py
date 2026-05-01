import asyncio, asyncpg, os, sys
sys.stdout.reconfigure(encoding='utf-8')
from dotenv import load_dotenv; load_dotenv()
DB = os.getenv('DATABASE_URL')

async def main():
    conn = await asyncpg.connect(DB)
    
    # Cek embedding NULL per cluster
    rows = await conn.fetch('''
        SELECT cluster,
               COUNT(*) AS total,
               COUNT(embedding) AS has_emb,
               COUNT(*) - COUNT(embedding) AS no_emb
        FROM knowledge_base
        GROUP BY cluster ORDER BY cluster
    ''')
    print('Cluster                              total  has_embed  no_embed')
    print('-' * 65)
    for r in rows:
        cluster = r['cluster']
        total   = r['total']
        has_emb = r['has_emb']
        no_emb  = r['no_emb']
        flag = "  <-- MASALAH!" if no_emb > 0 else ""
        print(f'{cluster:<35} {total:>5}  {has_emb:>9}  {no_emb:>8}{flag}')

    # Cek dimensi vector — apakah konsisten?
    print("\nSample vector dimensions per cluster:")
    dims_rows = await conn.fetch('''
        SELECT cluster, vector_dims(embedding) AS dims, COUNT(*) n
        FROM knowledge_base WHERE embedding IS NOT NULL
        GROUP BY cluster, vector_dims(embedding)
        ORDER BY cluster
    ''')
    for r in dims_rows:
        cluster = r['cluster']
        dims    = r['dims']
        n       = r['n']
        print(f'  {cluster:<35} dims={dims}  n={n}')

    await conn.close()

asyncio.run(main())
