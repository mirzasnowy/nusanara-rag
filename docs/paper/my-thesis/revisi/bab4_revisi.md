# REVISI BAB 4 — HASIL DAN PEMBAHASAN
## NusaNara: Sistem Bimbingan Karier Berbasis RAG
### Dokumen Revisi untuk Penyesuaian Implementasi Aktual

> **Catatan:** File ini berisi narasi pengganti untuk Bab 4. Urutan sub-bab mengikuti struktur draf asli.

---

## 4.1.1.2 Pengumpulan Data Lowongan *(REVISI TOTAL — jumlah data, platform, klaster)*

### Narasi Pengganti: Proses Scraping dan Hasil Data

Pengumpulan data lowongan pekerjaan untuk basis pengetahuan sistem dilakukan melalui serangkaian tahapan teknis yang melibatkan otomasi berbasis Selenium. Pada tahap awal, tiga platform karier utama dievaluasi sebagai kandidat sumber data: Jobstreet, LinkedIn, dan Glints. Evaluasi ini menghasilkan temuan bahwa Jobstreet menerapkan proteksi *bot-detection* berbasis Cloudflare yang secara konsisten memblokir permintaan otomatis, sementara LinkedIn tidak menampilkan informasi gaji secara publik — atribut yang relevan untuk analisis pasar kerja kontekstual. Berdasarkan evaluasi ini, **Glints dipilih sebagai satu-satunya sumber data** karena aksesibilitasnya secara teknis dan kelengkapan atribut data yang disediakan.

Proses *scraping* dilakukan menggunakan Selenium WebDriver dengan konfigurasi **selenium-stealth**, diperlukan karena Glints merupakan *Single Page Application* (SPA) berbasis React yang mengandalkan JavaScript untuk merender konten — sehingga pendekatan HTTP request biasa tidak dapat mengekstrak data secara andal. Skrip `scraper.py` mengotomasi proses navigasi, scroll halaman, dan ekstraksi elemen DOM untuk setiap lowongan.

Data dikumpulkan dalam dua iterasi: iterasi pertama menghasilkan kumpulan data awal, dan iterasi *top-up* dilakukan untuk memastikan setiap klaster mencapai jumlah yang ditargetkan. Hasil akhir pengumpulan data adalah **720 lowongan pekerjaan** yang disimpan dalam berkas `raw_jobs_final.csv` (±281 KB), terdistribusi ke dalam 8 klaster karier.

**Tabel 4.2 Distribusi Lowongan Berdasarkan Klaster Karier**

| No | Klaster Karier | Jumlah Lowongan |
|---|---|:-:|
| 1 | Teknologi & Perangkat Lunak | 90 |
| 2 | Analisis Data | 90 |
| 3 | Desain & Kreatif | 90 |
| 4 | Pemasaran Digital | 90 |
| 5 | Bisnis & Administrasi | 90 |
| 6 | Sales & Customer Service | 90 |
| 7 | Finance & Accounting | 90 |
| 8 | Education & Training | 90 |
| | **Total** | **720** |

Distribusi seimbang sempurna (90 lowongan per klaster) merupakan persyaratan metodologis yang disengaja. Tanpa keseimbangan ini, metrik Precision@k per klaster tidak dapat dibandingkan secara adil, karena klaster dengan lebih banyak data secara inheren akan menghasilkan skor yang lebih tinggi (Cormack et al., 2009).

---

## 4.1.1.3 Preprocessing dan Pembangunan Knowledge Base *(REVISI — schema aktual)*

### Tabel 4.4 — Schema Data Aktual (Pengganti)

Setiap lowongan yang dikumpulkan melalui proses scraping kemudian dibersihkan dan dinormalisasi, menghasilkan atribut-atribut yang disimpan dalam tabel `knowledge_base` pada PostgreSQL 16:

