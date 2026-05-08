# REVISI BAB 2 — LANDASAN TEORI
## NusaNara: Sistem Bimbingan Karier Berbasis RAG
### Dokumen Revisi untuk Penyesuaian Implementasi Aktual

> **Catatan:** File ini berisi narasi pengganti/tambahan untuk Bab 2 draf skripsi.
> Setiap seksi diberi label sub-bab yang sesuai dengan struktur draf asli.
> **Diksi yang harus di-find-replace global:** React.js→Next.js 14, ChromaDB→PostgreSQL+pgvector, Gemini API→Ollama, Qwen2.5:3b→Llama 3.1

---

## 2.14.2 Basis Data Vektor *(REVISI — ganti contoh teknologi)*

### Narasi Pengganti Paragraf Contoh Implementasi

Basis data vektor dirancang khusus untuk menyimpan dan melakukan pencarian efisien pada data berdimensi tinggi. Secara historis, solusi *standalone* seperti Milvus, Pinecone, dan Weaviate banyak digunakan untuk tujuan ini. Namun, perkembangan terkini menunjukkan pendekatan yang lebih terintegrasi melalui ekstensi basis data relasional yang sudah ada. Salah satu implementasi yang paling signifikan adalah **pgvector**, sebuah ekstensi open-source untuk PostgreSQL yang memungkinkan penyimpanan vektor berdimensi tinggi dan pencarian *Approximate Nearest Neighbor* (ANN) secara native di dalam basis data relasional.

Pendekatan terintegrasi ini menawarkan beberapa keunggulan fundamental. Pertama, keseragaman sistem (*unified architecture*) — data teks, vektor, dan relasional tersimpan dalam satu transaksi ACID yang sama, mengeliminasi kompleksitas sinkronisasi antara dua sistem terpisah. Kedua, kemampuan *hybrid search* secara native — pencarian semantik berbasis vektor dapat digabungkan dengan pencarian *full-text* (FTS) melalui `tsvector` dalam satu query SQL. Ketiga, kemudahan pemeliharaan operasional — hanya satu infrastruktur yang perlu di-*backup*, di-*monitor*, dan di-*scale*.

Dalam penelitian ini, pgvector digunakan untuk menyimpan embedding 768 dimensi dari 720 dokumen lowongan pekerjaan, yang kemudian diindeks menggunakan algoritma **IVFFlat** untuk mempercepat pencarian ANN. Setiap vektor dihasilkan oleh model `nomic-embed-text-v2-moe` dan disimpan dalam kolom bertipe `VECTOR(768)` pada tabel `knowledge_base`.

---

## 2.X Hybrid Search *(BARU — sub-bab baru)*

### 2.X.1 Konsep dan Motivasi

*Hybrid Search* merupakan pendekatan pencarian informasi yang menggabungkan dua paradigma yang berbeda secara komplementer: pencarian semantik berbasis vektor (*dense retrieval*) dan pencarian berbasis kata kunci (*sparse retrieval* atau *lexical search*). Masing-masing memiliki kelemahan inheren: pencarian semantik mampu memahami sinonim dan konteks makna tetapi lemah terhadap kecocokan istilah teknis spesifik (*exact match*); sebaliknya, pencarian kata kunci sangat tepat untuk istilah spesifik tetapi tidak memahami variasi makna (Luan et al., 2021).

Dalam konteks sistem rekomendasi karier, kedua kelemahan ini bersifat kritis. Pengguna yang menyebutkan "saya mahir Python" membutuhkan kecocokan semantik untuk menemukan posisi "Software Engineer" yang tidak secara eksplisit menyebut Python, namun juga membutuhkan kecocokan *exact match* untuk nama teknologi spesifik seperti "FastAPI" atau "TensorFlow". *Hybrid Search* hadir sebagai solusi untuk menggabungkan kekuatan keduanya.

### 2.X.2 Implementasi dalam PostgreSQL

Pada penelitian ini, *Hybrid Search* diimplementasikan menggunakan dua fitur native PostgreSQL:

1. **Pencarian Semantik via pgvector:** Menggunakan operator `<=>` (Cosine Distance) untuk menemukan dokumen yang paling dekat secara semantik dengan vektor query.
2. **Pencarian Kata Kunci via tsvector/tsquery:** Menggunakan indeks GIN pada kolom `search_vector` (berisi gabungan `title`, `skills`, dan `cluster`) untuk kecocokan leksikal yang akurat.

Kedua sinyal pencarian ini menghasilkan dua *ranked list* terpisah yang kemudian digabungkan menggunakan teknik **Reciprocal Rank Fusion (RRF)**.

