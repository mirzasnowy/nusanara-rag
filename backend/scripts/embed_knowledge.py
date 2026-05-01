"""
backend/scripts/embed_knowledge.py — Generate Embedding untuk Semua Dokumen
Dijalankan SEKALI setelah import_to_db.py.

Proses:
1. Ambil semua baris knowledge_base yang belum punya embedding (IS NULL)
2. Buat teks content dari field-field lowongan
3. Kirim ke Ollama nomic-embed-text
4. Simpan vector 768 dimensi ke kolom embedding

Estimasi waktu: ~10-15 menit untuk 476 dokumen (via CPU)

Jalankan:
    python scripts/embed_knowledge.py

Pastikan Ollama sudah running:
    ollama serve   (atau sudah jalan sebagai service)
"""
import asyncio
import asyncpg
import httpx
import os
import sys

if sys.stdout.encoding != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text-v2-moe")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://mirza:devpassword@localhost:5432/nusanara_dev")


async def get_embedding(text: str, client: httpx.AsyncClient) -> list[float]:
    """Kirim teks ke Ollama nomic-embed-text, return vector 768 dimensi."""
    response = await client.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
        timeout=30
    )
    response.raise_for_status()
    embedding = response.json()["embedding"]
    assert len(embedding) == 768, f"Dimensi embedding tidak sesuai: {len(embedding)} (harus 768)"
    return embedding


def build_content(row: dict) -> str:
    """
    Gabungkan field-field menjadi teks deskriptif untuk di-embed.
    Format ini menentukan kualitas semantic search — lebih deskriptif = lebih baik.
    """
    skills_str = ", ".join(row.get("skills") or [])
    doc_text = (
        f"{row['title']} di {row.get('company', '')}. "
        f"Lokasi: {row.get('location', '')}. "
        f"Gaji: {row.get('salary_text') or 'Tidak Ditampilkan'}. "
        f"Pengalaman: {row.get('requirements', '')}. "
        f"Skills: {skills_str}. "
        f"Klaster: {row.get('cluster', '')}."
    )
    # Prefix wajib untuk nomic-embed-text-v2-moe
    return f"search_document: {doc_text}"


async def embed_all():
    conn = await asyncpg.connect(DATABASE_URL)

    # Cek total yang belum ter-embed
    total_missing = await conn.fetchval(
        "SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NULL"
    )

    if total_missing == 0:
        print("✓ Semua baris sudah ter-embed! Tidak ada yang perlu diproses.")
        await conn.close()
        return

    # Ambil semua baris yang belum punya embedding
    rows = await conn.fetch(
        """
        SELECT id, title, company, location, salary_text,
               requirements, skills, cluster
        FROM knowledge_base
        WHERE embedding IS NULL
        ORDER BY id
        """
    )

    total = len(rows)
    print(f"Akan embed {total} dokumen menggunakan {EMBED_MODEL}...")
    print(f"Estimasi waktu: ~{total // 35} menit\n")

    success = 0
    errors = 0

    async with httpx.AsyncClient() as client:
        for i, row in enumerate(rows, 1):
            row_dict = dict(row)
            content = build_content(row_dict)

            try:
                # Update kolom content dulu (bermanfaat untuk debug)
                await conn.execute(
                    "UPDATE knowledge_base SET content = $1 WHERE id = $2",
                    content, row["id"]
                )

                # Generate embedding
                embedding = await get_embedding(content, client)

                # Simpan embedding ke database
                await conn.execute(
                    "UPDATE knowledge_base SET embedding = $1::vector WHERE id = $2",
                    str(embedding), row["id"]
                )

                success += 1
                print(f"  [{i:3d}/{total}] ✓ ID {row['id']}: {row['title'][:50]}")

            except Exception as e:
                errors += 1
                print(f"  [{i:3d}/{total}] ✗ ID {row['id']}: {e}")

                # Retry sekali
                try:
                    embedding = await get_embedding(content, client)
                    await conn.execute(
                        "UPDATE knowledge_base SET embedding = $1::vector WHERE id = $2",
                        str(embedding), row["id"]
                    )
                    success += 1
                    errors -= 1
                    print(f"  [{i:3d}/{total}] ✓ ID {row['id']}: RETRY BERHASIL")
                except Exception:
                    pass

    await conn.close()

    print(f"\n{'='*50}")
    print(f"Selesai! {success}/{total} dokumen berhasil di-embed.")
    if errors > 0:
        print(f"⚠️  {errors} dokumen gagal — jalankan script ini lagi untuk retry.")
    print(f"\nVerifikasi: python -c \"import asyncpg, asyncio; ...")
    print("Atau via MCP: 'Cek berapa baris yang sudah punya embedding'")


if __name__ == "__main__":
    asyncio.run(embed_all())
