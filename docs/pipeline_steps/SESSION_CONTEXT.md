# NusaNara — Konteks Sesi & Status Progress

> **Tujuan file ini:** Menjadi sumber referensi tunggal (*single source of truth*) untuk status pengerjaan skripsi NusaNara agar konteks tidak hilang saat membuka sesi AI baru.
>
> **Terakhir diperbarui:** 2026-05-02

---

## 🗺️ Gambaran Pipeline (8 Tahap)

```
Tahap 01 ✅  →  Tahap 02 ✅  →  Tahap 03 ✅  →  Tahap 04 ✅
Scraping        Cleaning        DB Import       Embedding +
Glints          + Cluster       PostgreSQL      Hybrid Search
                Labeling        pgvector        + Re-ranking

Tahap 05 ✅  →  Tahap 06 ✅  →  Tahap 07 🔄  →  Tahap 08 🔲
Evaluasi        Backend         Frontend        Deployment
RAG (P@k,MRR)   API FastAPI      Next.js 14      VPS + Vercel
                                + Clerk         + Nginx + SSL
```

| Simbol | Arti |
|--------|------|
| ✅ | Selesai & terverifikasi |
| 🔄 | Sedang dikerjakan (in progress) |
| 🔲 | Belum dimulai |

---

## ✅ TAHAP 01 — Web Scraping (SELESAI)

**File dokumentasi:** `01_scraping.md`

- **Tools:** Selenium + selenium-stealth (untuk bypass SPA berbasis React)
- **Target:** Glints Indonesia
- **Hasil:** `data/raw_jobs_final.csv` — 720 lowongan mentah (8 klaster × 90 lowongan)
- **Catatan:** Dilakukan scraping bertahap (multi-phase top-up) karena Glints memiliki rate-limiting

**Output artefak:**
- `data/raw_jobs_final.csv` (~281 KB) — **arsip, jangan diedit**

---

## ✅ TAHAP 02 — Cleaning & Cluster Labeling (SELESAI)

**File dokumentasi:** `02_cleaning.md`

- **Tools:** Pandas, Python RegEx
- **Proses:** Normalisasi teks, inferensi klaster, pembentukan field `content` (gabungan judul + deskripsi + skill + requirement)
- **Hasil:** `data/cleaned_jobs.csv` — 720 lowongan bersih, terlabel, siap embedding

**8 Klaster Karier yang sudah terdefinisi:**

| # | Klaster | Contoh Posisi |
|---|---------|---------------|
| 1 | Teknologi & Perangkat Lunak | Software Engineer, Web Dev, IT Support |
| 2 | Analisis Data | Data Analyst, Business Intelligence, Data Scientist |
| 3 | Desain & Kreatif | Graphic Designer, UI/UX Designer, Content Writer |
| 4 | Pemasaran Digital | Digital Marketing, SEO, Social Media Specialist |
| 5 | Bisnis & Administrasi | Project Manager, Business Development |
| 6 | Sales & Customer Service | Sales Executive, Customer Service, Call Center |
| 7 | Finance & Accounting | Accounting Staff, Finance Analyst, Auditor |
| 8 | Education & Training | Guru, Tutor, Trainer, Instruktur |

**Output artefak:**
- `data/cleaned_jobs.csv` (~266 KB) — **Knowledge Base utama sistem RAG**

---

## ✅ TAHAP 03 — Import Database (SELESAI)

**File dokumentasi:** `03_import_db.md`

- **Database:** PostgreSQL 16 + ekstensi pgvector
- **Infrastruktur:** Docker (isolasi container PostgreSQL)
- **Schema tabel:** field `content` + `embedding VECTOR(768)` + `cluster_id`
- **Status data:** 720 baris tersimpan, semua embedding terisi (NULL = 0)

---

## ✅ TAHAP 04 — Embedding + Hybrid Search (SELESAI)

**File dokumentasi:** `04_embedding.md`

