# PRODUCT REQUIREMENTS DOCUMENT
# NusaNara — Sistem Bimbingan Karier Adaptif Berbasis RAG & LLM
**Versi 2.0 — Optimized Architecture**
Muhammad Mirza Kurniawan | UNSIKA 2025

---

## Daftar Isi
1. [Ringkasan Eksekutif](#1-ringkasan-eksekutif)
2. [Arsitektur Sistem Final](#2-arsitektur-sistem-final)
3. [Tech Stack & Justifikasi](#3-tech-stack--justifikasi)
4. [Database Schema Lengkap](#4-database-schema-lengkap)
5. [PostgreSQL MCP — AI Agent untuk Database](#5-postgresql-mcp--ai-agent-untuk-database)
6. [Environment: Local Dev vs VPS Production](#6-environment-local-dev-vs-vps-production)
7. [Implementasi RAG: Detail Teknis](#7-implementasi-rag-detail-teknis)
8. [Perubahan dari Arsitektur Skripsi Lama](#8-perubahan-dari-arsitektur-skripsi-lama)
9. [Struktur Folder Project](#9-struktur-folder-project)
10. [Milestone Implementasi](#10-milestone-implementasi)
11. [Kontribusi Teknis untuk Skripsi](#11-kontribusi-teknis-untuk-skripsi)

---

## 1. Ringkasan Eksekutif

Dokumen ini adalah Product Requirements Document (PRD) komprehensif untuk **NusaNara** — artefak utama penelitian skripsi tentang bimbingan karier adaptif berbasis Retrieval-Augmented Generation (RAG) dan Large Language Model (LLM).

### Tujuan Dokumen
- Menggantikan arsitektur awal (ChromaDB + Firestore + Gemini API cloud) dengan arsitektur yang lebih optimal, efisien, dan sesuai konteks infrastruktur yang tersedia.
- Mendefinisikan secara detail **apa yang dikerjakan di local development** dan **apa yang berjalan di VPS production**.
- Mengintegrasikan **PostgreSQL MCP** agar AI coding agent (Claude Code) dapat langsung berinteraksi dengan database via natural language.
- Menyediakan roadmap implementasi teknis yang dapat langsung dieksekusi.

### Perbandingan Arsitektur Lama vs Baru

| Aspek | Arsitektur Lama | Arsitektur Baru | Keuntungan |
|---|---|---|---|
| LLM | Google Gemini API (cloud) | Ollama 8B lokal di VPS | Tidak ada biaya API, unlimited |
| Vector DB | ChromaDB (terpisah) | pgvector di PostgreSQL | Satu DB, lebih sederhana |
| Auth | Manual custom | Clerk (Google OAuth) | Built-in, 5 menit setup |
| Profile Store | Firestore (NoSQL cloud) | PostgreSQL (lokal VPS) | Full control, no cost |
| Retrieval | Pure semantic search | Hybrid (semantic + keyword) | Akurasi lebih tinggi |
| Dev Tools | Manual DB interaction | PostgreSQL MCP + Claude Code | AI agent update DB langsung |

---

## 2. Arsitektur Sistem Final

### 2.1 Gambaran Arsitektur Keseluruhan

Sistem NusaNara dibagi menjadi tiga layer utama:

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1: CLIENT (Vercel — Gratis)                          │
│  Next.js 14 + React + Clerk Auth (Google OAuth)             │
│  Deploy otomatis dari GitHub, CDN global                    │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS API calls + JWT Token
┌───────────────────────▼─────────────────────────────────────┐
│  LAYER 2: SERVER (VPS Jakarta 16GB RAM)                     │
│                                                             │
│  FastAPI (Backend + RAG Orchestrator)                       │
│  ├── Auth Middleware (validasi JWT dari Clerk)              │
│  ├── RAG Pipeline (hybrid search + reranking)              │
│  ├── Profile Service (adaptive memory)                     │
│  └── Streaming Response (token demi token ke frontend)     │
│                                                             │
│  Ollama (LLM Inference)                                     │
│  ├── llama3.1:8b-instruct-q4_K_M (generasi narasi)        │
│  └── nomic-embed-text-v2-moe (embedding query + dokumen)  │
│                                                             │
│  PostgreSQL 16 + pgvector                                   │
│  ├── knowledge_base (476 lowongan + vector embedding)      │
│  ├── user_profiles  (adaptive memory per user)             │
│  └── recommendation_history (riwayat sesi)                 │
└─────────────────────────────────────────────────────────────┘
                        │ (dev tools only)
┌───────────────────────▼─────────────────────────────────────┐
│  LAYER 3: DEV TOOLING                                       │
│  PostgreSQL MCP ← Claude Code query/update DB langsung     │
│  via natural language saat development                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Alur Kerja RAG (Request Lifecycle)

Alur lengkap dari saat pengguna mengirim narasi hingga mendapat rekomendasi:

```
User kirim narasi
    ↓
[1] Next.js frontend → POST /recommend (narasi + JWT token)
    ↓
[2] FastAPI: validasi JWT via Clerk JWKS
    ↓
[3] Profile Service: ambil user_profile_summary dari PostgreSQL
    "Contoh: mahasiswa 20thn, minat programming, ikut olimpiade"
    ↓
[4] Embedding: nomic-embed-text-v2-moe embed (profil_lama + narasi_baru)
    (Menggunakan prefix `search_query: `)
    ↓
[5] Hybrid Search di pgvector:
    ├── Semantic search (cosine similarity via ivfflat index)
    └── Full-text search (tsvector/tsquery Bahasa Indonesia)
    → Reciprocal Rank Fusion → top 10 kandidat
    ↓
[6] Reranking: filter top 10 → top 3 paling relevan
    (berdasarkan skill overlap + similarity score)
    ↓
[7] Prompt Assembly: profil + konteks top3 → Final Prompt 5-in-1
    ↓
[8] Ollama llama3.1:8b generate narasi (streaming)
    ↓
[9] FastAPI stream token ke frontend (Server-Sent Events)
    ↓
[10] Parallel: update user_profile_summary (adaptive memory)
     + simpan ke recommendation_history
    ↓
User melihat rekomendasi muncul huruf per huruf ✓
```

---

## 3. Tech Stack & Justifikasi

| Layer | Teknologi | Versi | Justifikasi |
|---|---|---|---|
| Frontend | Next.js + React | 14 (App Router) | SSR, TypeScript, deploy ke Vercel gratis |
| Auth | Clerk | latest | Google OAuth built-in, JWT, 10k MAU gratis, integrasi Next.js 5 menit |
| Backend | FastAPI (Python) | 0.110+ | Async native, streaming SSE, ekosistem ML terlengkap |
| LLM Inferensi | Ollama + Llama 3.1 | 8B Q4_K_M | Gratis, unlimited, no rate limit, pakai ~5-6GB RAM |
| Embedding | nomic-embed-text-v2-moe | latest | SoTA Multilingual (Dilatih dengan 36.4M pasang teks ID), MoE architecture, sangat optimal untuk RAG Bahasa Indonesia |
| Database | PostgreSQL 16 | + pgvector 0.7 | Satu DB untuk relasional + vector, ACID, production-grade |
| Vector Search | pgvector ivfflat | extension | Native di PostgreSQL, tidak perlu DB terpisah |
| Full-text Search | PostgreSQL FTS | built-in | tsvector/tsquery, support konfigurasi Bahasa Indonesia |
| Dev Tools | PostgreSQL MCP | latest | Claude Code bisa query/insert/update DB via natural language |
| Hosting FE | Vercel | free tier | CDN global, deploy dari GitHub, gratis untuk project skripsi |
| Hosting BE | VPS Jakarta 16GB | KVM/Dedicated IP | Ollama butuh RAM besar, lokal Indonesia latency rendah |
| Process Mgr | Systemd | built-in Linux | Keep FastAPI + Ollama tetap berjalan sebagai daemon |
| Reverse Proxy | Nginx | latest | SSL termination, routing /api ke FastAPI, serve HTTPS |

---

## 4. Database Schema Lengkap

### 4.1 Ekstensi yang Dibutuhkan

```sql
-- Jalankan sekali saat setup PostgreSQL
CREATE EXTENSION IF NOT EXISTS vector;      -- pgvector untuk embedding
CREATE EXTENSION IF NOT EXISTS unaccent;    -- normalisasi teks (é → e)
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- trigram similarity (opsional)
```

### 4.2 Tabel `knowledge_base`

Menyimpan 476 data lowongan dari Glints beserta embedding vector untuk semantic search.

```sql
CREATE TABLE knowledge_base (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(200)   NOT NULL,
    company         VARCHAR(200),
    location        VARCHAR(200),
    salary_text     VARCHAR(100),
    salary_min      INTEGER,          -- untuk filtering gaji
    salary_max      INTEGER,
    requirements    TEXT,
    skills          TEXT[],           -- array: ['Python', 'SQL', 'ML']
    cluster         VARCHAR(50),      -- 'Teknologi', 'Kreatif', dst
    experience_min  INTEGER DEFAULT 0,
    content         TEXT NOT NULL,    -- teks gabungan untuk embedding (prefix: search_document:)
    embedding       VECTOR(768),      -- nomic-embed-text-v2-moe output dimension
    search_vector   TSVECTOR,         -- untuk full-text search
    date_posted     VARCHAR(50),
    source_url      VARCHAR(500),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Index untuk vector similarity search (cosine)
CREATE INDEX idx_kb_embedding
    ON knowledge_base
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);
-- Catatan: lists = sqrt(jumlah_baris) adalah aturan umum. Untuk 476 baris, 50 sudah cukup.

-- Index untuk full-text search
CREATE INDEX idx_kb_fts
    ON knowledge_base
    USING GIN (search_vector);

-- Index untuk filtering per klaster karier
CREATE INDEX idx_kb_cluster ON knowledge_base (cluster);

-- Trigger: otomatis update search_vector saat insert/update
CREATE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := to_tsvector('indonesian',
        coalesce(NEW.title, '')       || ' ' ||
        coalesce(array_to_string(NEW.skills, ' '), '') || ' ' ||
        coalesce(NEW.location, '')    || ' ' ||
        coalesce(NEW.requirements, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_kb_search_vector
    BEFORE INSERT OR UPDATE ON knowledge_base
    FOR EACH ROW EXECUTE FUNCTION update_search_vector();
```

**Format kolom `content` (yang akan di-embed):**
```sql
-- Buat content yang informatif untuk embedding
-- Contoh isi kolom content:
-- "Data Scientist di PT Neural Technologies Indonesia. Lokasi: Jakarta Selatan.
--  Gaji: Rp 8jt-15jt. Pengalaman: 1-3 tahun, S1.
--  Skills: Python, SQL, Machine Learning, TensorFlow, Deep Learning.
--  Klaster: Analisis Data."
```

### 4.3 Tabel `user_profiles`

Menyimpan profil adaptif pengguna yang diperbarui setiap sesi — ini adalah inti dari fitur "adaptif" NusaNara.

```sql
CREATE TABLE user_profiles (
    user_id              VARCHAR(200) PRIMARY KEY,  -- Clerk user ID (format: user_xxxx)
    email                VARCHAR(200),
    full_name            VARCHAR(200),
    profile_summary      TEXT,          -- ringkasan naratif terkini hasil summarization LLM
    identified_skills    TEXT[],        -- skill yang terdeteksi dari narasi
    career_interests     TEXT[],        -- minat karier yang terdeteksi
    education_level      VARCHAR(50),   -- 'SMA', 'SMK', 'Mahasiswa', 'Lulus'
    preferred_location   VARCHAR(100),
    preferred_clusters   TEXT[],        -- klaster yang sering dicari
    session_count        INTEGER DEFAULT 0,
    last_active          TIMESTAMP,
    created_at           TIMESTAMP DEFAULT NOW(),
    updated_at           TIMESTAMP DEFAULT NOW()
);

-- Trigger: otomatis update updated_at
CREATE FUNCTION update_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trig_profile_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

### 4.4 Tabel `recommendation_history`

Menyimpan seluruh riwayat rekomendasi untuk fitur melihat riwayat, analisis evaluasi, dan pre/post-test.

```sql
CREATE TABLE recommendation_history (
    id                   SERIAL PRIMARY KEY,
    user_id              VARCHAR(200) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
    narrative_input      TEXT NOT NULL,     -- narasi yang dikirim user
    profile_at_time      TEXT,              -- snapshot profil saat itu (untuk analisis)
    retrieved_chunks     JSONB,             -- dokumen top-3 yang diambil RAG (untuk evaluasi akurasi retrieval)
    recommendation       TEXT NOT NULL,     -- output lengkap dari LLM
    identified_positions TEXT[],            -- posisi karier yang direkomendasikan
    response_time_ms     INTEGER,           -- untuk evaluasi performa sistem
    tokens_generated     INTEGER,           -- jumlah token yang di-generate
    created_at           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rh_user_id  ON recommendation_history (user_id);
CREATE INDEX idx_rh_created  ON recommendation_history (created_at DESC);
```

### 4.5 Query Berguna untuk Evaluasi Skripsi

```sql
-- Cek distribusi knowledge base per cluster
SELECT cluster, COUNT(*) as jumlah
FROM knowledge_base
GROUP BY cluster ORDER BY jumlah DESC;

-- Cek berapa dokumen sudah ter-embed
SELECT
    COUNT(*) as total,
    COUNT(embedding) as sudah_embed,
    COUNT(*) - COUNT(embedding) as belum_embed
FROM knowledge_base;

-- Rata-rata response time (untuk bab evaluasi)
SELECT
    AVG(response_time_ms) as avg_ms,
    MIN(response_time_ms) as min_ms,
    MAX(response_time_ms) as max_ms,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_ms) as median_ms
FROM recommendation_history;

-- User dengan sesi terbanyak (untuk analisis penggunaan)
SELECT u.email, u.session_count, u.profile_summary
FROM user_profiles u
ORDER BY session_count DESC;

-- Test hybrid search manual (berguna saat development)
SELECT id, title, company,
       1 - (embedding <=> '[0.1, 0.2, ...]'::vector) as similarity
FROM knowledge_base
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

---

## 5. PostgreSQL MCP — AI Agent untuk Database

### 5.1 Apa itu PostgreSQL MCP?

MCP (Model Context Protocol) adalah protokol yang memungkinkan AI coding agent seperti **Claude Code** terhubung langsung ke tools eksternal — termasuk database PostgreSQL. Dengan MCP aktif, kamu bisa **bicara dalam bahasa natural** kepada Claude Code untuk melakukan operasi database tanpa menulis SQL manual.

**Contoh penggunaan PostgreSQL MCP:**
- "Tambahkan 10 data lowongan Data Analyst baru ke knowledge_base"
- "Tampilkan user_profiles yang sudah punya lebih dari 3 sesi"
- "Update cluster untuk semua job title yang mengandung kata 'Data' menjadi 'Analisis Data'"
- "Cek apakah semua baris di knowledge_base sudah punya embedding"
- "Buat query untuk tes hybrid search dengan input 'saya suka programming Python'"
- "Hapus recommendation_history yang lebih dari 30 hari"

### 5.2 Setup PostgreSQL MCP di Local Development

**Langkah 1: Install Claude Code (jika belum)**
```bash
npm install -g @anthropic-ai/claude-code
```

**Langkah 2: Jalankan PostgreSQL lokal via Docker**
```bash
docker run -d \
  --name nusanara-postgres \
  -e POSTGRES_DB=nusanara_dev \
  -e POSTGRES_USER=mirza \
  -e POSTGRES_PASSWORD=devpassword123 \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

**Langkah 3: Buat file `.mcp.json` di root project**
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://mirza:devpassword123@localhost:5432/nusanara_dev"
      ]
    }
  }
}
```

> ⚠️ **Penting:** Tambahkan `.mcp.json` ke `.gitignore` jika berisi password. Atau gunakan environment variable di connection string.

**Langkah 4: Jalankan Claude Code dari folder project**
```bash
cd /path/to/nusanara
claude   # Claude Code otomatis baca .mcp.json
```

**Langkah 5: Verifikasi MCP aktif**
```
/mcp
# Harus muncul "postgres" di list dengan status connected
```

### 5.3 Contoh Workflow Harian dengan MCP

**Skenario: setelah selesai scraping dan cleaning data**

```bash
# Di terminal biasa: jalankan script embedding
$ python scripts/embed_knowledge.py
# Output: "Embedding 476 dokumen... selesai dalam 12 menit"

# Di Claude Code (dengan MCP aktif):
Kamu:   "Berapa baris yang sudah ter-embed?"

Claude: SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NOT NULL;
        → Hasil: 476 dari 476 baris ✓

Kamu:   "Tampilkan distribusi per cluster"

Claude: SELECT cluster, COUNT(*) FROM knowledge_base GROUP BY cluster;
        → Teknologi: 102, Kreatif: 102, Data: 68, Pemasaran: 102, Bisnis: 102

Kamu:   "Ada yang clusternya NULL? Update otomatis berdasarkan keyword title"

Claude: UPDATE knowledge_base
        SET cluster = CASE
            WHEN title ILIKE '%data%'       THEN 'Analisis Data'
            WHEN title ILIKE '%designer%'   THEN 'Desain & Kreatif'
            WHEN title ILIKE '%developer%'  THEN 'Teknologi'
            WHEN title ILIKE '%marketing%'  THEN 'Pemasaran Digital'
            ELSE 'Bisnis & Administrasi'
        END
        WHERE cluster IS NULL;
        → 0 baris ter-update (semua sudah ter-assign) ✓

Kamu:   "Test query semantic search untuk kata 'saya suka desain grafis'"
        (Claude Code akan generate embedding dulu lalu query pgvector)
```

---

## 6. Environment: Local Dev vs VPS Production

### 6.1 Filosofi Pembagian Environment

> **Aturan utama:** Semua development dan eksperimen di lokal. VPS hanya menjalankan apa yang sudah jadi dan stabil. JANGAN pernah coding langsung di VPS.

| | Local Development (Laptop) | VPS Jakarta 16GB (Production) |
|---|---|---|
| **Tujuan** | Coding, testing, debugging, eksperimen | Menjalankan aplikasi yang sudah stabil |
| **Kode** | Edit bebas, iterasi cepat | Deploy dari GitHub via `git pull` |
| **Database** | PostgreSQL di Docker (data dev) | PostgreSQL native (data production) |
| **LLM** | Ollama lokal (jika RAM ≥12GB) atau skip (mock) | Ollama permanen, always running |
| **Embedding** | nomic-embed-text via Ollama lokal | nomic-embed-text di VPS |
| **MCP** | ✅ PostgreSQL MCP aktif untuk Claude Code | ❌ Tidak perlu (bukan dev environment) |
| **Auth** | Clerk development keys (test mode) | Clerk production keys |
| **Frontend** | `next dev` (port 3000) | Di Vercel (auto deploy dari GitHub) |
| **Backend** | `uvicorn --reload` (port 8000) | `uvicorn` via Systemd (port 8000) |
| **SSL** | Tidak perlu (localhost) | Nginx + Certbot (HTTPS wajib) |

---

### 6.2 Yang Dikerjakan di Local Development

> ⚠️ Semua pekerjaan coding dilakukan di sini. Jangan edit kode langsung di VPS.

#### 6.2.1 Setup Awal Local Dev (Sekali)

```bash
# 1. Clone repository
git clone https://github.com/username/nusanara.git
cd nusanara

# 2. Setup Python environment (backend)
cd backend
python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows
pip install -r requirements.txt

# 3. Setup Node.js environment (frontend)
cd ../frontend
npm install

# 4. Jalankan PostgreSQL via Docker
docker run -d --name pg-nusanara \
  -e POSTGRES_DB=nusanara_dev \
  -e POSTGRES_USER=mirza \
  -e POSTGRES_PASSWORD=devpassword \
  -p 5432:5432 pgvector/pgvector:pg16

# 5. Inisialisasi schema database
psql -h localhost -U mirza -d nusanara_dev -f backend/schema.sql

# 6. Install Ollama (jika RAM laptop ≥ 12GB)
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull llama3.1:8b-instruct-q4_K_M   # ~4.7GB
ollama pull nomic-embed-text               # ~274MB

# Jika RAM laptop < 12GB: skip Ollama di lokal.
# Gunakan mock response untuk development frontend,
# atau develop backend tanpa jalankan LLM (test endpoint saja).

# 7. Buat file .env
cp backend/.env.example backend/.env
nano backend/.env   # isi semua nilai
```

#### 6.2.2 File `.env` untuk Local Development

```env
# backend/.env  —  JANGAN commit ke git!

# ── Database ──────────────────────────────────────
DATABASE_URL=postgresql://mirza:devpassword@localhost:5432/nusanara_dev

# ── Clerk (ambil dari dashboard.clerk.com — Development keys) ──
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
CLERK_JWKS_URL=https://your-app.clerk.accounts.dev/.well-known/jwks.json

# ── Ollama ────────────────────────────────────────
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b-instruct-q4_K_M
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_NUM_THREAD=8              # sesuaikan dengan CPU laptop

# ── Config RAG ────────────────────────────────────
RAG_TOP_K=10                     # ambil top 10 dari hybrid search
RAG_RERANK_TOP_N=3               # filter ke top 3 untuk masuk prompt
OLLAMA_KEEP_ALIVE=-1             # model tidak pernah di-unload dari RAM

# ── App ───────────────────────────────────────────
APP_ENV=development
APP_DEBUG=true
```

**File `.env` untuk frontend (Next.js):**
```env
# frontend/.env.local  —  JANGAN commit ke git!

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxx
NEXT_PUBLIC_API_URL=http://localhost:8000
```

#### 6.2.3 Workflow Harian Local Dev

```bash
# Terminal 1: Backend FastAPI
cd backend && source venv/bin/activate
uvicorn main:app --reload --port 8000
# --reload: otomatis restart saat ada perubahan kode

# Terminal 2: Frontend Next.js
cd frontend
npm run dev
# Buka http://localhost:3000

# Terminal 3: Claude Code + MCP (untuk operasi database)
cd nusanara      # root project (ada .mcp.json di sini)
claude           # MCP PostgreSQL otomatis aktif

# Terminal 4: Ollama (jika belum running sebagai service)
OLLAMA_KEEP_ALIVE=-1 OLLAMA_NUM_THREAD=8 ollama serve

# Terminal 5: Docker PostgreSQL check (opsional)
docker logs pg-nusanara -f
```

#### 6.2.4 Pipeline Data Lengkap (Dilakukan Sekali di Lokal)

Ini adalah urutan kerja dari data mentah sampai siap dipakai sistem RAG:

```bash
# STEP 1: Web Scraping dari Glints
python scripts/scraper_glints.py
# Output: data/raw_jobs.csv (476 baris data mentah)

# STEP 2: Cleaning & Strukturisasi Data
python scripts/clean_jobs.py
# Output: data/cleaned_jobs.csv (terstruktur, kolom lengkap)

# STEP 3: Import ke PostgreSQL (tanpa embedding dulu)
python scripts/import_to_db.py
# Membaca cleaned_jobs.csv dan INSERT ke tabel knowledge_base

# Verifikasi via MCP (di Claude Code):
# Kamu: "Cek berapa baris di knowledge_base, tampilkan 5 sampel"

# STEP 4: Generate Embedding (PROSES PALING LAMA ~10-15 menit)
python scripts/embed_knowledge.py
# Untuk setiap baris: kirim content ke nomic-embed-text → simpan vector ke DB
# Progres ditampilkan per baris

# STEP 5: Verifikasi final via MCP
# Kamu: "Semua baris sudah punya embedding? Ada yang NULL?"

# STEP 6: Export database untuk VPS
pg_dump -h localhost -U mirza nusanara_dev \
  --no-owner --no-privileges \
  -f data/nusanara_production.sql

# STEP 7: Compress dan upload ke VPS
gzip data/nusanara_production.sql
scp data/nusanara_production.sql.gz root@VPS_IP:/tmp/
```

#### 6.2.5 Testing Endpoint Backend

```bash
# Test endpoint recommend (tanpa JWT dulu untuk development)
curl -X POST http://localhost:8000/recommend \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TEST_TOKEN" \
  -d '{
    "narrative": "Saya mahasiswa informatika semester 6, suka coding Python dan sering ikut hackathon. Nilai terbaik saya di mata kuliah Machine Learning."
  }'

# Test hybrid search langsung
curl http://localhost:8000/debug/search?q=data+scientist+python

# Test embedding endpoint
curl -X POST http://localhost:8000/debug/embed \
  -H "Content-Type: application/json" \
  -d '{"text": "data scientist python machine learning"}'

# Cek health semua service
curl http://localhost:8000/health
# Response: {"status":"ok","ollama":"ok","database":"ok"}
```

---

### 6.3 Yang Dikerjakan di VPS Production

> ⚠️ VPS adalah tempat MENJALANKAN aplikasi — bukan tempat coding. Semua perubahan kode masuk via `git pull`. Akses VPS hanya untuk deploy, monitoring, dan troubleshooting kritis.

#### 6.3.1 Setup VPS — Dilakukan Sekali di Awal

```bash
# ── SSH ke VPS ──────────────────────────────────────────────────
ssh root@IP_VPS_JAKARTA

# ── Update sistem ────────────────────────────────────────────────
apt update && apt upgrade -y
apt install -y git nginx certbot python3-certbot-nginx \
               python3.11 python3.11-venv python3-pip curl wget htop

# ── Install PostgreSQL 16 + pgvector ─────────────────────────────
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update
apt install -y postgresql-16 postgresql-16-pgvector

systemctl enable postgresql
systemctl start postgresql

# Setup user dan database
sudo -u postgres psql << 'EOF'
CREATE USER mirza WITH PASSWORD 'GANTI_DENGAN_PASSWORD_KUAT';
CREATE DATABASE nusanara OWNER mirza;
\c nusanara
CREATE EXTENSION vector;
CREATE EXTENSION unaccent;
\q
EOF

# ── Install Ollama ───────────────────────────────────────────────
curl -fsSL https://ollama.ai/install.sh | sh

# Setup Ollama sebagai systemd service (agar tetap berjalan)
cat > /etc/systemd/system/ollama.service << 'EOF'
[Unit]
Description=Ollama LLM Service
After=network.target

[Service]
ExecStart=/usr/local/bin/ollama serve
Environment=OLLAMA_KEEP_ALIVE=-1
Environment=OLLAMA_NUM_THREAD=4
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable ollama
systemctl start ollama

# Tunggu Ollama ready, lalu pull model
sleep 5
ollama pull llama3.1:8b-instruct-q4_K_M   # ~4.7GB, butuh 10-20 menit
ollama pull nomic-embed-text               # ~274MB

# Verifikasi model ter-load
curl http://localhost:11434/api/tags
# Harus muncul kedua model di atas

# ── Clone project ────────────────────────────────────────────────
git clone https://github.com/username/nusanara.git /opt/nusanara

# Setup backend
cd /opt/nusanara/backend
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Buat file .env production
cat > /opt/nusanara/backend/.env << 'EOF'
DATABASE_URL=postgresql://mirza:PASSWORD_KUAT@localhost:5432/nusanara
CLERK_SECRET_KEY=sk_live_xxxxxxxxxxxx
CLERK_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxx
CLERK_JWKS_URL=https://your-app.clerk.accounts.dev/.well-known/jwks.json
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b-instruct-q4_K_M
OLLAMA_EMBED_MODEL=nomic-embed-text
OLLAMA_NUM_THREAD=4
OLLAMA_KEEP_ALIVE=-1
RAG_TOP_K=10
RAG_RERANK_TOP_N=3
APP_ENV=production
APP_DEBUG=false
EOF

# ── Import database dari local ───────────────────────────────────
gunzip /tmp/nusanara_production.sql.gz
psql -h localhost -U mirza -d nusanara < /tmp/nusanara_production.sql
echo "Import selesai"

# Verifikasi data masuk
psql -h localhost -U mirza -d nusanara \
  -c "SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NOT NULL;"
# Harus: 476

# ── Setup FastAPI sebagai systemd service ─────────────────────────
cat > /etc/systemd/system/nusanara.service << 'EOF'
[Unit]
Description=NusaNara FastAPI Backend
After=network.target postgresql.service ollama.service

[Service]
WorkingDirectory=/opt/nusanara/backend
ExecStart=/opt/nusanara/backend/venv/bin/uvicorn main:app \
          --host 0.0.0.0 \
          --port 8000 \
          --workers 2
Restart=always
RestartSec=3
User=root
EnvironmentFile=/opt/nusanara/backend/.env

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable nusanara
systemctl start nusanara

# Cek status
systemctl status nusanara   # harus Active (running)

# ── Setup Nginx ──────────────────────────────────────────────────
cat > /etc/nginx/sites-available/nusanara << 'EOF'
server {
    listen 80;
    server_name api.nusanara-skripsi.my.id;   # ganti dengan domain kamu

    # Penting untuk streaming SSE
    proxy_buffering off;
    proxy_cache off;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 120s;   # timeout lebih panjang untuk LLM
    }
}
EOF

ln -s /etc/nginx/sites-available/nusanara /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# ── Setup SSL gratis dengan Certbot ──────────────────────────────
certbot --nginx -d api.nusanara-skripsi.my.id
# Ikuti instruksi, masukkan email, pilih redirect to HTTPS
```

#### 6.3.2 RAM Budget VPS setelah Setup

```
VPS RAM Total: 16GB
├── OS + System           ~1.0 GB
├── PostgreSQL 16         ~0.5 GB
├── Ollama daemon         ~0.3 GB
├── Llama 3.1 8B (model)  ~5.5 GB  ← paling besar
├── nomic-embed-text      ~0.3 GB
├── FastAPI (2 workers)   ~0.4 GB
├── Nginx                 ~0.1 GB
└── Buffer/headroom       ~7.9 GB  ← sangat aman
```

#### 6.3.3 Workflow Deploy — Setiap Ada Update Kode

```bash
# ── Di laptop: commit dan push ───────────────────────────────────
git add .
git commit -m "feat: tambah reranking logic berdasarkan skill overlap"
git push origin main

# ── Di VPS: pull dan restart ─────────────────────────────────────
ssh root@IP_VPS

cd /opt/nusanara
git pull origin main

# Jika ada perubahan requirements.txt
source backend/venv/bin/activate
pip install -r backend/requirements.txt

# Restart service
systemctl restart nusanara

# Verifikasi berhasil
systemctl status nusanara
curl http://localhost:8000/health
```

#### 6.3.4 Monitoring Harian di VPS

```bash
# Status semua service sekaligus
systemctl status nusanara ollama postgresql nginx

# Log realtime FastAPI (untuk debug)
journalctl -u nusanara -f

# Monitor RAM (pastikan model tidak OOM)
watch -n 3 free -h

# Cek Ollama dan model yang ter-load
curl http://localhost:11434/api/tags | python3 -m json.tool

# PostgreSQL: cek koneksi aktif
psql -h localhost -U mirza -d nusanara \
  -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Cek disk usage
df -h
du -sh /opt/nusanara /var/lib/postgresql
```

---

## 7. Implementasi RAG: Detail Teknis

### 7.1 Script `embed_knowledge.py`

Dijalankan **sekali** di lokal setelah data masuk ke PostgreSQL, sebelum di-export ke VPS.

```python
# backend/scripts/embed_knowledge.py
import asyncio
import asyncpg
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")
DATABASE_URL = os.getenv("DATABASE_URL")


async def get_embedding(text: str, client: httpx.AsyncClient) -> list[float]:
    """Kirim teks ke Ollama nomic-embed-text, return vector 768 dimensi."""
    response = await client.post(
        f"{OLLAMA_URL}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
        timeout=30
    )
    return response.json()["embedding"]


def build_content(row: dict) -> str:
    """Gabungkan field-field menjadi teks untuk di-embed."""
    skills_str = ", ".join(row.get("skills") or [])
    return (
        f"{row['title']} di {row.get('company', '')}. "
        f"Lokasi: {row.get('location', '')}. "
        f"Gaji: {row.get('salary_text', 'Tidak Ditampilkan')}. "
        f"Pengalaman: {row.get('requirements', '')}. "
        f"Skills: {skills_str}. "
        f"Klaster: {row.get('cluster', '')}."
    )


async def embed_all():
    conn = await asyncpg.connect(DATABASE_URL)

    # Ambil semua baris yang belum punya embedding
    rows = await conn.fetch(
        "SELECT id, title, company, location, salary_text, "
        "requirements, skills, cluster "
        "FROM knowledge_base WHERE embedding IS NULL"
    )

    total = len(rows)
    print(f"Akan embed {total} dokumen...")

    async with httpx.AsyncClient() as client:
        for i, row in enumerate(rows, 1):
            content = build_content(dict(row))

            # Update kolom content dulu (bermanfaat untuk debug)
            await conn.execute(
                "UPDATE knowledge_base SET content = $1 WHERE id = $2",
                content, row["id"]
            )

            # Generate embedding
            embedding = await get_embedding(content, client)

            # Simpan embedding ke database
            # asyncpg perlu list of float, bukan string
            await conn.execute(
                "UPDATE knowledge_base SET embedding = $1 WHERE id = $2",
                embedding, row["id"]
            )

            print(f"  [{i}/{total}] ✓ ID {row['id']}: {row['title']}")

    await conn.close()
    print(f"\nSelesai! {total} dokumen sudah ter-embed.")


if __name__ == "__main__":
    asyncio.run(embed_all())
```

### 7.2 Hybrid Search Engine

```python
# backend/rag/search.py
import asyncpg
from .embed import get_embedding


async def hybrid_search(
    query: str,
    conn: asyncpg.Connection,
    cluster_filter: str = None,
    top_k: int = 10
) -> list[dict]:
    """
    Gabungkan semantic search (pgvector) + full-text search (tsvector)
    menggunakan Reciprocal Rank Fusion (RRF).
    """
    # 1. Embed query
    query_embedding = await get_embedding(
        f"Rekomendasi karier untuk: {query}"  # prefix membantu embedding
    )

    # 2. Semantic Search via pgvector
    cluster_condition = "AND cluster = $3" if cluster_filter else ""
    params_semantic = [query_embedding, top_k]
    if cluster_filter:
        params_semantic.append(cluster_filter)

    semantic_results = await conn.fetch(f"""
        SELECT
            id, title, company, location, salary_text, skills, cluster,
            1 - (embedding <=> $1::vector) AS sim_score
        FROM knowledge_base
        WHERE embedding IS NOT NULL
          {cluster_condition}
        ORDER BY embedding <=> $1::vector
        LIMIT $2
    """, *params_semantic)

    # 3. Full-text Search via tsvector
    # Bersihkan query, ambil kata-kata kunci, jadikan tsquery
    keywords = " & ".join(
        word for word in query.split()
        if len(word) > 2  # skip kata sangat pendek
    )[:50]  # batasi panjang

    fulltext_results = []
    if keywords:
        try:
            fulltext_results = await conn.fetch("""
                SELECT
                    id, title, company, location, salary_text, skills, cluster,
                    ts_rank(search_vector, to_tsquery('indonesian', $1)) AS fts_score
                FROM knowledge_base
                WHERE search_vector @@ to_tsquery('indonesian', $1)
                ORDER BY fts_score DESC
                LIMIT $2
            """, keywords, top_k)
        except Exception:
            # tsquery bisa error jika keyword tidak valid
            pass

    # 4. Reciprocal Rank Fusion (RRF)
    # Rumus RRF: score(d) = Σ 1/(k + rank(d))  dengan k=60 (konstanta standar)
    k = 60
    rrf_scores = {}

    for rank, row in enumerate(semantic_results):
        doc_id = row["id"]
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (k + rank + 1)

    for rank, row in enumerate(fulltext_results):
        doc_id = row["id"]
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (k + rank + 1)

    # 5. Gabungkan semua kandidat unik
    all_docs = {}
    for row in list(semantic_results) + list(fulltext_results):
        if row["id"] not in all_docs:
            all_docs[row["id"]] = dict(row)

    # 6. Sort berdasarkan RRF score, ambil top_k
    ranked_ids = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    return [
        all_docs[doc_id]
        for doc_id, _ in ranked_ids[:top_k]
        if doc_id in all_docs
    ]
```

### 7.3 Reranking

```python
# backend/rag/rerank.py

def rerank(query: str, documents: list[dict], top_n: int = 3) -> list[dict]:
    """
    Re-score dokumen hasil hybrid search berdasarkan skill overlap.
    Memastikan top_n yang masuk ke prompt benar-benar paling relevan.
    """
    query_lower = query.lower()
    query_words = set(query_lower.split())

    for doc in documents:
        skills = [s.lower() for s in (doc.get("skills") or [])]

        # Hitung overlap antara kata di query dengan skill dokumen
        skill_matches = sum(
            1 for skill in skills
            if any(word in skill or skill in word for word in query_words if len(word) > 2)
        )
        # Normalisasi: max kontribusi 30%
        skill_bonus = min(skill_matches * 0.08, 0.30)

        # Base score dari hybrid search (sim_score atau fts_score)
        base_score = doc.get("sim_score", doc.get("fts_score", 0.5))

        # Final score: 70% similarity + 30% skill overlap
        doc["final_score"] = (base_score * 0.70) + (skill_bonus * 0.30)

    # Sort descending, ambil top_n
    ranked = sorted(documents, key=lambda x: x["final_score"], reverse=True)
    return ranked[:top_n]
```

### 7.4 Prompt Template 5-in-1

```python
# backend/rag/prompt.py

def build_prompt(
    user_profile: str,
    narrative: str,
    context_docs: list[dict]
) -> str:
    """
    Bangun prompt final yang menggabungkan:
    - Profil adaptif pengguna (dari sesi sebelumnya)
    - Narasi baru pengguna
    - Top-3 konteks lowongan dari RAG
    Menghasilkan rekomendasi 5-in-1 sesuai prioritas fitur survei.
    """

    # Format konteks dokumen
    context_text = ""
    for i, doc in enumerate(context_docs, 1):
        skills_str = ", ".join(doc.get("skills") or [])
        context_text += f"""
[{i}] Posisi   : {doc['title']}
     Perusahaan: {doc.get('company', 'N/A')} | Lokasi: {doc.get('location', 'N/A')}
     Gaji      : {doc.get('salary_text') or 'Tidak Ditampilkan'}
     Skills    : {skills_str}
"""

    profile_text = user_profile or "Pengguna baru — belum ada data profil sebelumnya."

    return f"""Kamu adalah NusaNara, konselor karier AI yang hangat dan profesional untuk pemuda Indonesia.
Kamu memahami konteks pendidikan dan pasar kerja lokal Indonesia.
Gunakan bahasa Indonesia yang personal, suportif, dan memotivasi.
Hindari respons generik. Hubungkan langsung dengan detail yang pengguna ceritakan.

═══════════════════════════════════════
PROFIL PENGGUNA (dari interaksi sebelumnya):
{profile_text}

NARASI TERBARU PENGGUNA:
{narrative}

DATA LOWONGAN RELEVAN DARI GLINTS INDONESIA:
{context_text}
═══════════════════════════════════════

Berikan rekomendasi komprehensif dengan format berikut:

## 1. 🌟 Narasi Jalur Karier
[Tulis 2-3 paragraf yang personal dan spesifik. Hubungkan latar belakang
dan cerita pengguna dengan peluang karier nyata. Gunakan nama atau detail
yang mereka sebutkan. Buat mereka merasa dipahami.]

## 2. 💼 Rekomendasi Posisi (Top 3)
[Untuk setiap posisi dari data di atas, jelaskan:
- Nama posisi & alasan spesifik mengapa cocok dengan profil mereka
- Estimasi gaji & lokasi berdasarkan data nyata
- Langkah konkret: apa yang harus dilakukan minggu ini untuk melamar]

## 3. 🔍 Analisis Skill Gap
[Skill yang sudah dimiliki vs skill yang masih perlu dikembangkan.
Spesifik berdasarkan requirement di data lowongan.]

## 4. 📚 Rencana Pengembangan Skill
[3-5 rekomendasi belajar konkret dengan platform, estimasi waktu,
dan urutan prioritas. Contoh: "Mulai dengan Python di Dicoding — 4 minggu"]

## 5. 🇮🇩 Insight Pasar Kerja Lokal
[Insight tentang kondisi pasar kerja Indonesia untuk karier yang direkomendasikan.
Gunakan data dari lowongan yang ditemukan (lokasi, gaji range, tren skill).]"""
```

### 7.5 Adaptive Profile Update

```python
# backend/services/profile_service.py
import asyncpg
from .llm_service import call_llm_simple


async def get_profile(user_id: str, conn: asyncpg.Connection) -> str:
    """Ambil ringkasan profil pengguna dari database."""
    row = await conn.fetchrow(
        "SELECT profile_summary FROM user_profiles WHERE user_id = $1",
        user_id
    )
    return row["profile_summary"] if row else ""


async def update_profile(
    user_id: str,
    old_profile: str,
    new_narrative: str,
    conn: asyncpg.Connection
) -> str:
    """
    Perbarui profil pengguna dengan menggabungkan profil lama + narasi baru.
    Ini adalah inti dari fitur 'adaptif' NusaNara.
    """

    if not old_profile:
        # Sesi pertama: buat profil baru dari narasi
        summarize_prompt = f"""
Buat ringkasan profil singkat (2-3 kalimat) dari narasi berikut.
Fokus pada: latar belakang pendidikan, skills, minat, dan pengalaman.

Narasi: {new_narrative}

Ringkasan (mulai langsung tanpa kata pembuka):"""
    else:
        # Sesi berikutnya: gabungkan profil lama dengan info baru
        summarize_prompt = f"""
Update ringkasan profil pengguna dengan informasi terbaru.
Gabungkan profil lama dengan narasi baru menjadi profil yang utuh.
Tetap singkat (2-3 kalimat). Jika ada info baru yang bertentangan, gunakan yang baru.

Profil lama: {old_profile}
Narasi baru: {new_narrative}

Profil terbaru (mulai langsung tanpa kata pembuka):"""

    new_profile = await call_llm_simple(summarize_prompt, max_tokens=200)

    # Upsert ke database
    await conn.execute("""
        INSERT INTO user_profiles (user_id, profile_summary, session_count, last_active)
        VALUES ($1, $2, 1, NOW())
        ON CONFLICT (user_id) DO UPDATE
        SET profile_summary = $2,
            session_count = user_profiles.session_count + 1,
            last_active = NOW()
    """, user_id, new_profile.strip())

    return new_profile.strip()
```

### 7.6 FastAPI Main Endpoint dengan Streaming

```python
# backend/api/routes/recommend.py
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
import asyncpg, json, time

from ...rag.search import hybrid_search
from ...rag.rerank import rerank
from ...rag.prompt import build_prompt
from ...services.profile_service import get_profile, update_profile
from ...services.llm_service import stream_llm
from ...services.db import get_db
from ...api.middleware.auth import get_current_user

router = APIRouter()


@router.post("/recommend")
async def recommend(
    body: dict,
    user_id: str = Depends(get_current_user),
    conn: asyncpg.Connection = Depends(get_db)
):
    narrative = body.get("narrative", "").strip()
    if not narrative:
        return {"error": "Narasi tidak boleh kosong"}

    start_time = time.time()

    # [1] Ambil profil lama
    old_profile = await get_profile(user_id, conn)

    # [2] Query untuk embedding: gabungkan profil + narasi
    query_text = f"{old_profile} {narrative}" if old_profile else narrative

    # [3] Hybrid Search
    candidates = await hybrid_search(query_text, conn, top_k=10)

    # [4] Reranking: filter top 10 → top 3
    top_docs = rerank(narrative, candidates, top_n=3)

    # [5] Build final prompt
    prompt = build_prompt(old_profile, narrative, top_docs)

    # [6] Update profil adaptif (async, tidak perlu await dulu)
    import asyncio
    profile_task = asyncio.create_task(
        update_profile(user_id, old_profile, narrative, conn)
    )

    # [7] Stream response dari Ollama
    async def generate():
        full_response = ""
        async for token in stream_llm(prompt):
            full_response += token
            yield f"data: {json.dumps({'token': token})}\n\n"

        # [8] Simpan ke history setelah streaming selesai
        response_time = int((time.time() - start_time) * 1000)
        await conn.execute("""
            INSERT INTO recommendation_history
            (user_id, narrative_input, profile_at_time, retrieved_chunks,
             recommendation, response_time_ms)
            VALUES ($1, $2, $3, $4, $5, $6)
        """, user_id, narrative, old_profile,
            json.dumps([{"title": d["title"], "company": d["company"]} for d in top_docs]),
            full_response, response_time
        )

        yield f"data: {json.dumps({'done': True, 'time_ms': response_time})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # penting untuk Nginx
        }
    )
```

---

## 8. Perubahan dari Arsitektur Skripsi Lama

### 8.1 Komponen yang Dihapus / Diganti

| Komponen Lama | Diganti Dengan | Alasan |
|---|---|---|
| Google Gemini API (cloud) | Ollama Llama 3.1 8B (lokal) | No cost, no rate limit, tidak bergantung internet |
| ChromaDB (vector DB terpisah) | pgvector di PostgreSQL | Satu database, lebih sederhana, ACID compliant |
| Firestore (profil user) | PostgreSQL `user_profiles` | Tidak ada biaya, full SQL control, bisa JOIN |
| Pure semantic search | Hybrid search (RRF) | Akurasi lebih tinggi untuk query beragam |
| Tanpa reranking | Reranking berbasis skill overlap | Top 3 lebih relevan, prompt lebih efisien |
| Auth manual / belum ada | Clerk + Google OAuth | Tidak perlu build auth dari nol, aman |
| Tanpa streaming | SSE streaming response | UX jauh lebih baik untuk latency LLM |
| ChromaDB embedding | pgvector + nomic-embed-text | Unified di satu database |

### 8.2 Yang Perlu Diperbarui di Skripsi

**Bab 2 — Landasan Teori (tambah sub-bab baru):**
- pgvector dan Hybrid Search
- Reciprocal Rank Fusion (RRF)
- Ollama sebagai local LLM runtime
- Streaming Server-Sent Events (SSE)

**Bab 3 — Metodologi:**
- Gambar 3.2: Update diagram arsitektur sistem (hapus ChromaDB, Firestore, Gemini API cloud)
- Sub-bab 3.3.3: Update tech stack (FastAPI + PostgreSQL + pgvector + Ollama)
- Tambahkan PostgreSQL MCP sebagai tools pengembangan di sub-bab alat penelitian

**Bab 4 — Hasil:**
- Gambar 4.12: Perbarui diagram arsitektur low-level
- Sub-bab implementasi: sesuaikan dengan tech stack baru
- Tambahkan sub-bab evaluasi hybrid search vs pure semantic (kontribusi teknis)

### 8.3 Yang TIDAK Berubah (Tetap Sama)

- ✅ Metodologi Design Science Research (DSR)
- ✅ Metode Prototype (4 langkah)
- ✅ Evaluasi SUS + Pre-test/Post-test kuasi-eksperimental
- ✅ Tujuan penelitian dan rumusan masalah
- ✅ Web scraping dari Glints (hanya tujuan output berubah → ke PostgreSQL)
- ✅ Landasan teori RAG, LLM, SCCT, Life Design
- ✅ Instrumen SUS (10 pertanyaan)
- ✅ Subjek penelitian (20-30 siswa SMA/SMK)
- ✅ Nama sistem: NusaNara

---

## 9. Struktur Folder Project

```
nusanara/
├── .mcp.json                      ← Konfigurasi MCP (PostgreSQL MCP untuk Claude Code)
├── .env.example                   ← Template environment variables
├── .gitignore                     ← Jangan commit: .env, venv/, __pycache__/, .mcp.json
├── README.md
│
├── backend/
│   ├── main.py                    ← Entry point FastAPI, mount semua router
│   ├── requirements.txt
│   ├── schema.sql                 ← DDL semua tabel + index + trigger
│   ├── .env                       ← Environment variables (JANGAN commit!)
│   │
│   ├── api/
│   │   ├── routes/
│   │   │   ├── recommend.py       ← POST /recommend (endpoint utama + streaming)
│   │   │   ├── history.py         ← GET /history (riwayat rekomendasi)
│   │   │   └── profile.py         ← GET/PUT /profile (lihat dan reset profil)
│   │   └── middleware/
│   │       └── auth.py            ← Validasi JWT dari Clerk via JWKS
│   │
│   ├── rag/
│   │   ├── search.py              ← Hybrid search (semantic + full-text + RRF)
│   │   ├── rerank.py              ← Reranking top-10 → top-3
│   │   ├── embed.py               ← Wrapper Ollama nomic-embed-text
│   │   └── prompt.py              ← Template prompt 5-in-1
│   │
│   ├── services/
│   │   ├── profile_service.py     ← Adaptive profile: get, update, summarize
│   │   ├── llm_service.py         ← Wrapper Ollama chat: streaming + simple call
│   │   └── db.py                  ← asyncpg connection pool
│   │
│   └── scripts/
│       ├── scraper_glints.py      ← Web scraping (sudah ada dari penelitian)
│       ├── clean_jobs.py          ← Cleaning dan strukturisasi data scraping
│       ├── import_to_db.py        ← Import CSV ke PostgreSQL (tanpa embedding)
│       └── embed_knowledge.py     ← Generate embedding semua dokumen → pgvector
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx             ← Root layout + ClerkProvider wrapper
│   │   ├── page.tsx               ← Landing page (hero, deskripsi sistem)
│   │   ├── dashboard/
│   │   │   └── page.tsx           ← Halaman input narasi + tampilkan hasil
│   │   └── history/
│   │       └── page.tsx           ← Riwayat seluruh rekomendasi
│   │
│   ├── components/
│   │   ├── NarrativeInput.tsx     ← Form textarea input narasi + tombol kirim
│   │   ├── RecommendationCard.tsx ← Render hasil rekomendasi dengan markdown
│   │   ├── StreamingText.tsx      ← Komponen yang handle SSE, tampilkan token
│   │   └── HistoryList.tsx        ← List riwayat rekomendasi sebelumnya
│   │
│   ├── lib/
│   │   └── api.ts                 ← Fungsi fetch ke FastAPI (dengan JWT dari Clerk)
│   │
│   └── .env.local                 ← Clerk keys + API URL (JANGAN commit!)
│
└── docs/
    ├── PRD_NusaNara_v2.md         ← Dokumen ini
    └── architecture-diagram.png   ← Diagram arsitektur untuk skripsi
```

---

## 10. Milestone Implementasi

| # | Milestone | Cara Verifikasi | Estimasi |
|---|---|---|---|
| M1 | Setup local env lengkap | Docker PostgreSQL running, schema ter-create, Ollama running | 1-2 hari |
| M2 | PostgreSQL MCP aktif | Claude Code bisa query DB via natural language | 1 hari |
| M3 | Data pipeline selesai | 476 baris di knowledge_base dengan embedding (verifikasi via MCP) | 2-3 hari |
| M4 | Backend FastAPI dasar | POST /recommend return JSON response (belum streaming) | 3-4 hari |
| M5 | Hybrid search jalan | Query test return hasil relevan, bisa dibandingkan dengan pure semantic | 2-3 hari |
| M6 | Adaptive profile | Setelah 2 sesi, profile_summary berubah sesuai narasi baru | 2-3 hari |
| M7 | Streaming SSE | Frontend tampilkan token muncul satu per satu (tidak blank 30 detik) | 2-3 hari |
| M8 | Frontend + Clerk auth | Login Google berfungsi, dashboard bisa diakses dengan JWT valid | 3-4 hari |
| M9 | Deploy ke VPS | Systemd service running, Nginx + SSL aktif, health check OK | 2 hari |
| M10 | MVP siap evaluasi | Alur lengkap: login → narasi → streaming rekomendasi → riwayat | 1 hari |
| M11 | Pilot study (2-3 user) | Tidak ada bug kritikal, alur bisa diikuti tanpa bantuan | 2-3 hari |
| M12 | Evaluasi SUS + pre/post | N=20-30 responden, data lengkap, siap dianalisis | 1-2 minggu |

---

## 11. Kontribusi Teknis untuk Skripsi

Poin-poin ini dapat ditulis secara eksplisit sebagai kontribusi di **Bab 4.4 Pembahasan**:

### 11.1 Hybrid Search dengan RRF
Bandingkan akurasi retrieval antara tiga pendekatan:
- Pure semantic search (pgvector cosine similarity saja)
- Pure full-text search (tsvector saja)
- Hybrid dengan RRF (gabungan keduanya)

Gunakan sampel 10-20 query representatif, evaluasi relevansi dokumen yang diambil. Ini adalah **eksperimen kuantitatif** yang bisa mengisi sub-bab tersendiri.

### 11.2 Adaptive Profile — Evolusi Profil Antar Sesi
Demonstrasikan bahwa sistem benar-benar "belajar":
- Tampilkan `profile_summary` sebelum sesi 1 (kosong)
- Tampilkan setelah sesi 1 (profil awal)
- Tampilkan setelah sesi 3 (profil sudah terakumulasi)

Ini adalah bukti konkret fitur adaptif yang membedakan NusaNara dari RAG biasa.

### 11.3 Metadata Filtering
Tunjukkan perbedaan hasil dengan dan tanpa filter klaster karier. Query yang sama dengan cluster filter berbeda hasilnya berbeda dan lebih relevan.

### 11.4 Streaming vs Non-streaming
Jika memungkinkan, ukur persepsi pengguna terhadap UX streaming. Ini bisa jadi item analisis kualitatif di bagian evaluasi.

### 11.5 Response Time sebagai Limitasi
Catat `response_time_ms` di setiap sesi (sudah tersimpan di `recommendation_history`). Analisis di bab evaluasi:
- Rata-rata, median, min, max
- Bandingkan dengan target ideal
- Jadikan sebagai limitasi penelitian dan future work (upgrade GPU)

### 11.6 Arsitektur Single-Database
Justifikasi keputusan menggunakan PostgreSQL + pgvector menggantikan ChromaDB + Firestore terpisah. Argumen: kesederhanaan, konsistensi ACID, biaya nol, kemudahan backup, dan tidak ada masalah sinkronisasi antar database.

---

> **Catatan:** Dokumen ini adalah panduan teknis hidup. Perbarui sesuai kebutuhan saat implementasi berlangsung. Setiap keputusan arsitektur yang berubah dari dokumen ini harus didokumentasikan di Bab 4 skripsi sebagai temuan pengembangan.

---
*PRD NusaNara v2.0 — Muhammad Mirza Kurniawan — UNSIKA 2025*