"""Debug: lihat apa yang di-retrieve sistem untuk query Bisnis & Finance"""
import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__) + "/..")
from dotenv import load_dotenv; load_dotenv()
from config import settings
from rag.search import hybrid_search

QUERIES = [
    ("q06 - Bisnis", "Saya punya kemampuan project management dan komunikasi bisnis. Berpengalaman koordinasi tim lintas departemen."),
    ("q11 - Sales", "Saya berpengalaman 2 tahun sebagai Sales Executive di perusahaan B2B. Terbiasa negosiasi dan closing deal."),
    ("q12 - CS", "Saya bekerja sebagai customer service selama 3 tahun, terbiasa menangani keluhan pelanggan melalui telepon dan chat."),
    ("q13 - Finance", "Saya lulusan S1 Akuntansi, sudah lulus ujian CPA, pengalaman audit di KAP selama 2 tahun."),
]

async def main():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    for label, q in QUERIES:
        print(f"\n{'='*55}")
        print(f"  {label}")
        print(f"  Query: {q[:60]}...")
        print(f"{'='*55}")
        docs = await hybrid_search(q, conn, top_k=5)
        for i, d in enumerate(docs, 1):
            print(f"  [{i}] cluster={d.get('cluster','?'):<25}  title={d.get('title','?')}")
    await conn.close()

asyncio.run(main())