- **Model Embedding:** `nomic-embed-text-v2-moe` via Ollama (lokal, 768 dimensi)
- **Retrieval:** Hybrid Search = Semantic Search (cosine similarity via pgvector) + Full-Text Search (tsvector)
- **Fusion:** Reciprocal Rank Fusion (RRF) — menggabungkan Top-k dari dua jalur
- **Re-ranking:** Heuristik Python — weighted scoring berdasarkan Skill Match + Experience Match
- **Bug fix penting:** `ORDER BY sim_score DESC` — sudah terverifikasi

---

## ✅ TAHAP 05 — Evaluasi RAG (SELESAI)

**File dokumentasi:** `05_rag_evaluation.md`

**Hasil evaluasi akhir (dengan re-ranking):**

| Metrik | Tanpa Reranking | Dengan Reranking |
|--------|:-:|:-:|
| P@1 | 0.700 | **0.750** |
| P@3 | 0.700 | **0.733** |
| P@5 | 0.710 | 0.710 |
| MRR | 0.800 | **0.842** |

- Evaluasi dilakukan pada **20 query uji** mencakup semua 8 klaster
- MRR 0.842 = dokumen relevan pertama rata-rata ditemukan di posisi **1.19**
- Ground truth menggunakan skala graded relevance **0–3**

**Output artefak (`backend/evaluation/`):**
- `eval_summary_final.csv` — tabel P@k & MRR → **salin ke Bab 4 skripsi**
- `eval_detail_final.csv` — detail top-5 retrieved per-query → lampiran
- `ground_truth.json` — 20 query uji + skor relevansi → lampiran

---

## ✅ TAHAP 06 — Backend API FastAPI (SELESAI)

**File dokumentasi:** `06_backend_api.md`

- **Framework:** FastAPI + asyncpg + uvicorn
- **Endpoint utama:** `POST /api/recommend` → respons **SSE streaming**
- **Auth:** Clerk JWT — setiap request harus menyertakan header `Authorization: Bearer <token>`
- **LLM:** Llama 3.1 via Ollama (lokal) — faithfulness constraint via system prompt
- **CORS:** dikonfigurasi untuk menerima request dari `localhost:3000` (frontend dev)

**Alur `/api/recommend`:**
```
Request narasi pengguna (JSON)
  → JWT verification (Clerk)
  → Query Expansion (tambah domain keywords)
  → Hybrid Search (semantic + FTS via pgvector)
  → RRF Fusion → Top-10
  → Re-ranking (skill + experience heuristic) → Top-3
  → Prompt augmentation (Top-3 sebagai context)
  → Llama 3.1 generate → SSE stream token demi token
```

---

## 🔄 TAHAP 07 — Frontend Development (SEDANG DIKERJAKAN)

**File dokumentasi:** `07_frontend_development.md`

### Status Sub-Tahap

| Sub-Tahap | Status | Keterangan |
|-----------|--------|------------|
| HTML Mockup (Purwarupa visual) | ✅ Selesai | 4 halaman: index, auth, dashboard, rekomendasi |
| Koneksi antar halaman mockup | ✅ Selesai | Semua link navigasi terhubung |
| Desain landing page (cinematic) | ✅ Selesai | Hero Section selesai, UI di bawah Hero di-upgrade dengan standar Dribbble (Glassmorphism, Aurora Gradients, React-flow style architecture node) |
| Push ke GitHub | ✅ Selesai | Repo: `mirzasnowy/nusanara-rag` (branch: main) |
| Inisialisasi Next.js | 🔲 Belum | Langkah berikutnya |
| Konfigurasi Clerk | 🔲 Belum | Setelah Next.js init |
| Migrasi komponen HTML → React/TSX | 🔲 Belum | Berdasarkan mockup |
| Integrasi API SSE | 🔲 Belum | Hubungkan ke `/api/recommend` |
| Riwayat konsultasi | 🔲 Belum | `/dashboard/riwayat` |

---

### Detail Desain Landing Page (`frontend/mockups/index.html`) — Final

**Spesifikasi teknis yang sudah diimplementasikan:**

#### Teknologi & Config
- **Tailwind CSS** via CDN (`https://cdn.tailwindcss.com`)
- **Fonts:** `Instrument Serif` (display) + `Inter 400/500` (body) via Google Fonts
- **Tailwind theme extend:** CSS variables HSL untuk semua warna

