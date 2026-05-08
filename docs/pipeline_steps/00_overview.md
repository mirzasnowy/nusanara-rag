# NusaNara — Ringkasan Pipeline & Arsitektur Sistem RAG

## Gambaran Umum

NusaNara adalah sistem rekomendasi karier berbasis **Retrieval-Augmented Generation (RAG)** yang memanfaatkan data lowongan kerja aktual dari Glints Indonesia sebagai *Knowledge Base*. Sistem menggunakan model embedding lokal dan LLM lokal, sehingga tidak bergantung pada API berbayar eksternal.

---

## Pipeline 8 Tahap

```
┌──────────────────────────────────────────────────────────────────────┐
│               PIPELINE PEMBANGUNAN SISTEM NusaNara                   │
│                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐ │
│  │ TASK 01  │──►│ TASK 02  │──►│ TASK 03  │──►│    TASK 04       │ │
│  │ Scraping │   │ Cleaning │   │ DB Import│   │ Embedding +      │ │
│  │ Glints   │   │ +Cluster │   │ PostgreSQL│   │ Hybrid Search    │ │
│  │          │   │ Labeling │   │ pgvector │   │ + Re-ranking     │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────────────┘ │
│  720 lowongan   720 cleaned    DB: 720 rows    embedding VECTOR(768) │
│  8×90 cluster   content field  VECTOR(768)     sim_score ORDER BY   │
│  raw_jobs_      cleaned_jobs   NULL emb        DESC fix applied      │
│  final.csv      .csv           filled          MRR=0.842 P@3=0.733  │
│                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐ │
│  │ TASK 05  │──►│ TASK 06  │──►│ TASK 07  │──►│    TASK 08       │ │
│  │ Evaluasi │   │ Backend  │   │ Frontend │   │ Deployment       │ │
│  │ RAG      │   │ API      │   │ Next.js  │   │ VPS + Vercel     │ │
│  │ (P@k,MRR)│   │ FastAPI  │   │ + Clerk  │   │ + Nginx + SSL    │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────────────┘ │
│  MRR=0.842      /recommend     SSE streaming   pg_dump migrate      │
│  P@3=0.733      SSE + JWT      real-time       systemd daemon       │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Teknologi Stack

| Layer | Teknologi | Peran |
|---|---|---|
| **Scraping** | Selenium + selenium-stealth | Web scraping SPA berbasis React |
| **Processing** | Pandas, Python RegEx | Cleaning, normalisasi, inferensi |
| **Database** | PostgreSQL 16 + pgvector | Vector storage + FTS |
| **Infrastruktur** | Docker | Isolasi container PostgreSQL |
| **Embedding** | nomic-embed-text-v2-moe via Ollama | Local semantic embedding 768D |
| **Retrieval** | pgvector (cosine sim) + tsvector FTS | Hybrid search (RRF fusion) |
| **Re-ranking** | Python heuristik | Skill/experience weighted scoring |
| **LLM** | Llama 3.1 via Ollama | RAG Generator + Extractor Agent |
| **Adaptive Profile** | `memory_service.py` (async background) | Ekstraksi skill/minat dari narasi user |
| **Backend** | FastAPI + asyncpg + uvicorn | REST API + SSE streaming |
| **Auth** | Clerk (JWT) | Manajemen sesi pengguna |
| **Frontend** | Next.js 14 + TypeScript | UI percakapan + dashboard |
| **Deployment** | VPS Ubuntu + Nginx + Vercel | Produksi hybrid |

---

## Statistik Knowledge Base

| Metrik | Nilai |
|---|---|
| Total lowongan | **720** |
| Jumlah klaster | **8** |
| Lowongan per klaster | **90 (balanced)** |
| Dimensi vektor | 768 |
| Model embedding | nomic-embed-text-v2-moe |
| NULL embeddings | 0 |

### 8 Klaster Karier

| # | Klaster | Contoh Posisi |
|---|---|---|
| 1 | Teknologi & Perangkat Lunak | Software Engineer, Web Dev, IT Support |
| 2 | Analisis Data | Data Analyst, Business Intelligence, Data Scientist |
| 3 | Desain & Kreatif | Graphic Designer, UI/UX Designer, Content Writer |
| 4 | Pemasaran Digital | Digital Marketing, SEO, Social Media Specialist |
| 5 | Bisnis & Administrasi | Project Manager, Business Development |
| 6 | Sales & Customer Service | Sales Executive, Customer Service, Call Center |
| 7 | Finance & Accounting | Accounting Staff, Finance Analyst, Auditor |
| 8 | Education & Training | Guru, Tutor, Trainer, Instruktur |

---

## Hasil Evaluasi Retrieval (Ringkasan)

| Metrik | Tanpa Reranking | Dengan Reranking |
|---|:-:|:-:|
| P@1 | 0.700 | **0.750** |
| P@3 | 0.700 | **0.733** |
| P@5 | 0.710 | 0.710 |
| MRR | 0.800 | **0.842** |

> Evaluasi dilakukan pada 20 query uji yang mencakup semua 8 klaster. MRR 0.842 berarti rata-rata dokumen relevan pertama ditemukan di posisi 1.19 dari Top-k hasil.

---

## Konfirmasi: Ini adalah Sistem RAG Murni

Sistem NusaNara memenuhi seluruh komponen arsitektur RAG standar:

1. ✅ **Knowledge Base** — 720 dokumen lowongan tersimpan di PostgreSQL dengan pgvector
2. ✅ **Retriever** — Hybrid Search (Semantic + FTS) mengambil Top-10 kandidat
3. ✅ **Re-ranker** — Skill + Experience scoring menyaring ke Top-3
4. ✅ **Generator** — Llama 3.1 menggunakan Top-3 sebagai *context augmentation*
5. ✅ **Query Expansion** — Domain keywords memperkuat representasi embedding query
6. ✅ **Faithfulness Constraint** — System prompt memaksa LLM hanya gunakan context retrieval

Tidak ada informasi yang "dikarang" oleh LLM — seluruh rekomendasi didasarkan pada lowongan yang benar-benar ada dalam database.

> **Adaptive Profile System (Enhancement Layer):** Sistem juga memiliki modul personalisasi opsional yang berjalan sebagai *background task* — LLM berperan sebagai Extractor Agent untuk mengekstrak skill/minat dari narasi user dan memperkaya `user_profiles`. Modul ini tidak memblokir pipeline RAG dan tidak berdampak pada latensi. Lihat `services/memory_service.py` dan `06_backend_api.md` §7.

---

## Indeks File Dokumentasi

| File | Isi |
|---|---|
| `00_overview.md` | Ringkasan pipeline, tech stack, statistik KB, RAG confirmation |
| `01_scraping.md` | Web scraping Glints, Selenium, multi-phase top-up |
| `02_cleaning.md` | Data cleaning, cluster labeling, content formulation |
| `03_import_db.md` | Database schema, Docker, pgvector, 720 distribution |
| `04_embedding.md` | Embedding, hybrid search, RRF, re-ranking, bug fix |
| `05_rag_evaluation.md` | Ground truth, P@k, MRR, iterative improvement, hasil |
| `06_backend_api.md` | FastAPI, SSE streaming, Clerk JWT, LLM prompt, Adaptive Profile System |
| `07_frontend_development.md` | Next.js 14, SSE client, Clerk middleware, dashboard |
| `08_vps_deployment.md` | VPS, Nginx, Systemd, UFW, SSL, pg_dump, Vercel |

---

## Artefak Data (Lampiran Skripsi)

### Dataset (`data/`)

| File | Ukuran | Keterangan |
|---|---|---|
| `raw_jobs_final.csv` | ~281 KB | Data mentah scraping — arsip, jangan diedit |
| `cleaned_jobs.csv` | ~266 KB | Dataset final 720 lowongan — **digunakan sebagai KB** |

### Evaluasi (`backend/evaluation/`)

| File | Keterangan |
|---|---|
| `eval_summary_final.csv` | Tabel P@1, P@3, P@5, MRR — **salin ke Bab 4** |
| `eval_detail_final.csv` | Detail top-5 retrieved per-query — lampiran |
| `ground_truth.json` | 20 query uji + graded relevance (skor 0–3) — lampiran |