---

## 2.X+1 Reciprocal Rank Fusion (RRF) *(BARU — sub-bab baru)*

Reciprocal Rank Fusion (RRF) adalah algoritma *rank aggregation* yang menggabungkan beberapa *ranked list* menjadi satu peringkat tunggal tanpa memerlukan normalisasi skor eksplisit (Cormack, Clarke & Buettcher, 2009). RRF terbukti lebih robust dibandingkan pendekatan linear combination karena tidak sensitif terhadap perbedaan skala skor antar sistem yang berbeda.

Rumus RRF untuk menggabungkan dua *ranked list* adalah:

$$RRF\_score(d) = \frac{1}{k + rank_{semantic}(d)} + \frac{1}{k + rank_{lexical}(d)}$$

Di mana:
- $d$ = dokumen kandidat
- $rank_{semantic}(d)$ = peringkat dokumen $d$ dalam hasil pencarian semantik
- $rank_{lexical}(d)$ = peringkat dokumen $d$ dalam hasil pencarian kata kunci
- $k$ = konstanta smoothing (umumnya $k = 60$, divalidasi oleh Cormack et al., 2009)

Dokumen yang muncul di peringkat tinggi pada **kedua** sistem akan mendapatkan skor RRF yang signifikan lebih tinggi, sehingga secara alami memprioritaskan hasil yang relevan secara semantik sekaligus cocok secara leksikal. Dalam sistem NusaNara, RRF digunakan untuk menghasilkan 10 kandidat teratas dari kombinasi pencarian semantik dan FTS, yang kemudian diproses lebih lanjut oleh tahap *re-ranking*.

---

## 2.X+2 Server-Sent Events (SSE) *(BARU — sub-bab baru)*

*Server-Sent Events* (SSE) adalah standar web API yang memungkinkan server mengirimkan data ke klien secara *unidirectional* melalui koneksi HTTP yang persisten (W3C, 2015). Berbeda dengan WebSocket yang bersifat *bidirectional*, SSE dirancang khusus untuk aliran data satu arah dari server ke klien, menjadikannya pilihan yang lebih sederhana dan efisien untuk kasus penggunaan *streaming* teks.

Dalam konteks LLM, SSE menjadi mekanisme standar de facto untuk mengirimkan token respons satu per satu secara real-time, sehingga pengguna dapat mulai membaca respons sebelum LLM selesai menghasilkan keseluruhan teks. Hal ini secara signifikan menurunkan persepsi latensi (*perceived latency*) — pengguna merasakan sistem merespons dalam hitungan detik meskipun total waktu *generation* lebih panjang.

Secara teknis, SSE menggunakan format `text/event-stream` dengan header HTTP standar:

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

Setiap event dikirim dalam format: `data: {payload}\n\n`. Dalam implementasi NusaNara, FastAPI menggunakan `StreamingResponse` dengan generator asinkron untuk mengalirkan token dari Ollama langsung ke klien Next.js melalui `EventSource` API bawaan browser.

---

## 2.X+3 Model Embedding: nomic-embed-text-v2-moe *(BARU — bagian dalam 2.14 atau sub-bab baru)*

Model embedding yang digunakan dalam penelitian ini adalah **`nomic-embed-text-v2-moe`**, yang dikembangkan oleh Nomic AI. Model ini merupakan implementasi arsitektur *Mixture-of-Experts* (MoE) yang dirancang khusus untuk tugas *text embedding* dengan menghasilkan representasi vektor 768 dimensi (Nomic AI, 2024).

Keunggulan utama model ini untuk konteks penelitian:

1. **Open-source dan dapat dijalankan lokal:** Model berjalan sepenuhnya di infrastruktur lokal via Ollama, tanpa ketergantungan pada API eksternal berbayar, sehingga privasi data pengguna terjaga sepenuhnya.
2. **Arsitektur MoE:** Setiap token diproses secara selektif oleh subset *expert* yang relevan, menghasilkan representasi yang lebih kaya dibandingkan model *dense* dengan parameter yang sama.
3. **Dimensi 768:** Kompatibel dengan tipe `VECTOR(768)` pada pgvector dan memberikan representasi yang cukup ekspresif untuk domain teks karier berbahasa Indonesia.
4. **Instruksi Prefix:** Model mendukung penggunaan prefix `search_query:` dan `search_document:` untuk membedakan representasi query dari representasi dokumen, mengikuti paradigma *asymmetric embedding*.

---

