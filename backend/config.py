"""
backend/config.py — Konfigurasi aplikasi dari environment variables
Menggunakan pydantic-settings untuk validasi otomatis.
"""
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://mirza:devpassword@localhost:5432/nusanara_dev"

    # Clerk Auth
    CLERK_SECRET_KEY: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""
    CLERK_JWKS_URL: str = ""

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "llama3.1:8b-instruct-q4_K_M"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text-v2-moe"
    OLLAMA_NUM_THREAD: int = 8
    OLLAMA_KEEP_ALIVE: str = "-1"

    # RAG
    RAG_TOP_K: int = 10
    RAG_RERANK_TOP_N: int = 3

    # App
    APP_ENV: str = "development"
    APP_DEBUG: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Singleton instance yang dipakai di seluruh aplikasi
settings = get_settings()
