# Task 04 — Vector Embedding & Hybrid Search Engine

## 1. Latar Belakang Teoretis: Embedding dalam Arsitektur RAG

Dalam arsitektur **Retrieval-Augmented Generation (RAG)**, embedding berperan sebagai komponen **retriever** — jembatan yang menghubungkan query pengguna (teks bebas) dengan dokumen relevan di *Knowledge Base*.

```
┌────────────────────────────────────────────────────────────────┐
│                  ARSITEKTUR RAG NusaNara                       │
│                                                                │
│  Narasi Pengguna                                               │
│       │                                                        │
│       ▼                                                        │
│  ┌──────────────┐    ┌───────────────────────────────────┐    │
│  │   EMBEDDING  │    │         KNOWLEDGE BASE             │    │
│  │  (Retriever) │    │   720 lowongan × VECTOR(768)       │    │
│  │              │───►│                                    │    │
│  │ nomic-embed  │    │  Cosine Similarity + FTS (RRF)    │    │
│  │ -text-v2-moe │    └──────────────┬────────────────────┘    │
│  └──────────────┘                   │ Top-10 kandidat          │
│                                     ▼                          │
│                          ┌─────────────────┐                   │
│                          │   RE-RANKING    │                   │
│                          │  (Skill Match + │                   │
│                          │  Experience)    │                   │
│                          └────────┬────────┘                   │
│                                   │ Top-3 terpilih             │
│                                   ▼                            │
│                          ┌─────────────────┐                   │
│                          │   LLM (Llama 3) │                   │
│                          │   Generator     │                   │
│                          └────────┬────────┘                   │
│                                   │                            │
│                         Rekomendasi Karier                     │
└────────────────────────────────────────────────────────────────┘
```

---

## 2. Model Embedding: `nomic-embed-text-v2-moe`

Model di-*host* secara lokal menggunakan **Ollama** (`http://localhost:11434`), sehingga tidak ada data pengguna yang dikirim ke pihak ketiga.

| Properti | Detail |
|---|---|
| Arsitektur | Mixture of Experts (MoE) |
| Dimensi output | **768 dimensi** |
| Bahasa | Multilingual (termasuk Bahasa Indonesia) |
| Data latih BI | 36.4 juta pasang teks Bahasa Indonesia |
| Prefix dokumen | `search_document:` |
| Prefix query | `search_query:` |

**Kenapa MoE (Mixture of Experts)?**  
Model tidak mengaktifkan seluruh parameternya sekaligus. Fungsi *router* mengaktifkan "pakar" tertentu tergantung bahasa/domain input. Ini menghasilkan efisiensi komputasi tinggi sekaligus performa kompetitif pada teks Bahasa Indonesia.

**Kenapa prefix `search_document:` dan `search_query:`?**  
Model ini menggunakan arsitektur *asymmetric embedding* — representasi dokumen dan query dioptimalkan secara berbeda dalam ruang vektor yang sama. Prefix adalah instruksi ke model agar bobot internally dikalibrasi sesuai peran teks.

---

## 3. Proses Embedding Dokumen

**File:** `backend/scripts/embed_knowledge.py`

### A. Konstruksi Representasi Dokumen (Content Field)

Sebelum embedding, metadata terpisah digabung menjadi narasi koheren dengan prefix wajib:

```
search_document: Software Engineer di PT Tech Indonesia.
Lokasi: Jakarta Selatan, DKI Jakarta.
Gaji: Rp 8 jt-15 jt.
Klaster: Teknologi & Perangkat Lunak.
Konteks karier: software engineer, backend developer, API, Python, Node.js.
Keahlian: Python, Node.js, PostgreSQL, REST API.
Syarat: Minimal 1 tahun pengalaman.
```

Konteks karier spesifik per sub-peran ditambahkan untuk memperkaya representasi semantik (contoh: `"data scientist, machine learning, Python, model prediktif"` untuk posisi Data Scientist).

### B. Pemanggilan API Embedding

```python
async with httpx.AsyncClient(timeout=120) as client:
    response = await client.post(
        "http://localhost:11434/api/embeddings",
        json={"model": "nomic-embed-text-v2-moe", "prompt": content}
    )
    vector = response.json()["embedding"]  # List[float], len=768
```

Proses internal di dalam Ollama:
1. **Tokenisasi** — teks dipecah menjadi sub-kata (token)
2. **Self-Attention (Transformer)** — setiap token dihitung bobotnya relatif terhadap token lain
3. **Mean Pooling** — hidden states dirata-rata menghasilkan satu vektor 768 dimensi

### C. Penyimpanan ke PostgreSQL (pgvector)

```python
await conn.execute(
    "UPDATE knowledge_base SET content=$1, embedding=$2::vector WHERE id=$3",
    content, str(vector), row_id
)
```

Format `str(list)` Python menghasilkan `"[0.12, -0.45, ...]"` yang dikenali oleh operator `::vector` pgvector.

---

## 4. Matematika Pencarian Semantik

### Cosine Similarity