#### Color System (CSS Variables)
```css
--background: 201 100% 13%    /* Deep navy blue */
--foreground: 0 0% 100%        /* Pure white */
--muted-foreground: 240 4% 66% /* Muted gray */
--primary: 35 100% 60%         /* Orange accent (#ffb067 equiv) */
--secondary: 0 0% 10%
--border: 0 0% 18%
```

#### Efek CSS Kustom: `.liquid-glass`
```css
.liquid-glass {
  background: rgba(255, 255, 255, 0.02);
  background-blend-mode: luminosity;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: none;
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
}
/* ::before pseudo-element untuk subtle gradient border */
```

#### Animasi: `@keyframes fade-rise`
- `.animate-fade-rise` — 0.8s, delay 0s
- `.animate-fade-rise-delay` — 0.8s, delay 0.2s
- `.animate-fade-rise-delay-2` — 0.8s, delay 0.4s
- `.animate-fade-rise-delay-3` — 0.8s, delay 0.6s

#### Struktur Hero Section (urutan dari atas ke bawah):
1. **`<video>` background** — `autoplay loop muted playsinline`, `absolute inset-0 z-0`, tanpa overlay
2. **Navbar** — logo "NusaNara" (Instrument Serif), nav links (hidden mobile), tombol "Masuk" (liquid-glass)
3. **`<main>`** — flex column, centered, `pt-24 pb-32`:
   - **H1** — "Temukan Jalur *Kariermu.*" — text-6xl→8xl, `Instrument Serif`, kata *Kariermu* dalam `<em class="not-italic text-muted-foreground">`
   - **Paragraf subtext** — text-muted-foreground, max-w-2xl
   - **Tombol CTA** (flex-row) — "Mulai Sekarang" (liquid-glass pill) + "Lihat Cara Kerja" (text link)
   - **Stats Bar** (liquid-glass, flex-col mobile → flex-row desktop) — 476 Lowongan | 5 Klaster Karier | Gratis Akses Penuh

#### Halaman mockup yang sudah ada & terhubung:
- `frontend/mockups/index.html` → `auth.html`
- `frontend/mockups/auth.html` → `dashboard.html`
- `frontend/mockups/dashboard.html` → `rekomendasi.html` & `auth.html`
- `frontend/mockups/rekomendasi.html` → `dashboard.html` & `auth.html`

---

### Langkah Berikutnya (Task 07 — Lanjutan)

```bash
# 1. Inisialisasi Next.js (jalankan di dalam folder frontend/)
cd d:\Tugas Akhir\nusanara\frontend
npx create-next-app@latest ./ \
  --typescript --tailwind --eslint --app \
  --no-src-dir --import-alias "@/*"

# 2. Install Clerk
npm install @clerk/nextjs react-markdown

# 3. Setup .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
NEXT_PUBLIC_API_URL=http://localhost:8000

# 4. Jalankan dev server
npm run dev   # → http://localhost:3000
```

**Aturan Clerk wajib:**
- ✅ Gunakan `clerkMiddleware()` dari `@clerk/nextjs/server`
- ✅ Gunakan `<Show when="signed-in">` / `<Show when="signed-out">`
- ❌ JANGAN gunakan `authMiddleware()`, `<SignedIn>`, `<SignedOut>` (sudah deprecated)

---

## 🔲 TAHAP 08 — Deployment (BELUM DIMULAI)

**File dokumentasi:** `08_vps_deployment.md`

