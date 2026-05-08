# Task 06 — Backend API & Pengujian End-to-End RAG

## 1. Tujuan

Mengekspos pipeline RAG (Query Expansion → Embedding → Hybrid Search → Re-rank → LLM Generation) sebagai **REST API** berbasis FastAPI yang dapat dikonsumsi frontend. Pada tahap ini, seluruh pipeline diuji secara end-to-end dan dipastikan berjalan dengan output yang valid.

**Framework:** FastAPI (Python) + Uvicorn (ASGI)  
**Status:** ✅ Telah diuji dan berjalan — semua 7 kriteria output terpenuhi  
**File utama:** `backend/main.py`, `backend/api/routes/`, `backend/services/llm_service.py`

---

## 2. Arsitektur Backend

```
┌──────────────────────────────────────────────────────────┐
│                    FastAPI Backend                        │
│                                                          │
│  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐ │
│  │ /api/       │   │ /api/        │   │ /health      │ │
│  │ recommend   │   │ history      │   │ (GET)        │ │
│  │ (POST/SSE)  │   │ (GET/POST)   │   │ DB + Ollama  │ │
│  └──────┬──────┘   └──────┬───────┘   └──────────────┘ │
│         │                  │                              │
│         ▼                  ▼                              │
│  ┌──────────────────────────────────────────────────┐   │
│  │               RAG Pipeline (llm_service.py)       │   │
│  │                                                   │   │
│  │  1. narrative → _expand_query()                   │   │
│  │  2. → get_embedding() → VECTOR(768)               │   │
│  │  3. → hybrid_search() → top-10 (RRF)             │   │
│  │  4. → rerank() → top-3                            │   │
│  │  5. → build_prompt() → LLM stream                │   │
│  │  6. → save recommendation_history                 │   │
│  └──────────────────────────────────────────────────┘   │
│         │                              │                  │
│         ▼                              ▼                  │
│  ┌──────────────┐            ┌──────────────┐           │
│  │ PostgreSQL   │            │   Ollama     │           │
│  │ + pgvector   │            │ llama3.1     │           │
│  │ (asyncpg)    │            │ nomic-embed  │           │
│  └──────────────┘            └──────────────┘           │
└──────────────────────────────────────────────────────────┘
```

---

## 3. Endpoint Utama

### A. `GET /health` — Health Check

Memeriksa konektivitas ke PostgreSQL dan Ollama sebelum menerima traffic:

```bash
curl http://localhost:8001/health
# → {"status":"ok","ollama":"ok","database":"ok"}
```

### B. `POST /api/recommend` — Rekomendasi Karier (SSE Streaming)

Inti sistem RAG. Mengeksekusi pipeline lengkap dan mengalirkan respons LLM token per token.

**Request:**
```json
{
  "narrative": "Saya fresh graduate S1 SI, mahir Excel dan SQL, pernah buat dashboard Power BI. Ingin berkarier sebagai data analyst."
}
```

**Pipeline internal (dieksekusi berurutan):**
```
narrative
  ↓ _expand_query()         ← Domain keyword injection (word-boundary check)
expanded_query
  ↓ get_embedding()         ← nomic-embed-text-v2-moe, prefix "search_query:"
query_vector [768 dim]
  ↓ hybrid_search(top_k=10) ← Semantic (pgvector) + FTS (tsvector) via RRF
10 kandidat
  ↓ rerank(top_n=3)         ← 0.70×CosSim + 0.30×SkillBonus
3 top docs
  ↓ build_prompt()          ← 5-section Decision Intelligence prompt
final_prompt
  ↓ Ollama llama3.1         ← stream=True, num_ctx=8192, temp=0.3
SSE token stream → client
  ↓ save to recommendation_history table
  ↓ asyncio.create_task(extract_and_update_profile) ← NON-BLOCKING background
```

**Response format:** `text/event-stream`
```
data: {"content": "🔍 Menarik data profil..."}
data: {"content": "📊 Menemukan 10 dokumen..."}
data: {"content": "🧠 Menganalisis trade-off..."}
data: {"content": "## 1. 🌟 Analisis Profil..."}
data: {"content": "Pengguna memiliki latar belakang..."}
...
data: [DONE]
```

### C. `GET /api/history` & `POST /api/history`

CRUD riwayat percakapan per user. Menyimpan: `narrative_input`, `retrieved_chunks`, `recommendation`, `identified_positions[]`.

### D. `GET/PUT /api/profile`

Profil adaptif pengguna — digunakan sebagai konteks tambahan pada prompt LLM di sesi berikutnya.

---

## 4. Autentikasi: Clerk JWT

Implementasi menggunakan **PyJWT + PyJWKClient** yang mem-fetch JWKS dari Clerk secara otomatis:

