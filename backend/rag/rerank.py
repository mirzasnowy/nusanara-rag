"""
backend/rag/rerank.py — Reranking Top-10 → Top-3 (v2)
Re-score hasil hybrid search berdasarkan skill overlap dengan query.
Memastikan top_n yang masuk ke prompt LLM benar-benar paling relevan.

Peningkatan v2:
- Score threshold: dokumen dengan skor terlalu rendah dibuang
- Fallback: kembalikan list kosong jika tidak ada yang layak
"""
from config import settings

# Ambang batas minimum skor akhir. Dokumen di bawah ini dianggap "tidak relevan"
# Catatan: skor 0.25-0.35 adalah normal untuk cosine similarity pada embeddings lokal
SCORE_THRESHOLD = 0.25


def rerank(query: str, documents: list[dict], top_n: int = None) -> list[dict]:
    """
    Rerank dokumen berdasarkan skill overlap.

    Scoring:
    - 70% dari similarity/fts score (hasil hybrid search)
    - 30% dari skill overlap (berapa banyak kata di query cocok dengan skill dokumen)

    Args:
        query: narasi pengguna
        documents: list hasil hybrid_search
        top_n: jumlah yang dikembalikan (default dari settings)

    Returns:
        top_n dokumen yang melewati threshold, sorted by final_score descending.
        Bisa kosong jika semua dokumen di bawah threshold.
    """
    if top_n is None:
        top_n = settings.RAG_RERANK_TOP_N

    query_lower = query.lower()
    query_words = set(query_lower.split())

    for doc in documents:
        skills = [s.lower() for s in (doc.get("skills") or [])]

        # Hitung skill overlap: berapa banyak skill yang matching dengan kata di query
        skill_matches = sum(
            1 for skill in skills
            if any(
                word in skill or skill in word
                for word in query_words
                if len(word) > 2  # skip kata pendek seperti "di", "ke"
            )
        )
        doc["skill_matches"] = skill_matches

        # Normalisasi: max kontribusi 1.0 (tiap match memberi 25%)
        skill_bonus = min(skill_matches * 0.25, 1.0)

        # Base score dari hybrid search (gunakan sim_score preferably)
        base_score = doc.get("sim_score", doc.get("fts_score", 0.5))

        # Final score: 70% similarity + 30% skill overlap
        doc["final_score"] = (base_score * 0.70) + (skill_bonus * 0.30)

    ranked = sorted(documents, key=lambda x: x.get("final_score", 0), reverse=True)

    # Filter berdasarkan threshold minimum relevance
    filtered = [doc for doc in ranked[:top_n] if doc.get("final_score", 0) >= SCORE_THRESHOLD]

    return filtered