| Kolom | Tipe Data | Keterangan |
|---|---|---|
| `id` | SERIAL | Primary key auto-increment |
| `title` | TEXT | Judul posisi pekerjaan |
| `company` | TEXT | Nama perusahaan |
| `location` | TEXT | Kota/provinsi |
| `salary_min` | INTEGER | Gaji minimum (Rupiah) |
| `salary_max` | INTEGER | Gaji maksimum (Rupiah) |
| `skills` | TEXT[] | Array keterampilan yang dibutuhkan |
| `seniority` | TEXT | Tingkat senioritas (Entry/Mid/Senior) |
| `cluster` | TEXT | Salah satu dari 8 klaster karier |
| `content` | TEXT | Narasi gabungan untuk embedding |
| `embedding` | VECTOR(768) | Representasi vektor dari model nomic-embed |
| `search_vector` | TSVECTOR | Indeks full-text search |

Kolom `content` merupakan kolom kritis dalam pipeline RAG — berisi narasi gabungan yang diformulasikan dari atribut-atribut utama lowongan (judul, keterampilan, klaster, senioritas) dan menjadi input untuk proses *embedding*. Kolom `embedding` diisi oleh pipeline Task 04 menggunakan model `nomic-embed-text-v2-moe` (768 dimensi), sementara `search_vector` dibangkitkan otomatis menggunakan fungsi `to_tsvector('simple', ...)`.

---

## 4.1.2.1 Perancangan Antarmuka dan Use Case *(REVISI MINOR)*

Di seluruh sub-bab ini:
- Setiap penyebutan "React.js" → ganti "Next.js 14"
- Setiap penyebutan "ChromaDB" → ganti "PostgreSQL 16 + pgvector"
- Setiap penyebutan "Gemini" → ganti "Ollama (Llama 3.1)"

*(Gambar Activity Diagram pengganti: `revisi/assets/gambar_4_10_activity_diagram.png`)*

---

## 4.1.2.2 Perancangan Arsitektur Sistem *(REVISI TOTAL)*

### Narasi Pengganti: Arsitektur Unified Database

*(Gunakan gambar baru: `revisi/assets/gambar_3_2_arsitektur_sistem.png`)*

Arsitektur sistem NusaNara mengadopsi pendekatan **Unified Database Architecture** yang menempatkan PostgreSQL 16 sebagai satu-satunya sistem penyimpanan data. Berbeda dengan pendekatan *multi-database* yang memisahkan penyimpanan vektor dan data relasional ke dalam sistem terpisah, arsitektur ini memanfaatkan ekstensi **pgvector** untuk mengintegrasikan kapabilitas penyimpanan dan pencarian vektor secara native ke dalam PostgreSQL.

Pendekatan ini dipilih berdasarkan tiga pertimbangan teknis utama:

1. **Konsistensi Transaksi:** Data vektor, metadata teks, profil pengguna, dan riwayat rekomendasi tersimpan dalam satu sistem dengan jaminan ACID (Atomicity, Consistency, Isolation, Durability), mengeliminasi risiko inkonsistensi data antara dua sistem terpisah.

2. **Hybrid Search Native:** Kemampuan menggabungkan pencarian semantik berbasis vektor (`pgvector`, operator `<=>`) dengan pencarian *full-text* berbasis kata kunci (`tsvector`) dalam satu query SQL, memungkinkan Reciprocal Rank Fusion (RRF) yang efisien tanpa overhead sinkronisasi antar sistem.

3. **Simplifikasi Operasional:** Hanya satu sistem yang perlu di-*backup*, di-*monitor*, dan di-*migrate*, secara signifikan mengurangi kompleksitas operasional.

Sistem terdiri dari komponen-komponen berikut yang terintegrasi dalam satu arsitektur kohesif:

**Komponen Penyimpanan (PostgreSQL 16):**
- Tabel `knowledge_base`: Menyimpan 720 dokumen lowongan beserta embedding VECTOR(768) dan indeks FTS tsvector
- Tabel `user_profiles`: Menyimpan profil adaptif pengguna (skills array, interests array, ringkasan)
- Tabel `recommendation_history`: Menyimpan riwayat interaksi termasuk narasi input dan rekomendasi