```python
# backend/api/middleware/auth.py
async def get_current_user(credentials: HTTPAuthorizationCredentials) -> str:
    # Development bypass (APP_ENV=development + token="TEST_TOKEN")
    if settings.APP_ENV == "development" and credentials.credentials == "TEST_TOKEN":
        return "user_dev_test"
    
    # Production: validasi JWT Clerk via RS256
    signing_key = jwks_client.get_signing_key_from_jwt(token)
    payload = jwt.decode(token, signing_key.key, algorithms=["RS256"])
    return payload["sub"]  # Clerk user ID
```

JWKS di-cache di `_jwks_client` agar tidak fetch setiap request.

---

## 5. Prompt Template LLM — Decision Intelligence

Prompt dirancang sebagai **Explainable AI** — bukan hanya generator teks motivasi:

**5 Section Output Wajib:**
```
## 1. 🌟 Analisis Profil & Trade-off (Analytical Reasoning)
## 2. 💼 Rekomendasi Keputusan (Top Posisi)
     → Traceability: Skor RAG + Overlap Skill (wajib sebut angka)
     → Confidence Score: Tinggi/Menengah/Rendah
     → Action Plan (7 Hari)
## 3. 🔍 Analisis Skill Gap Objektif
## 4. 📚 Rencana Pengembangan Skill
## 5. 🇮🇩 Insight Pasar Kerja Lokal
```

**Strict Constraints (anti-halusinasi):**
- LLM hanya boleh merekomendasikan posisi yang ada di `top-3 docs`
- Setiap rekomendasi WAJIB menyebut Skor RAG dan Overlap Skill secara eksplisit
- Jika profil tidak cocok dengan data → wajib sebut mismatch, tidak boleh pura-pura cocok

---

## 6. Hasil Pengujian End-to-End (Aktual)

**Query uji:**
> *"Saya fresh graduate S1 Sistem Informasi, mahir Excel dan SQL, pernah buat dashboard Power BI. Ingin berkarier sebagai data analyst."*

**Hasil pipeline:**
- Hybrid search menemukan **10 dokumen** dari cluster Analisis Data
- Re-ranking memilih Top-3: Data Analyst (Bwbyaz), BI & Strategic Data Analyst (Waschen Alora), Business Intelligence (SwipeRx)
- LLM berhasil mengutip **Skor RAG** dan **Overlap Skill** secara eksplisit

**Validasi 7 Kriteria Output:**

| Kriteria | Hasil | Detail |
|---|:-:|---|
| Struktur: Analisis Profil | ✅ | Section `## 1. 🌟 Analisis Profil` muncul |
| Struktur: Rekomendasi | ✅ | 3 rekomendasi lengkap dengan detail |
| Traceability: Skor RAG | ✅ | *"Dipilih karena skor RAG 0,51..."* |
| Traceability: Overlap Skill | ✅ | *"...overlap skill 3/4 cocok pada Python dan SQL"* |
| Faithfulness: Judul dari DB | ✅ | Semua judul identik dengan entri di DB |
| Streaming TTFB | ✅ | **2.4 detik** (target < 10s) |
| Bahasa Indonesia | ✅ | Output konsisten BI |

**Metrik performa:**
```
TTFB (Time To First Byte) : 2.4 detik
Total durasi              : ~185 detik (termasuk LLM generation 1500 token)
Panjang output            : ~4000 karakter
```

---

## 7. Bug yang Ditemukan dan Diperbaiki

| Bug | Penyebab | Fix |
|---|---|---|
| `UnicodeEncodeError` saat startup | Print karakter `✓`/`✗` di Windows CP1252 | Ganti ke `[OK]`/`[ERR]` di `db.py` |
| Ollama 500 Internal Server Error | `num_ctx=4096` tidak cukup untuk RAG prompt (system + 3 docs + narrative) | Naikkan `num_ctx: 4096 → 8192` di `llm_service.py` |

---

## 8. Cara Menjalankan

```bash
# 1. Pastikan Ollama berjalan (llama3.1 + nomic-embed-text-v2-moe tersedia)
ollama serve

# 2. Pastikan Docker PostgreSQL aktif
docker start pg-nusanara

# 3. Jalankan FastAPI
cd backend/
venv\Scripts\uvicorn.exe main:app --port 8000 --host 0.0.0.0

# 4. Cek health
curl http://localhost:8000/health
# → {"status":"ok","ollama":"ok","database":"ok"}

# 5. Test recommend endpoint (bypass Clerk auth untuk dev)
curl -X POST http://localhost:8000/api/recommend ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer TEST_TOKEN" ^
  -d "{\"narrative\": \"Saya ahli Python dan SQL, ingin karier di data\"}" ^
  --no-buffer

# Atau gunakan script test:
python scripts/_test_api.py
```

