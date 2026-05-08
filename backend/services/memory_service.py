"""
services/memory_service.py — Lean Adaptive Profile System

Arsitektur:
- Extractor Agent: LLM mengekstrak skill/interest dari narasi → JSON terstruktur
- Update Logic: Deterministik (UNION set), tanpa LLM
- Eksekusi: BACKGROUND TASK, tidak pernah memblokir pipeline RAG utama

Ini adalah modul opsional (personalization layer).
Sistem RAG tetap berfungsi penuh tanpa modul ini.
"""
import json
import httpx
import asyncpg
from config import settings


# ── Prompt untuk Extractor Agent ─────────────────────────────
_EXTRACTOR_PROMPT = """Kamu adalah ekstractor data profil. Dari narasi pengguna di bawah, ekstrak informasi dalam format JSON STRICT.

NARASI:
{narrative}

INSTRUKSI:
1. Ekstrak semua skill/keahlian teknis yang DISEBUTKAN (bukan ditebak)
2. Ekstrak minat karier yang jelas
3. Buat ringkasan profil 1-2 kalimat (Bahasa Indonesia)
4. Jika narasi tidak mengandung info yang relevan, kembalikan array kosong

WAJIB kembalikan JSON berikut (TANPA teks lain):
{{"skills": ["skill1", "skill2"], "interests": ["interest1"], "summary_update": "Ringkasan singkat..."}}"""


async def extract_and_update_profile(
    user_id: str,
    narrative: str,
    pool: asyncpg.Pool
) -> None:
    """
    Background task: ekstrak profil dari narasi lalu update DB.
    Dipanggil secara async SETELAH respons RAG dikirim ke user.
    Tidak pernah memblokir fast path.
    """
    try:
        # ── 1. LLM Extractor Agent ────────────────────────────
        extracted = await _call_extractor(narrative)
        if not extracted:
            return  # Narasi tidak mengandung info berguna

        new_skills = extracted.get("skills", [])
        new_interests = extracted.get("interests", [])
        summary = extracted.get("summary_update", "")

        # ── 2. Deterministic Update (no LLM) ──────────────────
        async with pool.acquire() as conn:
            await _update_profile(
                conn, user_id, new_skills, new_interests, summary
            )

    except Exception as e:
        # Background task — log error, jangan crash
        print(f"[adaptive] Error updating profile for {user_id}: {e}")


async def _call_extractor(narrative: str) -> dict | None:
    """
    Panggil LLM sebagai Extractor Agent.
    Output: dict JSON terstruktur atau None jika gagal.
    """
    prompt = _EXTRACTOR_PROMPT.format(narrative=narrative)

    try:
        async with httpx.AsyncClient(timeout=300) as client:
            resp = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/generate",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "keep_alive": -1,
                    "options": {
                        "temperature": 0.1,  # Deterministik
                        "num_predict": 200,  # Pendek — hanya JSON
                    }
                }
            )
            raw = resp.json()["response"].strip()

            # Parse JSON dari respons LLM
            # Cari JSON block jika LLM menambahkan teks di luar
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start == -1 or end == 0:
                return None

            return json.loads(raw[start:end])

    except (json.JSONDecodeError, httpx.HTTPError, KeyError):
        return None


async def _update_profile(
    conn: asyncpg.Connection,
    user_id: str,
    new_skills: list[str],
    new_interests: list[str],
    summary: str
) -> None:
    """
    Update user_profiles secara deterministik:
    - skills    = UNION(old, new)
    - interests = UNION(old, new)
    - summary   = REPLACE (selalu pakai yang terbaru)
    """
    current = await conn.fetchrow(
        "SELECT identified_skills, career_interests FROM user_profiles WHERE user_id=$1",
        user_id
    )

    if not current:
        return  # User belum ada di DB

    # UNION set — yang lama tetap, yang baru ditambahkan
    old_skills = set(current["identified_skills"] or [])
    old_interests = set(current["career_interests"] or [])

    merged_skills = list(old_skills | set(new_skills))
    merged_interests = list(old_interests | set(new_interests))

    await conn.execute("""
        UPDATE user_profiles
        SET identified_skills = $2,
            career_interests  = $3,
            profile_summary   = $4,
            session_count     = session_count + 1,
            last_active       = NOW()
        WHERE user_id = $1
    """, user_id, merged_skills, merged_interests, summary)
