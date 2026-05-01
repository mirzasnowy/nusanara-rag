import asyncpg
from typing import Optional
from config import settings

# Variabel global untuk menyimpan connection pool
_pool: Optional[asyncpg.Pool] = None

async def init_db_pool():
    """Menginisialisasi connection pool asyncpg ke PostgreSQL."""
    global _pool
    try:
        _pool = await asyncpg.create_pool(
            dsn=settings.DATABASE_URL,
            min_size=1,
            max_size=10,
            command_timeout=60
        )
        print("[OK] Database connection pool initialized.")
    except Exception as e:
        print(f"[ERR] Gagal menginisialisasi database pool: {e}")
        raise

async def close_db_pool():
    """Menutup connection pool saat aplikasi mati."""
    global _pool
    if _pool:
        await _pool.close()
        print("[OK] Database connection pool closed.")

def get_pool() -> asyncpg.Pool:
    """Mengambil connection pool yang sudah diinisialisasi."""
    if _pool is None:
        raise RuntimeError("Database pool has not been initialized. Pastikan init_db_pool() sudah dipanggil.")
    return _pool

async def get_db():
    """
    FastAPI Dependency Injection:
    Mendapatkan (acquire) satu koneksi dari pool untuk digunakan dalam 1 siklus request API.
    Koneksi otomatis dikembalikan (release) setelah request selesai.
    """
    if _pool is None:
        raise RuntimeError("Database pool has not been initialized.")
    async with _pool.acquire() as conn:
        yield conn
