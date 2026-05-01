import asyncio, asyncpg, os
from dotenv import load_dotenv; load_dotenv()
async def f():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    cols = await conn.fetch(
        "SELECT column_name, data_type FROM information_schema.columns "
        "WHERE table_name='knowledge_base' ORDER BY ordinal_position"
    )
    for c in cols:
        name  = c['column_name']
        dtype = c['data_type']
        print(f"  {name:<25} {dtype}")
    await conn.close()
asyncio.run(f())
