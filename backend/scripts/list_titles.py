"""Ambil sample judul dari setiap cluster untuk keperluan ground truth labeling."""
import asyncio
import asyncpg
import sys
sys.path.insert(0, ".")
from config import settings

async def main():
    conn = await asyncpg.connect(settings.DATABASE_URL)
    clusters = ["Teknologi", "Analisis Data", "Pemasaran Digital", "Desain & Kreatif", "Bisnis & Administrasi"]
    for cl in clusters:
        rows = await conn.fetch(
            "SELECT title, skills FROM knowledge_base WHERE cluster=$1 LIMIT 30", cl
        )
        print(f"\n=== {cl} ===")
        for r in rows:
            skills = ", ".join(r["skills"][:4]) if r["skills"] else "-"
            print(f"  {r['title'][:55]:<55}  [{skills}]")
    await conn.close()

asyncio.run(main())
