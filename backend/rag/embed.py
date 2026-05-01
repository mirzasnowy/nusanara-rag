"""
backend/rag/embed.py — Wrapper untuk Ollama Embedding API
Menggunakan model nomic-embed-text v1.5 (768 dimensi, multilingual ID+EN).
"""
import httpx
from config import settings


async def get_embedding(text: str) -> list[float]:
    """
    Kirim teks ke Ollama nomic-embed-text.
    Return: vector 768 dimensi sebagai list[float].
    """
    async with httpx.AsyncClient(timeout=120) as client:
        response = await client.post(
            f"{settings.OLLAMA_BASE_URL}/api/embeddings",
            json={
                "model": settings.OLLAMA_EMBED_MODEL,
                "prompt": text,
            }
        )
        response.raise_for_status()
        return response.json()["embedding"]
