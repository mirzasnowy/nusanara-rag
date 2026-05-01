# NusaNara — Sistem Bimbingan Karier Adaptif Berbasis RAG & LLM

> "Temukan Jalur Kariermu, Ceritakan Kisahmu"

**Muhammad Mirza Kurniawan | UNSIKA 2025**

---

## Tentang Proyek

NusaNara adalah sistem bimbingan karier adaptif yang menggunakan **Retrieval-Augmented Generation (RAG)** dan **Large Language Model (LLM)** untuk memberikan rekomendasi karier personal kepada siswa SMA/SMK dan mahasiswa Indonesia.

### Keunggulan Utama
- 🧠 **Adaptif** — sistem mengingat profil pengguna dari sesi ke sesi
- 📊 **Berbasis Data Nyata** — 476 lowongan dari Glints Indonesia
- 🔍 **Hybrid Search (RRF)** — gabungan semantic + full-text search
- 🇮🇩 **Lokal Indonesia** — konteks pasar kerja, gaji rupiah
- 🔒 **Aman** — Google OAuth via Clerk, JWT validation
- ⚡ **Streaming** — rekomendasi muncul huruf per huruf (SSE)

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript |
| Auth | Clerk (Google OAuth) |
| Backend | FastAPI (Python) |
| LLM | Ollama + Llama 3.1 8B Q4_K_M |
| Embedding | nomic-embed-text v1.5 |
| Database | PostgreSQL 16 + pgvector |
| Hosting FE | Vercel |
| Hosting BE | VPS Jakarta 16GB |

---

## Struktur Folder

```
nusanara/
├── backend/          ← FastAPI backend + RAG pipeline
├── frontend/         ← Next.js frontend
├── docs/             ← PRD dan dokumentasi teknis
└── data/             ← Data mentah (tidak di-commit)
```

---

## Quick Start (Local Development)

### Prasyarat
- Python 3.11+
- Node.js 18+
- Docker Desktop
- Ollama (jika RAM ≥ 12GB)

### Setup

```bash
# 1. Clone repo
git clone https://github.com/username/nusanara.git
cd nusanara

# 2. Jalankan PostgreSQL via Docker
docker run -d --name pg-nusanara \
  -e POSTGRES_DB=nusanara_dev \
  -e POSTGRES_USER=mirza \
  -e POSTGRES_PASSWORD=devpassword \
  -p 5432:5432 pgvector/pgvector:pg16

# 3. Setup backend
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt

# 4. Buat file .env
cp .env.example .env
# Edit .env sesuai kebutuhan

# 5. Inisialisasi database
psql -h localhost -U mirza -d nusanara_dev -f schema.sql

# 6. Jalankan backend
uvicorn main:app --reload --port 8000

# 7. Setup frontend (terminal baru)
cd ../frontend
npm install
npm run dev
```

### Cek Kesehatan Sistem

```bash
curl http://localhost:8000/health
# {"status":"ok","ollama":"ok","database":"ok"}
```

---

## Milestone Implementasi

| # | Milestone | Status |
|---|---|---|
| M1 | Setup local env (Docker, Ollama, Schema) | ⏳ |
| M2 | PostgreSQL MCP aktif | ⏳ |
| M3 | Data pipeline (scraping → embedding) | ⏳ |
| M4 | Backend FastAPI dasar | ⏳ |
| M5 | Hybrid search berfungsi | ⏳ |
| M6 | Adaptive profile | ⏳ |
| M7 | Streaming SSE | ⏳ |
| M8 | Frontend + Clerk auth | ⏳ |
| M9 | Deploy ke VPS | ⏳ |
| M10 | MVP siap evaluasi | ⏳ |

---

## Dokumentasi

- [`docs/PRD_NusaNara.md`](docs/PRD_NusaNara.md) — Product Requirements Document lengkap
- [`docs/Web_App_Design.md`](docs/Web_App_Design.md) — Desain UI/UX per halaman

---

*Skripsi — UNSIKA 2025 — Muhammad Mirza Kurniawan*