**Script test tersedia:** `backend/scripts/_test_api.py`  
Menjalankan 2 query uji (Data Analyst + Education) dengan validasi 7 kriteria otomatis.

---

## 7. Adaptive Profile System (Enhancement Layer)

### 7.1 Posisi dalam Arsitektur

Adaptive Profile System adalah **modul personalisasi opsional** yang memperkaya `user_profiles` secara bertahap dari setiap interaksi. Modul ini **tidak memblokir** pipeline RAG utama dan berjalan sepenuhnya di *background*.

```
User Input
   │
   ├──► [FAST PATH — tidak berubah]           ← 0ms added latency
   │    Embed → Hybrid Search → Rerank
   │    → LLM Stream → SSE Response
   │
   └──► [BACKGROUND TASK — setelah [DONE]]   ← non-blocking
        asyncio.create_task(...)
            ↓
        LLM Extractor Agent
        (structured JSON output)
            ↓
        skills = UNION(old, new)
        interests = UNION(old, new)
        profile_summary = REPLACE
            ↓
        UPDATE user_profiles
```

> **Desain filosofi:** *Solve 80% of the problem with 20% complexity.*  
> Sistem ini sengaja dibuat sederhana — tidak ada multi-layer memory, tidak ada synthesis LLM atas seluruh riwayat. Sistem yang kompleks (episodic memory, time-decay) dicadangkan sebagai *future work*.

### 7.2 Extractor Agent

**File:** `services/memory_service.py`

LLM yang sama (Llama 3.1) digunakan dalam dua peran berbeda:

| Peran | Prompt | Output |
|---|---|---|
| **Main RAG Agent** | Decision Intelligence prompt (5 section) | Teks rekomendasi streaming |
| **Extractor Agent** | JSON extraction prompt (strict) | Structured JSON |

**Prompt Extractor Agent:**
```
Dari narasi pengguna di bawah, ekstrak informasi dalam format JSON STRICT.
→ Output wajib: {"skills": [...], "interests": [...], "summary_update": "..."}
→ TANPA teks lain di luar JSON
→ Jika tidak ada info relevan, kembalikan array kosong
```

**Contoh output JSON:**
```json
{
  "skills": ["Figma", "Adobe XD"],
  "interests": ["Desain & Kreatif"],
  "summary_update": "Mahasiswa DKV semester 5 yang mahir Figma dan Adobe XD dengan pengalaman desain UI."
}
```

### 7.3 Update Logic (Deterministik)

Update profil dilakukan tanpa LLM — murni operasi set:

```python
# services/memory_service.py — _update_profile()
merged_skills    = list(old_skills | set(new_skills))    # UNION — tidak ada yang hilang
merged_interests = list(old_interests | set(new_interests))  # UNION
profile_summary  = summary  # REPLACE — selalu pakai ringkasan terbaru
```

**Properti penting:**
- **Akumulatif:** Skill lama tidak pernah hilang ketika skill baru ditambahkan
- **Deterministik:** Tidak ada randomness dalam proses merge
- **Idempoten:** Menjalankan dua kali dengan input yang sama tidak mengubah hasilnya

### 7.4 Integrasi ke `llm_service.py`

Hanya **1 baris tambahan** di akhir pipeline, setelah sinyal `[DONE]` disiapkan:

```python
# llm_service.py — setelah save recommendation_history
asyncio.create_task(
    extract_and_update_profile(user_id, narrative, pool)
)
yield "data: [DONE]\n\n"  # ← dikirim ke client tanpa menunggu background task
```

### 7.5 Tabel Komponen

| Komponen | File | Fungsi |
|---|---|---|
| `extract_and_update_profile()` | `memory_service.py` | Entry point background task |
| `_call_extractor()` | `memory_service.py` | LLM call (non-streaming, JSON) |
| `_update_profile()` | `memory_service.py` | UNION merge + UPDATE DB |
| `asyncio.create_task()` | `llm_service.py` | Fire-and-forget trigger |
| `user_profiles` | `schema.sql` | Tabel penyimpanan (sudah ada) |

### 7.6 Future Work (Tidak Diimplementasi)

Sistem dirancang agar mudah dikembangkan ke:
- **Episodic memory** — tabel `episodic_memories` (append-only, setiap sesi)
- **Multi-LLM architecture** — Extractor Agent yang lebih ringan (misal: LLaMA 3.2 3B)
- **Weighted skill tracking** — bobot skill berdasarkan frekuensi sebutan
- **Time-aware decay** — skill lama diberi bobot lebih kecil
