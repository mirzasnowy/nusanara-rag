from fastapi import APIRouter, Depends
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

from api.middleware.auth import get_current_user

router = APIRouter()

class RecommendRequest(BaseModel):
    narrative: str

@router.post("/recommend")
async def get_recommendation(
    request: RecommendRequest,
    user_id: str = Depends(get_current_user)
):
    """
    Endpoint utama untuk menerima narasi karir pengguna dan memberikan
    rekomendasi secara streaming (Server-Sent Events) menggunakan Ollama RAG.
    """
    from services.llm_service import generate_recommendation_stream
    
    return StreamingResponse(
        generate_recommendation_stream(request.narrative, user_id),
        media_type="text/event-stream"
    )
