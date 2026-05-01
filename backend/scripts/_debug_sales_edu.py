import asyncio, asyncpg, os, sys
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(__file__) + "/..")
from dotenv import load_dotenv; load_dotenv()
from rag.search import hybrid_search

DB = os.getenv('DATABASE_URL')

TESTS = [
    ('q11 Sales',     'Saya berpengalaman 2 tahun sebagai Sales Executive di perusahaan B2B. Terbiasa negosiasi dan closing deal.'),
    ('q12 CS',        'Saya bekerja sebagai customer service selama 3 tahun, terbiasa menangani keluhan pelanggan melalui telepon dan chat.'),
    ('q15 Education', 'Saya guru matematika SMA dengan pengalaman 3 tahun. Ingin beralih ke bidang pelatihan dan training korporat.'),
    ('q16 Education', 'Saya tutor online untuk mata pelajaran Bahasa Inggris dan memiliki sertifikat TOEFL Instructor.'),
]

async def main():
    conn = await asyncpg.connect(DB)
    for label, q in TESTS:
        results = await hybrid_search(q, conn, top_k=5)
        print(f'\n=== {label} ===')
        for i, r in enumerate(results, 1):
            cluster = r['cluster']
            title   = r['title']
            print(f'  [{i}] [{cluster}] {title}')
    await conn.close()

asyncio.run(main())
