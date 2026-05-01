"""
backend/rag/search.py — Hybrid Search Engine (v2)
Menggabungkan semantic search (pgvector) + full-text search (tsvector)
menggunakan Reciprocal Rank Fusion (RRF).

Peningkatan v2:
- Query expansion: ekstrak keyword domain dari narasi sebelum embedding
- Dual-query FTS: coba simple config sebagai fallback jika indonesian gagal
"""
import asyncpg
from .embed import get_embedding
from config import settings

# Kata-kata stopword yang tidak informatif untuk FTS
_FTS_STOPWORDS = {
    "saya", "aku", "kamu", "dia", "kami", "kita", "mereka",
    "dan", "atau", "tapi", "yang", "ini", "itu", "ada", "bisa",
    "harus", "sudah", "baru", "dari", "untuk", "dengan", "mau",
    "ingin", "sangat", "juga", "lagi", "lalu", "karena", "agar",
    "belum", "tidak", "lebih", "kurang", "masih", "punya",
    "serta", "namun", "akan", "seperti", "apa", "siapa"
}

# Keyword domain karier yang dideteksi dari narasi → memperkuat embedding query
_DOMAIN_KEYWORDS = {
    # ── Teknologi & Perangkat Lunak ─────────────────────────────
    "python":           "python programming developer software engineer",
    "sql":              "sql database data analyst business intelligence",
    "backend":          "backend developer software engineer api rest",
    "frontend":         "frontend developer react vue javascript html css",
    "fullstack":        "fullstack developer web developer software engineer",
    "laravel":          "laravel php web developer backend",
    "php":              "php laravel web developer backend programmer",
    "javascript":       "javascript frontend developer react vue web",
    "android":          "android developer mobile kotlin java",
    "ios":              "ios developer mobile swift apple",
    "devops":           "devops cloud aws kubernetes ci/cd sre",
    "machine learning": "machine learning data science ai deep learning",
    "informatika":      "software developer programmer teknik informatika",
    "komputer":         "software developer programmer teknik komputer",
    "it support":       "it support technical support helpdesk sistem",
    # ── Analisis Data ────────────────────────────────────────────
    "data analyst":     "data analyst sql excel python visualization dashboard",
    "data":             "data analyst data engineer data science analytics",
    "power bi":         "power bi business intelligence data visualization",
    "tableau":          "tableau data visualization business intelligence analyst",
    "statistika":       "data analyst statistik riset kuantitatif python r",
    "visualisasi":      "data visualization analyst dashboard reporting",
    # ── Desain & Kreatif ─────────────────────────────────────────
    "ui ux":            "ui ux designer figma product design wireframe",
    "desain":           "graphic designer creative design visual",
    "figma":            "ui ux designer product designer figma prototype",
    "photoshop":        "graphic designer visual designer creative",
    "illustrator":      "graphic designer visual artist creative",
    "content writer":   "content writer copywriter creative writer",
    # ── Pemasaran Digital ────────────────────────────────────────
    "digital marketing": "digital marketing seo google ads social media campaign",
    "seo":              "seo specialist digital marketing content optimization",
    "social media":     "social media specialist digital marketing content creator",
    "google ads":       "google ads digital marketing ppc advertising campaign",
    "tiktok":           "social media content creator digital marketing",
    "instagram":        "social media specialist content creator marketing",
    # ── Bisnis & Administrasi ────────────────────────────────────
    "project management": "project manager manajemen proyek koordinasi agile scrum",
    "project manager":  "project manager pm scrum agile koordinasi tim bisnis",
    "bisnis":           "bisnis administrasi manajemen business development koordinasi",
    "manajemen":        "project manager business development manajemen bisnis",
    "koordinasi":       "project manager koordinasi tim manajemen operasional",
    "business development": "business development pengembangan bisnis partnership sales b2b",
    "administrasi":     "administrasi bisnis office manager sekretaris operasional",
    "operasional":      "operations manager general affairs administrasi bisnis",
    # ── Sales & Customer Service ─────────────────────────────────
    "sales":            "sales executive account manager business development negosiasi",
    "negosiasi":        "sales executive account manager business development deal",
    "customer service": "customer service cs call center helpdesk pelanggan",
    "pelanggan":        "customer service cs handling complaint pelanggan",
    "call center":      "call center customer service inbound outbound telepon",
    "closing":          "sales executive account manager penjualan target revenue",
    # ── Finance & Accounting ─────────────────────────────────────
    "akuntansi":        "accounting staff finance akuntan laporan keuangan",
    "akuntansi":        "accounting staff akuntan finance tax laporan keuangan",
    "accounting":       "accounting staff finance analyst laporan keuangan pajak",
    "keuangan":         "finance analyst accounting staff laporan keuangan anggaran",
    "audit":            "internal auditor accounting finance compliance risk",
    "pajak":            "tax staff accounting finance perpajakan compliance",
    "financial":        "finance analyst financial modeling excel keuangan",
    "laporan keuangan": "accounting staff finance analyst reporting keuangan",
    # ── Education & Training ─────────────────────────────────────
    "guru":             "guru teacher pengajar pendidikan mengajar kurikulum",
    "mengajar":         "teacher guru pengajar tutor pendidikan kelas",
    "tutor":            "tutor pengajar les privat pendidikan mengajar",
    "trainer":          "trainer training facilitator corporate learning development",
    "pelatihan":        "trainer training learning development facilitator",
    "instruktur":       "instruktur trainer pengajar pelatihan kursus",
}