## 2.7 Large Language Model *(REVISI — tambahkan sub-seksi Local LLM)*

### 2.7.X Local LLM dan Platform Ollama *(BARU)*

Perkembangan terkini dalam ekosistem LLM menghadirkan paradigma baru: model bahasa besar dapat dijalankan secara lokal di infrastruktur pribadi tanpa bergantung pada layanan *cloud* berbayar. Paradigma ini dimungkinkan oleh beberapa inovasi: teknik kuantisasi model (GGUF, GPTQ) yang secara dramatis mengurangi kebutuhan memori GPU/CPU, serta ketersediaan model *open-weight* berkualitas tinggi seperti keluarga Llama dari Meta AI.

**Ollama** adalah platform yang menyederhanakan proses menjalankan LLM secara lokal. Ollama menyediakan antarmuka HTTP yang kompatibel dengan standar OpenAI API, sehingga memudahkan integrasi dengan berbagai framework pengembangan. Model diunduh satu kali dan dijalankan sebagai layanan lokal yang persisten, dapat diakses melalui `http://localhost:11434`.

| Aspek | Cloud API (Gemini, OpenAI) | Local LLM (Ollama) |
|---|---|---|
| Privasi data | Data dikirim ke server eksternal | Data tetap di infrastruktur lokal |
| Biaya operasional | Per-token billing | Gratis setelah setup awal |
| Latensi | Bergantung pada jaringan | Bergantung pada hardware lokal |
| Kontrol | Terbatas, bergantung vendor | Penuh, termasuk parameter model |
| Ketersediaan offline | Tidak | Ya |

Dalam penelitian ini, Ollama digunakan untuk menjalankan dua model secara lokal:

1. **Llama 3.1 (8 miliar parameter):** Dikembangkan oleh Meta AI, digunakan sebagai *Main RAG Agent* (generator rekomendasi berbasis konteks) dan *Extractor Agent* (ekstraksi JSON terstruktur dari narasi pengguna). Model ini dipilih karena kemampuannya mengikuti instruksi kompleks dalam bahasa Indonesia dengan baik.

2. **nomic-embed-text-v2-moe:** Digunakan sebagai model embedding untuk mengubah narasi teks menjadi vektor 768 dimensi yang dapat digunakan dalam pencarian semantik.

---

## 2.15/2.16 Framework dan Library *(REVISI — perbarui ke stack aktual)*

### Framework Backend: FastAPI

FastAPI adalah *web framework* modern untuk Python yang dirancang dari awal untuk mendukung operasi asinkron (*async/await*) berdasarkan standar ASGI (*Asynchronous Server Gateway Interface*). Dibandingkan dengan framework sinkron seperti Flask atau Django, FastAPI memberikan throughput yang secara signifikan lebih tinggi untuk beban kerja I/O-bound seperti koneksi database dan pemanggilan layanan eksternal (Ramírez, 2018).

Dalam penelitian ini, FastAPI dipilih karena tiga alasan utama: (1) dukungan native untuk `StreamingResponse` yang diperlukan untuk implementasi SSE, (2) integrasi seamless dengan library asyncpg untuk koneksi database non-blocking, dan (3) validasi request/response otomatis menggunakan Pydantic.

### Library Database: asyncpg

`asyncpg` adalah PostgreSQL database driver berkinerja tinggi untuk Python yang dibangun di atas protokol PostgreSQL biner dan mendukung penuh model pemrograman asinkron. Berbeda dengan psycopg2 yang bersifat sinkron, asyncpg memungkinkan FastAPI untuk menangani ribuan koneksi database secara bersamaan tanpa memblokir event loop.

### Framework Frontend: Next.js 14

Next.js adalah *meta-framework* React yang dikembangkan oleh Vercel, menyediakan fitur-fitur produksi seperti *Server-Side Rendering* (SSR), *App Router*, *Image Optimization*, dan *Edge Runtime*. Dalam penelitian ini, Next.js 14 digunakan dengan TypeScript untuk keamanan tipe (*type safety*) dan pola *App Router* untuk organisasi routing yang lebih modular.

### Autentikasi: Clerk

Clerk adalah platform *authentication-as-a-service* yang menyediakan komponen UI siap pakai dan JWT-based session management. Dalam arsitektur sistem ini, Clerk menerbitkan token JWT yang ditandatangani secara asimetris (algoritma RS256). Backend FastAPI memverifikasi token tersebut menggunakan JWKS (*JSON Web Key Set*) yang di-*cache* secara lokal untuk menghindari latensi tambahan pada setiap permintaan.