Saat retrieval, query pengguna di-embed menggunakan prefix `search_query:` lalu dibandingkan dengan setiap dokumen:

$$\text{Cosine Similarity}(Q, D) = \frac{Q \cdot D}{\|Q\| \times \|D\|} = \frac{\sum_{i=1}^{768} Q_i D_i}{\sqrt{\sum_{i=1}^{768} Q_i^2} \cdot \sqrt{\sum_{i=1}^{768} D_i^2}}$$

- Nilai **→ 1**: makna sangat mirip (sudut kecil)
- Nilai **→ 0**: tidak berkaitan (sudut 90°)
- Nilai **→ -1**: berlawanan makna (jarang pada text embeddings)

**Dipilih karena:** Fokus pada *arah* vektor (makna semantik), bukan *magnitudo* — lebih stabil untuk representasi teks berdimensi tinggi.

---

## 5. Hybrid Search (Semantic + Full-Text)

**File:** `backend/rag/search.py`

Sistem tidak hanya mengandalkan semantic search, tetapi menggunakan **Hybrid Search** dengan **Reciprocal Rank Fusion (RRF)**:

```
┌─────────────────┐    ┌─────────────────┐
│ SEMANTIC SEARCH │    │  FULL-TEXT (FTS) │
│  pgvector ANN   │    │    tsvector      │
│  VECTOR(768)    │    │   Indonesian/    │
│  sim DESC       │    │   simple config  │
└────────┬────────┘    └────────┬────────┘
         │                      │
         └──────────┬───────────┘
                    │
                    ▼
         ┌──────────────────┐
         │  RRF Fusion      │
         │  score(d) =      │
         │  Σ 1/(60 + rank) │
         └──────────────────┘
                    │
               Top-10 kandidat
```

**Reciprocal Rank Fusion:**
$$\text{RRF}(d) = \sum_{r \in \text{retrievers}} \frac{1}{k + \text{rank}(d, r)}, \quad k=60$$

Dokumen yang muncul tinggi di **kedua** sistem (semantic + FTS) mendapat skor RRF tertinggi.

### Query Expansion

Sebelum embedding, query pengguna diperkaya dengan **domain keywords** berbasis word-boundary matching:

```python
_DOMAIN_KEYWORDS = {
    "project management": "project manager manajemen proyek koordinasi agile scrum",
    "sales":              "sales executive account manager business development negosiasi",
    "guru":               "guru teacher pengajar pendidikan mengajar kurikulum",
    "audit":              "internal auditor accounting finance compliance risk",
    ...
}
```

Word boundary check (`\b`) mencegah false positive (contoh: kata "seorang" tidak boleh trigger keyword "seo").

---

## 6. Re-Ranking Pasca-Retrieval

**File:** `backend/rag/rerank.py`

Top-10 kandidat dari hybrid search di-re-rank menggunakan **Final Score** heuristik:

$$\text{Final Score} = \alpha \cdot \text{CosineSim}(Q,D) + \beta \cdot \text{SkillMatch}(S_u, S_d) + \gamma \cdot \text{ExperienceMatch}(E_u, E_d)$$

| Komponen | Bobot | Keterangan |
|---|---|---|
| CosineSimilarity | $\alpha = 0.60$ | Komponen utama (makna semantik) |
| SkillMatch | $\beta = 0.30$ | Jaccard Index overlap keahlian |
| ExperienceMatch | $\gamma = 0.10$ | Kesesuaian level pengalaman |

**SkillMatch (Jaccard Index):**

$$\text{SkillMatch} = \frac{|S_{user} \cap S_{job}|}{|S_{user} \cup S_{job}|}$$

Hasilnya: **Top-3 lowongan** paling relevan dikirim ke LLM sebagai context augmentation.

---

## 7. Output Tahap Embedding

Setelah semua 720 baris diproses:

| Metrik | Nilai |
|---|---|
| Total baris terembedded | **720** |
| Dimensi vektor | **768** |
| NULL embeddings | **0** |
| Format penyimpanan | `VECTOR(768)` via pgvector |
| Model | `nomic-embed-text-v2-moe` (local, via Ollama) |

---

## 8. Bug yang Ditemukan dan Diperbaiki

Selama pengembangan, ditemukan **bug kritis** pada pgvector ORDER BY:

**Bug:** `ORDER BY embedding <=> $1::vector` (cosine distance ASC) menggunakan IVFFlat index scan yang hanya mengembalikan sebagian kecil data (2-4 row dari 718).

**Penyebab:** pgvector IVFFlat index scan tidak melakukan *full table scan* saat menggunakan `<=>` operator langsung di ORDER BY.

**Fix:**
```python
# SEBELUM (bug):
ORDER BY embedding <=> $1::vector LIMIT $2

# SESUDAH (fix):
SELECT ..., 1 - (embedding <=> $1::vector) AS sim_score
ORDER BY sim_score DESC LIMIT $2
```

Menghitung similarity eksplisit lalu sort DESC memaksa full scan yang benar.
