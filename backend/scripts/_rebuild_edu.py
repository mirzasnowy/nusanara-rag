"""
Rebuild content + re-embed Education & Training cluster.
Content yang lebih kaya agar embedding lebih presisi.
"""
import asyncio, asyncpg, os, sys, httpx
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv; load_dotenv()

DB         = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")
OLLAMA_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text-v2-moe")

def build_edu_content(title: str, company: str, location: str,
                      salary_text: str, skills: list) -> str:
    """Build rich content for Education & Training cluster."""
    tl = title.lower()

    if any(w in tl for w in ["trainer", "head trainer", "personal trainer"]):
        context = ("corporate trainer, pelatihan, training korporat, facilitator, "
                   "learning development, instruktur pelatihan, motivator")
    elif any(w in tl for w in ["instruktur", "instructor"]):
        context = ("instruktur kursus, pelatih, pengajar keterampilan, instruktur teknis, "
                   "pelatihan vokasional, training")
    elif any(w in tl for w in ["tutor", "les privat", "bimbel", "bimbingan belajar"]):
        context = ("tutor privat, les privat, bimbingan belajar, pengajar siswa, "
                   "tutor akademik, guru les, mentor belajar")
    elif any(w in tl for w in ["english", "bahasa inggris", "bahasa jepang"]):
        context = ("guru bahasa, pengajar bahasa Inggris, English teacher, tutor bahasa, "
                   "instruktur bahasa asing, language teacher")
    elif any(w in tl for w in ["kindergarten", "paud", "preschool", "playgroup", "tk"]):
        context = ("guru TK, guru PAUD, pengajar anak usia dini, preschool teacher, "
                   "kindergarten teacher, guru anak")
    elif any(w in tl for w in ["guru", "teacher", "pengajar"]):
        context = ("guru sekolah, pengajar, teacher, mentor, pendidikan, mengajar, "
                   "kurikulum, kelas, bimbingan siswa")
    else:
        context = ("pendidikan, pelatihan, pengajar, training, instruktur, "
                   "tutor, pembelajaran, education")

    skills_text = ", ".join(skills) if skills else "Teaching, Communication, Curriculum Development"
    salary_part = f"Gaji: {salary_text}. " if salary_text else ""
    loc_part    = f"Lokasi: {location}. " if location else ""

    return (
        f"search_document: {title} di {company}. "
        f"{loc_part}"
        f"{salary_part}"
        f"Klaster: Education & Training. "
        f"Konteks karier: {context}. "
        f"Keahlian: {skills_text}. "
        f"Syarat: Minimal 1 tahun pengalaman di bidang pendidikan atau pelatihan."
    )

async def main():
    conn = await asyncpg.connect(DB)

    rows = await conn.fetch(
        "SELECT id, title, company, location, salary_text, skills, content "
        "FROM knowledge_base WHERE cluster='Education & Training'"
    )
    print(f"Education & Training: {len(rows)} baris")

    ok = fail = 0
    async with httpx.AsyncClient(timeout=120) as client:
        for row in rows:
            new_content = build_edu_content(
                row['title'],
                row['company'] or "Lembaga Pendidikan",
                row['location'] or "Indonesia",
                row['salary_text'],
                row['skills'] or []
            )
            try:
                resp = await client.post(
                    f"{OLLAMA_URL}/api/embeddings",
                    json={"model": EMBED_MODEL, "prompt": new_content}
                )
                vec = resp.json()["embedding"]
                await conn.execute(
                    "UPDATE knowledge_base SET content=$1, embedding=$2::vector WHERE id=$3",
                    new_content, str(vec), row['id']
                )
                ok += 1
                if ok % 20 == 0 or ok == 1:
                    print(f"  [{ok}/{len(rows)}] {row['title'][:50]}")
            except Exception as e:
                print(f"  ERR {row['title']}: {e}")
                fail += 1

    print(f"\n✓ Re-embedded: {ok} OK, {fail} gagal")

    # Quick sanity check
    print("\nSample content setelah rebuild:")
    samples = await conn.fetch(
        "SELECT title, content FROM knowledge_base "
        "WHERE cluster='Education & Training' "
        "ORDER BY RANDOM() LIMIT 3"
    )
    for r in samples:
        title   = r['title']
        content = r['content']
        print(f"\n  [{title}]")
        print(f"  {content[:160]}...")

    await conn.close()

asyncio.run(main())