def _expand_query(narrative: str) -> str:
    """
    Perkaya query dengan keyword domain yang terdeteksi dari narasi.
    Menggunakan word-boundary check untuk menghindari false positive
    (contoh: 'seorang' tidak boleh trigger keyword 'seo').
    """
    import re
    lower = narrative.lower()
    expansions = []
    
    for keyword, expansion in _DOMAIN_KEYWORDS.items():
        # Gunakan word boundary agar 'seorang' tidak match 'seo'
        # Multi-kata (mis. "data analyst") pakai contains biasa
        if " " in keyword:
            # Multi-word: cukup substring match
            if keyword in lower:
                expansions.append(expansion)
        else:
            # Single word: harus word boundary
            pattern = r'\b' + re.escape(keyword) + r'\b'
            if re.search(pattern, lower):
                expansions.append(expansion)

    if expansions:
        # Ambil unique, max 3 expansions
        unique_exp = list(dict.fromkeys(expansions))[:3]
        expanded = f"{narrative} | Domain: {' | '.join(unique_exp)}"
    else:
        expanded = narrative

    return expanded


def _build_fts_keywords(narrative: str) -> str:
    """
    Bersihkan narasi menjadi tsquery yang valid.
    Hanya ambil kata informatif (> 2 karakter, bukan stopword).
    """
    words = [
        w.strip(".,!?;:\"'()")
        for w in narrative.split()
        if len(w) > 2 and w.lower() not in _FTS_STOPWORDS
    ]
    # Batasi 5 kata agar tidak terlalu restrictive
    return " & ".join(words[:5])


async def hybrid_search(
    query: str,
    conn: asyncpg.Connection,
    cluster_filter: str = None,
    top_k: int = None
) -> list[dict]:
    """
    Hybrid Search v2: semantic + full-text dengan Reciprocal Rank Fusion (RRF).

    Args:
        query: narasi pengguna (teks bebas)
        conn: asyncpg connection
        cluster_filter: opsional, filter berdasarkan klaster karier
        top_k: jumlah kandidat yang dikembalikan (default dari settings)

    Returns:
        list of dict, sorted by RRF score descending
    """
    if top_k is None:
        top_k = settings.RAG_TOP_K

    # ── 0. Expand query untuk embedding yang lebih representatif ──
    # Hanya gunakan domain keywords jika terdeteksi (lebih presisi dari narasi panjang)
    expanded_query = _expand_query(query)
    if " | Domain: " in expanded_query:
        domain_part = expanded_query.split(" | Domain: ")[1]
        # Ambil 2 expansion terbaik saja
        domain_terms = " | ".join(domain_part.split(" | ")[:2])
        embedding_input = f"search_query: {domain_terms}"
    else:
        embedding_input = f"search_query: {query}"
    query_embedding = await get_embedding(embedding_input)

    # ── 1. Semantic Search via pgvector ──────────────────────────
    cluster_condition = "AND cluster = $3" if cluster_filter else ""
    params_semantic = [str(query_embedding), top_k]
    if cluster_filter:
        params_semantic.append(cluster_filter)

    semantic_results = await conn.fetch(
        f"""
        SELECT
            id, title, company, location, salary_text, skills, cluster,
            1 - (embedding <=> $1::vector) AS sim_score
        FROM knowledge_base
        WHERE embedding IS NOT NULL
          {cluster_condition}
        ORDER BY sim_score DESC
        LIMIT $2
        """,
        *params_semantic
    )

    # ── 2. Full-text Search via tsvector ─────────────────────────
    keywords = _build_fts_keywords(query)
    fulltext_results = []

    if keywords:
        # Coba config 'indonesian' dulu, fallback ke 'simple' jika gagal
        for fts_config in ("indonesian", "simple"):
            try:
                fulltext_results = await conn.fetch(
                    f"""
                    SELECT
                        id, title, company, location, salary_text, skills, cluster,
                        ts_rank(search_vector, to_tsquery('{fts_config}', $1)) AS fts_score
                    FROM knowledge_base
                    WHERE search_vector @@ to_tsquery('{fts_config}', $1)
                    ORDER BY fts_score DESC
                    LIMIT $2
                    """,
                    keywords, top_k
                )
                break  # Berhasil, keluar dari loop
            except Exception:
                continue  # Coba config berikutnya

    # ── 3. Reciprocal Rank Fusion (RRF) ──────────────────────────
    # Rumus standar: score(d) = Σ 1/(k + rank(d)), k=60
    k = 60
    rrf_scores: dict[int, float] = {}

    for rank, row in enumerate(semantic_results):
        doc_id = row["id"]
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (k + rank + 1)

    for rank, row in enumerate(fulltext_results):
        doc_id = row["id"]
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (k + rank + 1)

    # ── 4. Simpan sim_score ke semua_docs ────────────────────────
    all_docs: dict[int, dict] = {}
    for row in list(semantic_results) + list(fulltext_results):
        if row["id"] not in all_docs:
            all_docs[row["id"]] = dict(row)

    ranked_ids = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [
        all_docs[doc_id]
        for doc_id, _ in ranked_ids[:top_k]
        if doc_id in all_docs
    ]