- **Backend:** VPS Ubuntu + Nginx + Systemd daemon + UFW + SSL (Let's Encrypt)
- **Frontend:** Vercel (deploy otomatis dari GitHub)
- **Database:** Migrasi via `pg_dump` dari lokal ke VPS

---

## 📁 Struktur Repositori GitHub

**Repo:** `mirzasnowy/nusanara-rag` (branch: `main`)

```
nusanara/
├── data/
│   ├── raw_jobs_final.csv          ← Arsip scraping mentah
│   └── cleaned_jobs.csv            ← Knowledge Base utama (720 lowongan)
├── backend/
│   ├── main.py                     ← FastAPI app + SSE endpoint
│   ├── evaluation/
│   │   ├── eval_summary_final.csv  ← Hasil P@k & MRR → Bab 4 skripsi
│   │   ├── eval_detail_final.csv   ← Detail per-query → lampiran
│   │   └── ground_truth.json       ← 20 query uji → lampiran
│   └── ...
├── frontend/
│   ├── mockups/                    ← HTML purwarupa (SELESAI)
│   │   ├── index.html              ← Landing page (cinematic hero)
│   │   ├── auth.html               ← Halaman login/register
│   │   ├── dashboard.html          ← Dashboard pengguna
│   │   └── rekomendasi.html        ← Form narasi + hasil RAG
│   └── README.md                   ← Panduan Next.js setup
└── docs/
    ├── Web_App_Design.md           ← Dokumen desain UI/UX lengkap
    ├── pipeline_steps/
    │   ├── 00_overview.md          ← Ringkasan pipeline & arsitektur
    │   ├── 01_scraping.md
    │   ├── 02_cleaning.md
    │   ├── 03_import_db.md
    │   ├── 04_embedding.md
    │   ├── 05_rag_evaluation.md
    │   ├── 06_backend_api.md
    │   ├── 07_frontend_development.md
    │   ├── 08_vps_deployment.md
    │   └── SESSION_CONTEXT.md      ← File ini
    └── ...
```

---

## 🔑 Informasi Teknis Penting

### Sistem RAG — Ringkasan Arsitektur
```
Query pengguna (narasi karier)
  ↓ Query Expansion
  ↓ Semantic Search (nomic-embed-text-v2-moe, cosine sim, pgvector)
  ↓ Full-Text Search (PostgreSQL tsvector)
  ↓ RRF Fusion → Top-10
  ↓ Re-ranking heuristik (skill + experience) → Top-3
  ↓ Prompt augmentation + Llama 3.1 (Ollama lokal)
  ↓ SSE streaming response ke frontend
```

### Stats Knowledge Base (untuk narasi skripsi)
- **Total lowongan:** 720 (telah disesuaikan di UI Mockup)
- **Klaster karier:** 8 (telah disesuaikan di UI Mockup)
- **Dimensi vektor:** 768
- **Model embedding:** nomic-embed-text-v2-moe (lokal via Ollama)
- **MRR terbaik:** 0.842 (dengan re-ranking)

> ✅ **Catatan:** Angka statistik di UI landing page sekarang sudah menggunakan data real dari pipeline (720 lowongan, 8 klaster, 0.84 MRR).

### Port & Service (Development Lokal)
| Service | Port | Keterangan |
|---------|------|------------|
| FastAPI Backend | `:8000` | `uvicorn main:app --reload` |
| Next.js Frontend | `:3000` | `npm run dev` |
| PostgreSQL | `:5432` | Docker container |
| Ollama | `:11434` | Model lokal (Llama 3.1 + nomic-embed) |
| ngrok | `:5500` | Live preview mockup HTML |

---

## 📋 Checklist Keseluruhan untuk Skripsi

- [x] Task 01: Scraping 720 lowongan dari Glints
- [x] Task 02: Cleaning + labeling 8 klaster + formasi field `content`
- [x] Task 03: Import ke PostgreSQL + pgvector (Docker)
- [x] Task 04: Embedding 768D + Hybrid Search + RRF + Re-ranking
- [x] Task 05: Evaluasi RAG — P@1=0.750, P@3=0.733, MRR=0.842
- [x] Task 06: Backend FastAPI + SSE streaming + Clerk JWT auth
- [ ] Task 07: Frontend Next.js 14 + TypeScript + Tailwind + Clerk
  - [x] HTML mockup purwarupa (4 halaman, terhubung)
  - [x] Desain landing page cinematic (Instrument Serif, liquid-glass, video BG)
  - [x] Push ke GitHub (mirzasnowy/nusanara-rag)
  - [ ] Init Next.js + install Clerk
  - [ ] Implementasi middleware + ClerkProvider
  - [ ] Migrasi mockup → komponen React/TSX
  - [ ] SSE streaming client (`StreamingText.tsx`)
  - [ ] Riwayat konsultasi (`/dashboard/riwayat`)
- [ ] Task 08: Deployment VPS + Nginx + Vercel
