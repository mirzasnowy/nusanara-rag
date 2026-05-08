# REVISI BAB 3 — OBJEK DAN METODOLOGI PENELITIAN
## NusaNara: Sistem Bimbingan Karier Berbasis RAG
### Dokumen Revisi untuk Penyesuaian Implementasi Aktual

> **Catatan:** File ini berisi narasi pengganti untuk Bab 3. Bagian yang tidak disebutkan di sini tidak berubah.

---

## 3.2.1 Jenis Artefak Penelitian *(REVISI — ganti model LLM dan database)*

### Narasi Pengganti Paragraf Poin 1 (Model)

**1. Model (Arsitektur Konseptual):**
Artefak ini berupa model konseptual berupa cetak biru (*blueprint*) arsitektur sistem *full-stack* yang komprehensif. Model ini merinci orkestrasi antara empat lapisan utama:

- **Lapisan Antarmuka (*Frontend*):** Next.js 14 dengan TypeScript, dilengkapi dengan komponen *streaming* berbasis `EventSource` API dan manajemen sesi pengguna melalui Clerk.
- **Lapisan Logika (*Backend*):** FastAPI (Python) dengan Uvicorn sebagai server ASGI, mengimplementasikan pipeline RAG lengkap dengan dukungan *Server-Sent Events* (SSE) untuk pengiriman respons secara real-time.
- **Lapisan Penyimpanan (*Database*):** PostgreSQL 16 sebagai *single source of truth* yang menyimpan data teks, vektor embedding (`VECTOR(768)` via ekstensi pgvector), indeks *full-text search* (`tsvector`), profil pengguna, dan riwayat rekomendasi dalam satu sistem terpadu.
- **Lapisan Inferensi Lokal (*Local AI*):** Ollama sebagai platform *inference* yang menjalankan dua model secara lokal — **Llama 3.1 (8 miliar parameter)** sebagai *generator* dan *extractor agent*, serta **nomic-embed-text-v2-moe** sebagai model embedding 768 dimensi.

Keseluruhan arsitektur ini dirancang dalam kerangka Retrieval-Augmented Generation (RAG) dengan mekanisme *Hybrid Search* (Semantic + Full-Text Search via Reciprocal Rank Fusion) dan *re-ranking* heuristik, khusus untuk konteks bimbingan karier adaptif di Indonesia.

**2. Instantiation (Implementasi Fisik):**
Artefak ini adalah wujud implementasi fisik dari model yang dirancang, yaitu sebuah prototipe fungsional (*proof-of-concept*) aplikasi web yang diberi nama "NusaNara". *Instantiation* ini berfungsi sebagai bukti nyata bahwa arsitektur yang diusulkan dapat diimplementasikan secara teknis, menghasilkan narasi bimbingan karier yang personal, kontekstual, dan dapat divalidasi melalui metriks kuantitatif (Precision@k, Mean Reciprocal Rank).

**3. Method (Alur Kerja Terstruktur):**
Artefak ini berupa metode atau alur kerja terstruktur yang menggabungkan kerangka DSR dengan siklus metode *prototype*. Kontribusi metode ini mencakup: (a) alur sistematis untuk analisis kebutuhan kuantitatif (survei 115 responden) dan pengumpulan basis pengetahuan (*web scraping* 720 lowongan dari Glints); serta (b) alur evaluasi artefak tiga-lapis yang mencakup evaluasi teknis RAG, pengujian *black-box*, dan evaluasi penerimaan pengguna.

---

## 3.3.2 Teknik Pengumpulan Data — Poin 2 *(REVISI TOTAL — data scraping)*

### Narasi Pengganti Poin 2: Pengumpulan Data Konten untuk Basis Pengetahuan AI

Alur ini difokuskan pada pengumpulan data lowongan pekerjaan yang akan mendukung arsitektur RAG sebagai *Knowledge Base*. Pada tahap awal, peneliti mencoba mengumpulkan data dari tiga platform karier terkemuka di Indonesia, yaitu Jobstreet, LinkedIn, dan Glints. Namun, hambatan teknis ditemui pada dua platform pertama: Jobstreet menerapkan proteksi *bot-detection* berbasis Cloudflare yang memblokir permintaan otomatis, sementara LinkedIn tidak menampilkan informasi gaji secara publik — yang merupakan salah satu atribut data yang relevan untuk analisis pasar kerja. Oleh karena itu, Glints dipilih sebagai satu-satunya sumber data berdasarkan aksesibilitas teknis dan kelengkapan data yang disediakannya.

Pengumpulan data dilakukan menggunakan metode *web crawling* dengan skrip otomatis yang membangun Selenium WebDriver dengan konfigurasi **selenium-stealth**, sebuah teknik yang diperlukan karena Glints merupakan *Single Page Application* (SPA) berbasis React yang mengandalkan JavaScript untuk merender konten. Pendekatan ini memungkinkan ekstraksi data secara andal dari konten yang dirender secara dinamis.