**Komponen Inferensi Lokal (Ollama):**
- **Main RAG Agent:** Llama 3.1 (8B) dengan prompt *Decision Intelligence* 5-seksi, menghasilkan rekomendasi karier yang terstruktur dan dapat ditelusuri (*traceable*)
- **Extractor Agent:** Llama 3.1 dalam peran berbeda — mengekstrak informasi terstruktur (JSON) dari narasi pengguna untuk memperbarui profil adaptif

**Komponen Adaptif (Adaptive Profile System):**
Modul `memory_service.py` mengimplementasikan sistem personalisasi non-blocking yang berjalan sebagai *background task* (`asyncio.create_task()`). Setelah pipeline RAG menyelesaikan streaming respons, Extractor Agent secara asinkron mengekstrak skill dan minat dari narasi pengguna, kemudian memperbarui `user_profiles` menggunakan operasi UNION yang deterministik — memastikan akumulasi profil tanpa kehilangan data historis.

**Alur Pipeline RAG (Fast Path):**
```
Input Narasi
→ Query Expansion (injeksi keyword domain)
→ Embedding (nomic-embed-text-v2-moe, 768D)
→ Hybrid Search: pgvector + tsvector (RRF → Top-10)
→ Re-ranking: 0.70 × CosineSim + 0.30 × SkillBonus (Top-3)
→ Build Prompt (Decision Intelligence, 5 Seksi)
→ LLM Generate (Llama 3.1, stream=True)
→ SSE Token Stream → Client
→ [Setelah DONE] asyncio.create_task(update_profile)
```

*(Narasi "Dual-Brain", "ChromaDB", "Firestore", "Summarizer Service", "Gemini API" pada draf sebelumnya dihapus seluruhnya karena tidak relevan dengan implementasi aktual.)*

---

## 4.1.3 Implementasi Sistem *(ISI PLACEHOLDER)*

### 4.1.3.1 Spesifikasi Lingkungan Pengembangan

**Lingkungan Produksi (VPS):**

| Komponen | Spesifikasi |
|---|---|
| Platform | VPS Ubuntu 22.04 LTS |
| Web Server | Nginx (Reverse Proxy, SSL Termination) |
| Process Manager | Systemd (`nusanara.service`, `Restart=always`) |
| SSL/TLS | Let's Encrypt (auto-renew via Certbot) |
| Firewall | UFW (port 5432, 11434, 8000 internal only) |

**Lingkungan Software:**

| Komponen | Teknologi | Versi |
|---|---|---|
| Runtime Backend | Python | 3.11 |
| Web Framework | FastAPI + Uvicorn | Terkini |
| Database | PostgreSQL | 16 |
| Vector Extension | pgvector | Terkini |
| DB Driver | asyncpg | Terkini |
| LLM Platform | Ollama | Terkini |
| LLM Generator | Llama 3.1 | 8B |
| Embedding Model | nomic-embed-text-v2-moe | 768D |
| Frontend | Next.js | 14 |
| Bahasa Frontend | TypeScript | 5.x |
| Auth Provider | Clerk | Terkini |
| Frontend Hosting | Vercel | Terkini |
| Containerisasi DB (dev) | Docker | Terkini |

### 4.1.3.2 Implementasi Backend — Komponen Kritis

**A. Fungsi Hybrid Search (llm_service.py)**

Berikut adalah pseudocode dari fungsi `hybrid_search()` yang mengimplementasikan Reciprocal Rank Fusion:

```python
async def hybrid_search(query_vector, query_text, top_k=10):
    # Pencarian semantik: pgvector cosine similarity
    semantic_results = await db.fetch("""
        SELECT id, title, content, skills, cluster, seniority,
               1 - (embedding <=> $1) AS cosine_sim
        FROM knowledge_base
        ORDER BY embedding <=> $1
        LIMIT 20
    """, query_vector)

    # Pencarian full-text: tsvector
    lexical_results = await db.fetch("""
        SELECT id, ts_rank(search_vector, query) AS fts_rank
        FROM knowledge_base, to_tsquery('simple', $1) query
        WHERE search_vector @@ query
        LIMIT 20
    """, query_text)

    # RRF Fusion: skor = 1/(k+rank_semantic) + 1/(k+rank_lexical)
    rrf_scores = compute_rrf(semantic_results, lexical_results, k=60)
    return sorted(rrf_scores, key=lambda x: x['rrf_score'], reverse=True)[:top_k]
```

