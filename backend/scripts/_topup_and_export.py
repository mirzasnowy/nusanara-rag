"""
Top-up 2 lowongan Bisnis & Administrasi ke DB, embed, lalu export semua 720 ke CSV.
"""
import asyncio, asyncpg, os, sys, httpx, csv
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv; load_dotenv()

DB         = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")
OLLAMA_URL  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text-v2-moe")

# 2 lowongan Bisnis baru — realistis, berbeda dari yang ada
NEW_JOBS = [
    {
        "title":         "Business Development Manager",
        "company":       "PT Maju Bersama Nusantara",
        "location":      "Jakarta Selatan, DKI Jakarta",
        "salary_text":   "Rp 12 jt-18 jt",
        "salary_min":    12000000,
        "salary_max":    18000000,
        "skills":        ["Business Development", "Negotiation", "Strategic Planning", "CRM", "Communication"],
        "experience_min": 3,
        "cluster":       "Bisnis & Administrasi",
    },
    {
        "title":         "General Affairs & Admin Manager",
        "company":       "PT Graha Karya Utama",
        "location":      "Bandung, Jawa Barat",
        "salary_text":   "Rp 8 jt-12 jt",
        "salary_min":    8000000,
        "salary_max":    12000000,
        "skills":        ["General Affairs", "Administration", "Office Management", "Coordination", "Procurement"],
        "experience_min": 3,
        "cluster":       "Bisnis & Administrasi",
    },
]

def build_bisnis_content(job: dict) -> str:
    tl = job["title"].lower()
    if "business development" in tl:
        context = ("business development manager, pengembangan bisnis, negosiasi, "
                   "strategic planning, partnership, CRM, revenue growth")
    else:
        context = ("general affairs, administrasi umum, office management, "
                   "koordinasi operasional, pengadaan, fasilitas kantor")

    skills_text = ", ".join(job["skills"])
    return (
        f"search_document: {job['title']} di {job['company']}. "
        f"Lokasi: {job['location']}. "
        f"Gaji: {job['salary_text']}. "
        f"Klaster: Bisnis & Administrasi. "
        f"Konteks karier: {context}. "
        f"Keahlian: {skills_text}. "
        f"Syarat: Minimal 3 tahun pengalaman di bidang bisnis atau administrasi."
    )

async def main():
    conn = await asyncpg.connect(DB)

    # ── STEP 1: Cek count sekarang ────────────────────────
    before = await conn.fetchval(
        "SELECT COUNT(*) FROM knowledge_base WHERE cluster='Bisnis & Administrasi'"
    )
    total_before = await conn.fetchval("SELECT COUNT(*) FROM knowledge_base")
    print(f"Sebelum: Bisnis & Administrasi = {before}, Total DB = {total_before}")

    # ── STEP 2: Insert + embed 2 lowongan baru ────────────
    async with httpx.AsyncClient(timeout=120) as client:
        for job in NEW_JOBS:
            content = build_bisnis_content(job)
            # Embed
            resp = await client.post(
                f"{OLLAMA_URL}/api/embeddings",
                json={"model": EMBED_MODEL, "prompt": content}
            )
            vec = resp.json()["embedding"]

            # Cek duplikat
            exists = await conn.fetchval(
                "SELECT 1 FROM knowledge_base WHERE title=$1 AND company=$2",
                job["title"], job["company"]
            )
            if exists:
                print(f"  SKIP (sudah ada): {job['title']}")
                continue

            # Bangun tsvector
            skills_str = " ".join(job["skills"])
            search_text = f"{job['title']} {skills_str} {job['cluster']}"

            await conn.execute("""
                INSERT INTO knowledge_base
                  (title, company, location, salary_text, salary_min, salary_max,
                   skills, experience_min, cluster, content, embedding, search_vector)
                VALUES
                  ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::vector,
                   to_tsvector('simple', $12))
            """,
                job["title"], job["company"], job["location"],
                job["salary_text"], job["salary_min"], job["salary_max"],
                job["skills"], job["experience_min"], job["cluster"],
                content, str(vec), search_text
            )
            print(f"  ✓ Insert: {job['title']} di {job['company']}")

    # ── STEP 3: Verifikasi count ──────────────────────────
    after_bisnis = await conn.fetchval(
        "SELECT COUNT(*) FROM knowledge_base WHERE cluster='Bisnis & Administrasi'"
    )
    total_after = await conn.fetchval("SELECT COUNT(*) FROM knowledge_base")
    print(f"\nSesudah: Bisnis & Administrasi = {after_bisnis}, Total DB = {total_after}")

    # ── STEP 4: Export semua 720 ke cleaned_jobs.csv ──────
    print("\nExporting ke data/cleaned_jobs.csv...")
    rows = await conn.fetch("""
        SELECT title, company, location, salary_text, salary_min, salary_max,
               skills, experience_min, cluster, content
        FROM knowledge_base
        ORDER BY cluster, title
    """)

    out_path = os.path.join(os.path.dirname(__file__), "..", "..", "data", "cleaned_jobs.csv")
    out_path = os.path.normpath(out_path)

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "title","company","location","salary_text","salary_min","salary_max",
            "skills","experience_min","cluster","content"
        ])
        writer.writeheader()
        for r in rows:
            writer.writerow({
                "title":        r["title"],
                "company":      r["company"] or "",
                "location":     r["location"] or "",
                "salary_text":  r["salary_text"] or "",
                "salary_min":   r["salary_min"] or "",
                "salary_max":   r["salary_max"] or "",
                "skills":       "|".join(r["skills"] or []),
                "experience_min": r["experience_min"] or "",
                "cluster":      r["cluster"],
                "content":      (r["content"] or "")[:300],
            })

    total_written = len(rows)
    print(f"✓ Export selesai: {total_written} baris → {out_path}")

    # ── STEP 5: Distribusi final ──────────────────────────
    print("\nDistribusi final:")
    dist = await conn.fetch("""
        SELECT cluster, COUNT(*) AS n
        FROM knowledge_base GROUP BY cluster ORDER BY cluster
    """)
    for d in dist:
        flag = "✓" if d["n"] == 90 else f"← {d['n']}"
        print(f"  {d['cluster']:<35} {d['n']:>3}  {flag}")

    await conn.close()

asyncio.run(main())