Data yang dikumpulkan mencakup atribut utama setiap lowongan: judul posisi, nama perusahaan, lokasi, rentang gaji, keterampilan yang dibutuhkan, dan tingkat senioritas. Pengumpulan data dilakukan secara bertahap melalui dua iterasi: iterasi pertama menghasilkan kumpulan data awal, dan iterasi *top-up* dilakukan untuk memastikan distribusi yang seimbang antar klaster.

Hasil akhir pengumpulan data menghasilkan **720 lowongan pekerjaan** yang terdistribusi secara seimbang ke dalam **8 klaster karier** — masing-masing klaster berisi tepat **90 lowongan**. Distribusi seimbang ini merupakan persyaratan metodologis utama untuk memastikan validitas evaluasi sistem RAG yang adil lintas seluruh domain karier. Rincian 8 klaster tersebut disajikan pada Tabel 3.X.

**Tabel 3.X Distribusi Knowledge Base Berdasarkan 8 Klaster Karier**

| No | Klaster | Jumlah Lowongan |
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

---

## 3.3.3 Teknik Pengembangan Sistem — Poin 3 *(REVISI — stack aktual)*

### Narasi Pengganti Poin 3: Perancangan Prototipe

Desain kemudian diimplementasikan menjadi prototipe fungsional (*Minimum Viable Product*) menggunakan komponen-komponen berikut:

- **Backend:** FastAPI (Python) dengan Uvicorn sebagai ASGI server, mengimplementasikan endpoint `POST /api/recommend` yang mengeksekusi pipeline RAG lengkap dan mengembalikan respons via *Server-Sent Events* (SSE).
- **Database:** PostgreSQL 16 dengan ekstensi `pgvector` sebagai penyimpanan terpadu untuk data teks, vektor embedding, dan profil pengguna. Koneksi database diimplementasikan secara asinkron menggunakan `asyncpg`.
- **Retrieval:** Pipeline *Hybrid Search* yang menggabungkan pencarian semantik (`pgvector`, Cosine Similarity) dengan pencarian kata kunci (`tsvector`, Full-Text Search) melalui algoritma Reciprocal Rank Fusion, diikuti tahap *re-ranking* heuristik.
- **Generasi Teks:** Ollama menjalankan model **Llama 3.1 (8B)** secara lokal sebagai *engine* generasi rekomendasi, dengan konfigurasi `stream=True` untuk mendukung pengiriman token secara real-time.
- **Embedding:** Model **nomic-embed-text-v2-moe** dijalankan via Ollama untuk menghasilkan representasi vektor 768 dimensi dari setiap narasi pengguna dan dokumen lowongan.
- **Frontend:** Next.js 14 dengan TypeScript, menggunakan `EventSource` API untuk menerima aliran token SSE dari backend dan menampilkannya secara progresif kepada pengguna.
- **Autentikasi:** Clerk menyediakan manajemen sesi pengguna dan JWT yang diverifikasi backend menggunakan algoritma RS256.
- **Modul Adaptif:** `memory_service.py` mengimplementasikan *Adaptive Profile System* sebagai *background task* asinkron (`asyncio.create_task()`) yang mengekstrak informasi terstruktur dari narasi pengguna dan memperbarui profil di PostgreSQL tanpa memblokir pipeline RAG utama.

---

## 3.3.4 Teknik Analisis Data *(REVISI TOTAL — metodologi evaluasi 3-layer)*

### Narasi Pengganti Sub-bab 3.3.4

Seluruh analisis data dalam penelitian ini dilakukan secara kuantitatif dan terstruktur menggunakan pendekatan evaluasi tiga lapis yang selaras dengan fase *Demonstration* dan *Evaluation* dalam kerangka DSR (Peffers et al., 2007). Setiap lapis evaluasi menjawab pertanyaan penelitian yang berbeda secara komplementer.

**Lapis 1 — Evaluasi Teknis Retrieval (RAG Evaluation)**

Evaluasi ini mengukur kualitas komponen *retrieval* sistem RAG secara kuantitatif dan objektif menggunakan dua metrik standar *Information Retrieval*:

- **Precision@k (P@k):** Mengukur proporsi dokumen relevan dalam Top-k hasil yang dikembalikan. Dihitung pada k=1, 3, dan 5.

$$P@k = \frac{|\{dokumen\ relevan\} \cap \{Top\text{-}k\ hasil\}|}{k}$$

- **Mean Reciprocal Rank (MRR):** Mengukur posisi rata-rata dokumen relevan pertama dalam daftar hasil, dengan memberikan bobot lebih besar pada posisi yang lebih awal.