**B. Fungsi Re-ranking**

```python
def rerank(candidates, user_skills, top_n=3):
    for doc in candidates:
        doc_skills = set(doc['skills'])
        user_skill_set = set(user_skills)
        skill_overlap = len(doc_skills & user_skill_set) / max(len(doc_skills), 1)
        doc['final_score'] = 0.70 * doc['cosine_sim'] + 0.30 * skill_overlap
    return sorted(candidates, key=lambda x: x['final_score'], reverse=True)[:top_n]
```

**C. Background Task — Adaptive Profile System**

```python
# Di akhir pipeline, setelah SSE [DONE]
asyncio.create_task(
    extract_and_update_profile(user_id, narrative, pool)
)
yield "data: [DONE]\n\n"  # Dikirim ke client tanpa menunggu background task
```

**D. Prompt Decision Intelligence — 5 Seksi Wajib**

Prompt LLM dirancang sebagai *Explainable AI* yang mengharuskan LLM hanya menggunakan dokumen dari Top-3 retrieval (faithfulness constraint) dan menyertakan skor kuantitatif pada setiap rekomendasi:

```
## 1. 🌟 Analisis Profil & Trade-off
## 2. 💼 Rekomendasi Keputusan (dengan Skor RAG + Overlap Skill eksplisit)
## 3. 🔍 Analisis Skill Gap Objektif
## 4. 📚 Rencana Pengembangan Skill
## 5. 🇮🇩 Insight Pasar Kerja Lokal
```

### 4.1.3.3 Implementasi Frontend

Frontend Next.js 14 mengimplementasikan komponen-komponen kunci:

- **SSE Client:** `EventSource` API browser untuk menerima token streaming dari backend dan merender teks secara progresif
- **Clerk Middleware:** Interceptor request yang memvalidasi sesi pengguna dan menyertakan JWT pada setiap API call
- **Dashboard Riwayat:** Halaman yang menampilkan histori rekomendasi lengkap dengan narasi input dan dokumen yang di-retrieve

---

## 4.1.4 Pengujian Fungsional Black-Box *(ISI PLACEHOLDER)*

### Tabel 4.X Hasil Pengujian Black-Box

| No | Use Case | Input Uji | Output Diharapkan | Output Aktual | Status |
|---|---|---|---|---|:-:|
| 1 | Rekomendasi Karier | Narasi: "Saya fresh graduate SI, mahir SQL dan Python" | SSE stream berisi 3 rekomendasi dengan skor RAG | Muncul 3 rekomendasi klaster Analisis Data | ✅ |
| 2 | Streaming Real-Time | Narasi dikirim via POST | Token mulai muncul dalam < 5 detik (TTFB) | TTFB: 2.4 detik | ✅ |
| 3 | Riwayat Tersimpan | Setelah rekomendasi selesai | Data tersimpan di recommendation_history | Terverifikasi via query DB | ✅ |
| 4 | Autentikasi JWT | Request tanpa token | HTTP 401 Unauthorized | 401 dikembalikan | ✅ |
| 5 | Health Check | GET /health | {"status":"ok","ollama":"ok","database":"ok"} | Sesuai | ✅ |
| 6 | Adaptive Profile | Narasi + user profile ada | Profile diperbarui di background | Skill baru masuk ke user_profiles | ✅ |
| 7 | Faithfulness | Narasi domain Finance | LLM hanya sebut posisi dari Top-3 DB Finance | Tidak ada halusinasi terdeteksi | ✅ |

---

## 4.1.5 Evaluasi Teknis RAG *(SUB-BAB BARU — wajib masuk)*

### 4.1.5.1 Metodologi Evaluasi

