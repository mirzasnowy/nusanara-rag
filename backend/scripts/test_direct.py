"""Test hybrid_search directly for problem queries"""
import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__) + "/..")
from dotenv import load_dotenv; load_dotenv()
from rag.search import hybrid_search
from config import settings

TESTS = [
    ('q11 Sales',     'Saya berpengalaman 2 tahun sebagai Sales Executive di perusahaan B2B. Terbiasa negosiasi dan closing deal.'),
    ('q12 CS',        'Saya bekerja sebagai customer service selama 3 tahun, terbiasa menangani keluhan pelanggan melalui telepon dan chat.'),
    ('q15 Education', 'Saya guru matematika SMA dengan pengalaman 3 tahun. Ingin beralih ke bidang pelatihan dan training korporat.'),
]

async def main():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    
    for label, q in TESTS:
        print(f"\n=== {label} ===")
        try:
            results = await hybrid_search(q, conn, top_k=10)
            print(f"  Results count: {len(results)}")
            for i, r in enumerate(results[:5], 1):
                cluster = r['cluster']
                title   = r['title']
                print(f"  [{i}] [{cluster}] {title}")
        except Exception as e:
            print(f"  ERROR: {type(e).__name__}: {e}")
    
    await conn.close()

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

asyncio.run(main())
