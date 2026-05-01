"""
backend/main.py — Entry point FastAPI NusaNara
Jalankan: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from services.db import init_db_pool, close_db_pool
from api.routes import recommend, history, profile
from config import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle: init connection pool saat startup, close saat shutdown."""
    await init_db_pool()
    yield
    await close_db_pool()


app = FastAPI(
    title="NusaNara API",
    description="Backend RAG + LLM untuk sistem bimbingan karier adaptif",
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────
# Development: izinkan localhost:3000 (Next.js dev server)
# Production: ganti dengan domain Vercel yang sebenarnya
origins = [
    "http://localhost:3000",
    "https://*.vercel.app",
]

if settings.APP_ENV == "development":
    origins.append("*")  # lebih longgar saat dev

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Router ───────────────────────────────────────────────────
app.include_router(recommend.router, prefix="/api", tags=["Rekomendasi"])
app.include_router(history.router, prefix="/api", tags=["Riwayat"])
app.include_router(profile.router, prefix="/api", tags=["Profil"])


@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    Cek status database dan Ollama.
    Gunakan: curl http://localhost:8000/health
    """
    import httpx
    from services.db import get_pool

    status = {"status": "ok", "ollama": "unknown", "database": "unknown"}

    # Cek database
    try:
        pool = get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        status["database"] = "ok"
    except Exception as e:
        status["database"] = f"error: {str(e)}"
        status["status"] = "degraded"

    # Cek Ollama
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                status["ollama"] = "ok"
            else:
                status["ollama"] = f"http_{resp.status_code}"
                status["status"] = "degraded"
    except Exception as e:
        status["ollama"] = f"error: {str(e)}"
        status["status"] = "degraded"

    return status


@app.get("/", tags=["Root"])
async def root():
    return {"message": "NusaNara API v2.0 — Sistem Bimbingan Karier Adaptif"}
