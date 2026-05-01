"""
backend/api/routes/history.py — Riwayat Rekomendasi
GET /api/history          — Daftar semua riwayat milik user (dengan pagination)
GET /api/history/{id}     — Detail satu riwayat
"""
import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from services.db import get_db
from api.middleware.auth import get_current_user

router = APIRouter()


@router.get("/history")
async def get_history(
    user_id: str = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50)
):
    """
    Ambil daftar riwayat rekomendasi milik user yang sedang login.
    Response berisi preview narasi dan posisi yang direkomendasikan.

    Query params:
    - page: nomor halaman (default: 1)
    - limit: jumlah per halaman (default: 10, max: 50)
    """
    offset = (page - 1) * limit

    # Total count untuk pagination
    total = await conn.fetchval(
        "SELECT COUNT(*) FROM recommendation_history WHERE user_id = $1",
        user_id
    )

    # Ambil daftar riwayat (tanpa kolom recommendation yang panjang)
    rows = await conn.fetch(
        """
        SELECT
            id,
            narrative_input,
            identified_positions,
            response_time_ms,
            created_at,
            -- Preview narasi: 150 karakter pertama
            LEFT(narrative_input, 150) AS narrative_preview,
            -- Preview rekomendasi: ambil dari retrieved_chunks
            retrieved_chunks
        FROM recommendation_history
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        """,
        user_id, limit, offset
    )

    return {
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": (total + limit - 1) // limit,
        "data": [
            {
                "id": r["id"],
                "narrative_preview": r["narrative_preview"],
                "retrieved_chunks": r["retrieved_chunks"],
                "identified_positions": r["identified_positions"],
                "response_time_ms": r["response_time_ms"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            }
            for r in rows
        ]
    }


@router.get("/history/{history_id}")
async def get_history_detail(
    history_id: int,
    user_id: str = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    """
    Ambil detail lengkap satu riwayat rekomendasi.
    Hanya bisa diakses oleh pemilik riwayat tersebut.
    """
    row = await conn.fetchrow(
        """
        SELECT
            id, user_id, narrative_input, profile_at_time,
            retrieved_chunks, recommendation, identified_positions,
            response_time_ms, tokens_generated, created_at
        FROM recommendation_history
        WHERE id = $1 AND user_id = $2
        """,
        history_id, user_id
    )

    if not row:
        raise HTTPException(status_code=404, detail="Riwayat tidak ditemukan")

    return {
        "id": row["id"],
        "narrative_input": row["narrative_input"],
        "profile_at_time": row["profile_at_time"],
        "retrieved_chunks": row["retrieved_chunks"],
        "recommendation": row["recommendation"],
        "identified_positions": row["identified_positions"],
        "response_time_ms": row["response_time_ms"],
        "tokens_generated": row["tokens_generated"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
    }
