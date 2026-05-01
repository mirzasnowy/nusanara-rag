"""
backend/api/routes/profile.py — Profil Pengguna
GET  /api/profile          — Ambil profil adaptif user yang sedang login
POST /api/profile/init     — Inisialisasi user baru setelah pertama login
PUT  /api/profile/reset    — Reset profil (hapus summary, mulai dari awal)
"""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services.db import get_db
from services.profile_service import get_full_profile, ensure_user_exists
from api.middleware.auth import get_current_user

router = APIRouter()


class ProfileInitRequest(BaseModel):
    email: str
    full_name: str


@router.get("/profile")
async def get_profile_endpoint(
    user_id: str = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    Ambil profil adaptif user yang sedang login.
    Response 404 jika profil belum diinisialisasi (user baru yang belum hit /init).
    """
    profile = await get_full_profile(user_id, conn)
    if not profile:
        return {
            "user_id": user_id,
            "profile_summary": None,
            "session_count": 0,
            "is_new_user": True,
        }

    return {
        **{k: (v.isoformat() if hasattr(v, 'isoformat') else v) for k, v in profile.items()},
        "is_new_user": profile.get("session_count", 0) == 0,
    }


@router.post("/profile/init")
async def init_profile(
    body: ProfileInitRequest,
    user_id: str = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    Inisialisasi profil user setelah pertama kali login via Clerk.
    Dipanggil oleh frontend setelah mendapat JWT dari Clerk OAuth.
    Idempotent: aman dipanggil berkali-kali (ON CONFLICT DO NOTHING).
    """
    await ensure_user_exists(user_id, body.email, body.full_name, conn)
    return {"message": "Profil berhasil diinisialisasi", "user_id": user_id}


@router.delete("/profile/reset")
async def reset_profile(
    user_id: str = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    Reset profil adaptif pengguna: hapus profile_summary dan set session_count ke 0.
    Data riwayat (recommendation_history) TIDAK dihapus.
    """
    await conn.execute(
        """
        UPDATE user_profiles
        SET profile_summary = NULL,
            identified_skills = NULL,
            career_interests = NULL,
            preferred_clusters = NULL,
            session_count = 0,
            last_active = NOW()
        WHERE user_id = $1
        """,
        user_id
    )
    return {"message": "Profil berhasil direset. Mulai dari awal!"}