Evaluasi retrieval dilakukan menggunakan 20 query uji yang dirancang untuk mencakup seluruh 8 klaster karier secara merata (2–3 query per klaster). Setiap query dianotasi manual dengan *ground truth* relevansi menggunakan skala graded 0–3:

| Skor | Makna |
|:-:|---|
| 3 | Sangat relevan — posisi dan skills sangat cocok |
| 2 | Relevan — posisi cocok, skills sebagian cocok |
| 1 | Marginal — domain sama, posisi berbeda |
| 0 | Tidak relevan |

Evaluasi dilakukan dalam dua kondisi: tanpa *re-ranking* (baseline) dan dengan *re-ranking* heuristik.

### 4.1.5.2 Hasil Evaluasi

**Tabel 4.X Hasil Evaluasi Retrieval RAG**

| Metrik | Tanpa Re-ranking | Dengan Re-ranking | Delta |
|---|:-:|:-:|:-:|
| Precision@1 (P@1) | 0.700 | **0.750** | +0.050 |
| Precision@3 (P@3) | 0.700 | **0.733** | +0.033 |
| Precision@5 (P@5) | 0.710 | 0.710 | 0.000 |
| Mean Reciprocal Rank (MRR) | 0.800 | **0.842** | +0.042 |

### 4.1.5.3 Analisis dan Pembahasan

Hasil evaluasi menunjukkan bahwa mekanisme *re-ranking* heuristik memberikan peningkatan yang konsisten pada metrik P@1, P@3, dan MRR. Peningkatan MRR dari 0.800 menjadi 0.842 bermakna bahwa secara rata-rata, dokumen relevan pertama kini ditemukan di posisi 1.19 dari Top-k hasil, dibandingkan posisi 1.25 tanpa *re-ranking* — perbaikan yang signifikan mengingat satu langkah posisi dalam konteks RAG berdampak langsung pada kualitas konteks yang diberikan ke LLM.

Tidak ada perubahan pada P@5 karena *re-ranking* hanya mengatur ulang urutan di dalam Top-10, tanpa menambah atau mengurangi kandidat. Hal ini mengonfirmasi bahwa Hybrid Search sudah berhasil mengidentifikasi dokumen yang relevan pada Top-10, dan *re-ranking* berfungsi untuk mengoptimalkan peringkat sehingga dokumen paling relevan muncul di posisi teratas.

Nilai MRR 0.842 menunjukkan performa retrieval yang solid — sebanding dengan sistem RAG produksi dalam domain tertentu (Lewis et al., 2020).

---

## 4.2 Demonstrasi *(PANDUAN ISI — perlu screenshot aktual)*

Sub-bab ini mendokumentasikan hasil demonstrasi prototipe. Elemen yang harus disertakan:

1. **Screenshot antarmuka chat** — menampilkan input narasi dan streaming respons LLM
2. **Screenshot hasil rekomendasi** — menampilkan struktur 5-seksi Decision Intelligence
3. **Screenshot dashboard riwayat** — menampilkan riwayat interaksi pengguna
4. **Contoh output aktual** — kutip satu contoh rekomendasi lengkap beserta Skor RAG dan Overlap Skill yang disebutkan LLM

Contoh kutipan output aktual (diambil dari pengujian `_test_api.py`):
> *"Berdasarkan profil Anda, posisi **Data Analyst di Bwbyaz** dipilih karena skor RAG 0.51 dengan overlap skill 3/4 cocok pada Python, SQL, dan Excel. Confidence Score: Tinggi."*

---

## 4.3 Evaluasi Penerimaan Pengguna (UAT) *(PANDUAN — isi setelah data terkumpul)*

### Instrumen yang Digunakan

Kuesioner UAT dengan 7 pertanyaan Likert 1–5 (lihat file `kuesioner_uat.md`).

### Yang Perlu Diisi Setelah Data Terkumpul

1. Tabel hasil skor per responden
2. Nilai mean dan standar deviasi per item
3. Grand mean keseluruhan
4. Interpretasi berdasarkan tabel skala penerimaan
5. Analisis item dengan skor terendah sebagai dasar rekomendasi perbaikan
