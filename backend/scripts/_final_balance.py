"""Import raw_jobs_top_up.csv langsung ke DB + trim semua ke 90 + embed"""
import asyncio, asyncpg, os, sys, csv, re, httpx
if sys.stdout.encoding != "utf-8": sys.stdout.reconfigure(encoding="utf-8")
from dotenv import load_dotenv; load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")
OLLAMA_URL   = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL  = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text-v2-moe")
INPUT_FILE = os.path.join(os.path.dirname(__file__), "..", "..", "data", "raw_jobs_top_up.csv")
TARGET = 90

SKILL_DEFAULTS = {
    "Sales & Customer Service":   ["Communication", "Sales", "Customer Handling"],
    "Finance & Accounting":       ["Accounting", "Excel", "Financial Reporting"],
    "Analisis Data":              ["SQL", "Excel", "Data Analysis"],
    "Pemasaran Digital":          ["Marketing", "Communication", "Social Media"],
    "Bisnis & Administrasi":      ["Communication", "Microsoft Office", "Analysis"],
}

def infer_skills(title, cluster):
    tl = title.lower()
    if "sales" in tl or "account exec" in tl: return ["Sales", "Negotiation", "Communication"]
    if "customer" in tl or "call center" in tl: return ["Customer Service", "Communication", "CRM"]
    if "finance" in tl or "accounting" in tl or "staff acc" in tl: return ["Accounting", "Excel", "Financial Reporting"]
    if "tax" in tl: return ["Tax Compliance", "Excel", "Accounting"]
    if "data" in tl or "analyst" in tl: return ["SQL", "Excel", "Data Analysis"]
    if "seo" in tl or "marketing" in tl: return ["SEO", "Digital Marketing", "Google Analytics"]
    return SKILL_DEFAULTS.get(cluster, ["Communication", "Microsoft Office"])

def to_int(val):
    try: return int(float(val)) if val and str(val).strip() not in ("","nan") else None
    except: return None

def parse_skills_arr(s):
    if not s or s=="{}": return []
    return [x.strip().strip('"') for x in s.strip("{}").split(",") if x.strip().strip('"')]

async def main():
    conn = await asyncpg.connect(DATABASE_URL)

    # Step 1: Import raw_jobs_top_up.csv
    with open(INPUT_FILE, encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    print(f"Import dari raw_jobs_top_up.csv: {len(rows)} baris")

    inserted = skipped = 0
    for row in rows:
        title   = (row.get("title") or "").strip()
        company = (row.get("company") or "").strip()
        cluster = (row.get("cluster") or "").strip()
        if not title: skipped += 1; continue
        exists = await conn.fetchval(
            "SELECT id FROM knowledge_base WHERE title=$1 AND company=$2 LIMIT 1", title, company
        )
        if exists: skipped += 1; continue
        skills = infer_skills(title, cluster)
        exp = 1
        try:
            await conn.execute(
                """INSERT INTO knowledge_base
                   (title, company, location, requirements, skills, cluster, experience_min, source_url)
                   VALUES ($1,$2,$3,$4,$5,$6,$7,$8)""",
                title, company,
                row.get("location") or "Indonesia",
                "Minimal 1 tahun pengalaman.",
                skills, cluster, exp,
                row.get("source_url") or None,
            )
            inserted += 1
        except Exception as e:
            print(f"  ERR {title}: {e}")

    print(f"  Inserted: {inserted}, Skipped: {skipped}")

    # Step 2: Trim ke 90
    clusters = await conn.fetch(
        "SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster ORDER BY n DESC"
    )
    print("\nSebelum trim:")
    for r in clusters:
        print(f"  {r['cluster']:<35} {r['n']}")

    for r in clusters:
        if r["n"] > TARGET:
            excess = r["n"] - TARGET
            await conn.execute(
                """DELETE FROM knowledge_base WHERE id IN (
                   SELECT id FROM knowledge_base WHERE cluster=$1 ORDER BY id ASC LIMIT $2
                )""", r["cluster"], excess
            )
            print(f"  Trim {r['cluster']}: {r['n']} → {TARGET}")

    # Step 3: Embed yang belum
    to_embed = await conn.fetch(
        "SELECT id, title, cluster, skills FROM knowledge_base WHERE embedding IS NULL ORDER BY id"
    )
    print(f"\nEmbed {len(to_embed)} baris baru...")

    ok = fail = 0
    async with httpx.AsyncClient(timeout=60) as client:
        for i, row in enumerate(to_embed, 1):
            skills_text = ", ".join(row["skills"] or [])
            content = f"Posisi: {row['title']}. Klaster: {row['cluster']}. Keahlian: {skills_text}."
            try:
                resp = await client.post(f"{OLLAMA_URL}/api/embeddings",
                    json={"model": EMBED_MODEL, "prompt": content})
                vec = resp.json()["embedding"]
                await conn.execute(
                    "UPDATE knowledge_base SET content=$1, embedding=$2::vector WHERE id=$3",
                    content, str(vec), row["id"]
                )
                ok += 1
                if i % 10 == 0 or i == 1:
                    print(f"  [{i}/{len(to_embed)}] {row['title'][:45]}")
            except Exception as e:
                print(f"  ERR: {e}"); fail += 1

    print(f"  Embed: {ok} OK, {fail} gagal")

    # Final distribusi
    final = await conn.fetch(
        "SELECT cluster, COUNT(*) n FROM knowledge_base GROUP BY cluster ORDER BY cluster"
    )
    print("\nDistribusi FINAL DB:")
    total = 0
    for r in final:
        print(f"  {r['cluster']:<35} {r['n']}")
        total += r["n"]
    print(f"\nTotal: {total}")
    await conn.close()

asyncio.run(main())
