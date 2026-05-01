"""Debug retrieval untuk Analisis Data dan Education & Training"""
import asyncio, asyncpg, os, sys
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, os.path.dirname(__file__) + "/..")
from dotenv import load_dotenv; load_dotenv()
from rag.search import hybrid_search
from config import settings

TESTS = [
    # Analisis Data
    ("q01 Analisis", "Saya lulusan D3 Teknik Informatika, bisa Python dan SQL dasar. Tertarik di bidang data atau backend."),
    ("q02 Analisis", "Saya fresh graduate S1 Sistem Informasi, mahir Excel dan SQL, ingin menjadi data analyst."),
    ("q10 Analisis", "Saya ingin berkarier di bidang analisis data bisnis. Saya sudah pernah bikin dashboard Power BI untuk laporan penjualan."),
    ("q17 Analisis", "Saya lulusan statistika, mahir R dan Python untuk analisis kuantitatif dan visualisasi data."),
    # Education
    ("q15 Education", "Saya guru matematika SMA dengan pengalaman 3 tahun. Ingin beralih ke bidang pelatihan dan training korporat."),
    ("q16 Education", "Saya tutor online untuk mata pelajaran Bahasa Inggris dan memiliki sertifikat TOEFL Instructor."),
]

async def main():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    for label, q in TESTS:
        results = await hybrid_search(q, conn, top_k=5)
        print(f"\n=== {label} ===")
        for i, r in enumerate(results, 1):
            cluster = r['cluster']
            title   = r['title']
            print(f"  [{i}] [{cluster:<30}] {title}")
    await conn.close()

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
asyncio.run(main())