$$MRR = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{rank_i}$$

Evaluasi dilakukan menggunakan 20 *query* uji yang dirancang untuk mencakup seluruh 8 klaster karier secara merata. *Ground truth* relevansi diberi anotasi secara manual dengan skala 0–3 (tidak relevan hingga sangat relevan).

**Lapis 2 — Pengujian Fungsional Black-Box**

Pengujian *black-box* memverifikasi bahwa seluruh fitur sistem berjalan sesuai spesifikasi fungsional yang ditetapkan. Setiap *use case* diuji dengan membandingkan input yang diberikan dengan output yang diharapkan, tanpa mempertimbangkan implementasi internal. Hasil pengujian didokumentasikan dalam tabel uji yang menyertakan kondisi uji, data input, output yang diharapkan, output aktual, dan status kelulusan.

**Lapis 3 — Evaluasi Penerimaan Pengguna (User Acceptance Testing/UAT)**

UAT mengukur persepsi pengguna akhir terhadap kegunaan dan relevansi sistem melalui instrumen kuesioner Likert 1–5. Evaluasi ini dilakukan terhadap 10–15 responden yang dipilih secara *purposive sampling*, yaitu mahasiswa aktif yang sedang dalam fase eksplorasi karier. Jumlah sampel ini sesuai dengan rekomendasi evaluasi formatif dalam kerangka DSR (Peffers et al., 2007), di mana tujuan evaluasi adalah memvalidasi kegunaan artefak pada konteks penggunaan yang dituju, bukan menggeneralisasi ke populasi.

Data UAT dianalisis secara deskriptif: dihitung nilai rata-rata (*mean*), standar deviasi, dan persentase persetujuan (skor 4–5) per item pertanyaan, serta *grand mean* keseluruhan untuk menentukan tingkat penerimaan artefak berdasarkan skala interpretasi berikut:

| Rentang Grand Mean | Interpretasi |
|---|---|
| 4.21 – 5.00 | Sangat Baik / Sangat Diterima |
| 3.41 – 4.20 | Baik / Diterima |
| 2.61 – 3.40 | Cukup |
| 1.81 – 2.60 | Tidak Baik |
| 1.00 – 1.80 | Sangat Tidak Baik |

---

## Gambar 3.2 — Narasi Arsitektur Sistem *(REVISI TOTAL)*

### Narasi Pengganti Paragraf di Bawah Gambar 3.2

*(Gunakan gambar baru: `revisi/assets/arsitektur_sistem_nusanara.png`)*

Arsitektur ini, sebagaimana diilustrasikan pada Gambar 3.2, mengorkestrasi alur kerja sistem NusaNara melalui empat lapisan utama yang saling terintegrasi. Antarmuka pengguna dibangun menggunakan **Next.js 14** (TypeScript), sebuah *meta-framework* React yang menyediakan kapabilitas rendering sisi server dan manajemen state yang efisien. Permintaan pengguna berupa narasi karier dikirimkan ke lapisan **FastAPI Backend** melalui koneksi HTTPS yang diautentikasi dengan token JWT dari layanan Clerk.

Setibanya di *backend*, permintaan memicu pipeline RAG lengkap: narasi diubah menjadi vektor 768 dimensi oleh model embedding `nomic-embed-text-v2-moe`, kemudian digunakan untuk pencarian hibrida pada **PostgreSQL 16 + pgvector** — menggabungkan pencarian semantik dengan *full-text search* melalui Reciprocal Rank Fusion. Tiga dokumen paling relevan dari 720 lowongan yang tersedia kemudian menjadi konteks untuk model **Llama 3.1** yang berjalan secara lokal via Ollama.

Respons LLM dikirimkan token per token kepada *frontend* melalui mekanisme **Server-Sent Events (SSE)**, memberikan pengalaman *real-time streaming* yang responsif. Secara bersamaan — setelah respons selesai — sistem secara asinkron memperbarui profil pengguna melalui modul *Adaptive Profile System* tanpa memblokir pipeline utama.

Keseluruhan infrastruktur AI — model LLM, model embedding, dan basis data vektor — berjalan sepenuhnya di lingkungan lokal (VPS), tanpa ketergantungan pada API eksternal berbayar. Pendekatan ini memastikan privasi data pengguna sekaligus mengeliminasi biaya operasional berbasis token.

---

## 3.3.5 Alur Implementasi Penelitian *(REVISI MINOR — sesuaikan diksi)*

Di seluruh sub-bab ini, ganti semua penyebutan:
- "React.js" → "Next.js 14"
- "ChromaDB" → "PostgreSQL 16 dengan ekstensi pgvector"
- "Google Gemini API" → "Ollama (model Llama 3.1)"
- "Qwen2.5:3b" → "Llama 3.1 (8 miliar parameter)"
