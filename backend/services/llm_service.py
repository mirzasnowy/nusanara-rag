import json
import httpx
import asyncpg
from typing import AsyncGenerator

from config import settings
from rag.search import hybrid_search
from rag.rerank import rerank
from rag.prompt import build_prompt
from services.profile_service import get_full_profile
from services.db import get_pool

async def generate_recommendation_stream(narrative: str, user_id: str) -> AsyncGenerator[str, None]:
    """
    Fungsi generator untuk Server-Sent Events (SSE).
    Orkestrasi penuh dari RAG Pipeline: Search -> Rerank -> Prompt -> Stream LLM -> Save History.
    """
    try:
        # 1. Status awal
        msg_start = json.dumps({'content': '🔍 Menarik data profil dan mencari lowongan kerja yang relevan...\n'})
        yield f"data: {msg_start}\n\n"
        
        # Mulai block koneksi dari pool
        pool = get_pool()
        async with pool.acquire() as conn:
            # 2. Ambil profil user
            profile = await get_full_profile(user_id, conn)
            profile_text = profile.get("profile_summary", "") if profile else ""
            
            # 3. Lakukan Hybrid Search
            raw_docs = await hybrid_search(narrative, conn, top_k=settings.RAG_TOP_K)
            
            msg_rerank = json.dumps({'content': f'📊 Menemukan {len(raw_docs)} dokumen potensial. Melakukan re-ranking berbasis keahlian...\n'})
            yield f"data: {msg_rerank}\n\n"
            
            # 4. Rerank dokumen (Top-3)
            top_docs = rerank(narrative, raw_docs, top_n=settings.RAG_RERANK_TOP_N)
            
            msg_prompt = json.dumps({'content': '🧠 Menganalisis trade-off dan menyusun rekomendasi...\n\n'})
            yield f"data: {msg_prompt}\n\n"
            
            # 5. Bangun Prompt dengan Aturan Strict
            final_prompt = build_prompt(profile_text, narrative, top_docs)
            
            # 6. Eksekusi LLM Stream (Ollama)
            full_response = ""
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                request_body = {
                    "model": settings.OLLAMA_MODEL,
                    "prompt": final_prompt,
                    "stream": True,
                    "options": {
                        "temperature": 0.3,
                        "num_ctx": 8192,      # Lebih besar untuk RAG prompt panjang
                        "num_predict": 1500   # Batas token output agar tidak runaway
                    }
                }
                
                async with client.stream("POST", f"{settings.OLLAMA_BASE_URL}/api/generate", json=request_body) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if not line:
                            continue
                        chunk = json.loads(line)
                        text_chunk = chunk.get("response", "")
                        if text_chunk:
                            full_response += text_chunk
                            yield f"data: {json.dumps({'content': text_chunk})}\n\n"
                            
                        if chunk.get("done"):
                            break
            
            # 7. Simpan Riwayat Inferensi ke Database
            identified_positions = [doc["title"] for doc in top_docs]
            
            try:
                await conn.execute(
                    """
                    INSERT INTO recommendation_history 
                    (user_id, narrative_input, profile_at_time, retrieved_chunks, recommendation, identified_positions)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    """,
                    user_id, narrative, profile_text, json.dumps(top_docs), full_response, identified_positions
                )
            except Exception as db_err:
                # Jika foreign key gagal (user tidak ada), log error tapi jangan crash stream
                print(f"Failed to log recommendation history: {db_err}")
        
        # 8. Sinyal penutup
        yield "data: [DONE]\n\n"
        
    except Exception as e:
        msg_err = json.dumps({'content': f'\n\n❌ Terjadi kesalahan pada pipeline RAG: {str(e)}'})
        yield f"data: {msg_err}\n\n"
        yield "data: [DONE]\n\n"
