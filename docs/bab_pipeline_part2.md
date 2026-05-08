# BAB IV — METODOLOGI PEMBANGUNAN SISTEM NUSANARA
## Rekayasa Vektor, Mekanisme Retrieval, dan Evaluasi Kualitas RAG

---

## 4.1 Tahap 04 — Vector Embedding & Mesin Pencari Hybrid

Pada Tahap 04, data lowongan kerja tekstual yang telah dibersihkan diubah menjadi representasi numerik. Proses ini memungkinkan sistem melakukan pencarian berdasarakan kedekatan semantik (*semantic search*), serta menggabungkannya dengan pencarian teks tradisional (*full-text search*) untuk menghasilkan relevansi pencarian yang optimal.

### 4.1.1 Definisi *Vector Embedding* dan Implementasi Model

*Vector embedding* adalah metode representasi data teks di mana kata, frasa, atau dokumen dipetakan menjadi array berisi bilangan riil (vektor) dalam ruang berdimensi tinggi. Pemetaan ini didefinisikan sebagai fungsi $f: T \rightarrow \mathbb{R}^n$, di mana $T$ adalah input teks dan $n$ adalah jumlah dimensi vektor.

Dalam sistem NusaNara, model yang digunakan untuk menghasilkan vektor adalah **`nomic-embed-text-v2-moe`**. Model ini dipilih karena menggunakan arsitektur *Sparse Mixture-of-Experts* (MoE) yang secara dinamis memilih sub-jaringan (pakar) yang relevan selama inferensi, sehingga menghasilkan efisiensi komputasi tinggi sekaligus performa klasifikasi makna yang kompetitif dengan model berparameter besar (Nussbaum et al., 2025). Output dari model ini adalah vektor berdimensi $n = 768$.

Secara sederhana, alur pipeline implementasi *embedding* pada sistem NusaNara dapat diilustrasikan sebagai berikut:

```text
[Teks Dokumen Lowongan] 
       │
       ▼
  (Tokenizer)
       │
       ▼
[Model: Nomic-Embed-Text v2 MoE]
       │
       ▼
[Vektor Numerik: 768 Dimensi]
       │
       ▼
[Database: PostgreSQL (pgvector)]
```

### 4.1.2 Pemrosesan Teks Dataset Menjadi Vektor

Dalam implementasi aktualnya, teks dari dataset (sebesar 720 data lowongan) digabungkan terlebih dahulu menjadi satu string konteks (*content formulation*). Model Nomic menggunakan *asymmetric embedding*, yang mengharuskan penggunaan *prefix* eksplisit untuk membedakan antara teks referensi dan teks kueri:
- Prefix `search_document: ` disematkan pada setiap data lowongan kerja sebelum diubah menjadi vektor.
- Prefix `search_query: ` disematkan pada masukan dari pengguna sebelum dicari di basis data.

Sebagai contoh implementasi pada sistem, satu data lowongan kerja:
`search_document: Data Analyst di PT Solusi Digital. Klaster: Analisis Data. Keahlian: SQL, Python, Excel. Syarat: Minimal 1 tahun pengalaman.`

Teks tersebut dimasukkan ke dalam model dan dikonversi menjadi array dengan panjang 768 nilai bilangan riil.
$$\vec{V}_{doc} = [0.1245, -0.8932, 0.4511, 0.0092, \dots, -0.3341]$$

Vektor ini kemudian disimpan di PostgreSQL pada kolom dengan tipe data `VECTOR(768)` yang didukung oleh ekstensi `pgvector`.

### 4.1.3 Perhitungan Jarak Semantik dengan *Cosine Similarity*

Untuk mencari lowongan kerja yang relevan dengan profil pengguna, sistem mengukur jarak kemiripan antara vektor kueri ($\mathbf{Q}$) dan vektor dokumen ($\mathbf{D}$) di basis data menggunakan metrik **Cosine Similarity**. 

Sebagai ilustrasi sederhana, bayangkan ruang 2 dimensi dengan dua vektor:
- Vektor Kueri $\mathbf{Q} = [1, 0]$
- Vektor Dokumen $\mathbf{D} = [0.5, 0.5]$

Langkah perhitungannya adalah:
1. **Dot Product (Perkalian Titik):** $\mathbf{Q} \cdot \mathbf{D} = (1 \times 0.5) + (0 \times 0.5) = 0.5$
2. **Magnitudo $\mathbf{Q}$:** $\|\mathbf{Q}\| = \sqrt{1^2 + 0^2} = 1$
3. **Magnitudo $\mathbf{D}$:** $\|\mathbf{D}\| = \sqrt{0.5^2 + 0.5^2} = \sqrt{0.5} \approx 0.707$
4. **Cosine Similarity:** $\frac{0.5}{1 \times 0.707} \approx 0.707$

Nilai $0.707$ (atau sudut $45^\circ$) menunjukkan adanya kemiripan sebagian antara kedua vektor tersebut. Dalam sistem NusaNara, perhitungan yang sama persis diterapkan, namun pada ruang berdimensi 768. Implementasinya dilakukan secara efisien di tingkat basis data menggunakan operator `vector_cosine_ops` bawaan `pgvector`.

### 4.1.4 Implementasi Mesin Pencari Hybrid dengan RRF

Pencarian vektor (Semantik) sangat baik dalam menangkap konteks kalimat, namun memiliki keterbatasan dalam pencocokan kata kunci eksak (*exact match*). Untuk mengatasinya, sistem menggabungkan pencarian vektor dengan *Full-Text Search* (FTS) menggunakan `TSVECTOR` pada PostgreSQL. Algoritma yang digunakan untuk menggabungkan dua hasil pencarian yang berbeda ini adalah **Reciprocal Rank Fusion (RRF)**.

Rumus RRF mengalkulasi skor baru berdasarkan *peringkat* dokumen dari masing-masing metode pencarian:
$$\text{RRFScore}(d) = \sum_{r \in R} \frac{1}{k + \text{rank}(d, r)}$$
Di mana $k$ adalah konstanta stabilitas (disetel pada nilai 60), dan $\text{rank}(d, r)$ adalah peringkat dokumen $d$ pada hasil pencarian algoritma $r$.

Sebagai contoh, jika sebuah lowongan menduduki peringkat ke-2 di pencarian vektor dan peringkat ke-5 di pencarian FTS, skor akhirnya adalah:
$$\text{RRFScore} = \frac{1}{60 + 2} + \frac{1}{60 + 5} = \frac{1}{62} + \frac{1}{65} \approx 0.0161 + 0.0153 = 0.0314$$
Skor ini kemudian diurutkan secara menurun untuk mendapatkan hasil pencarian gabungan (Top 10) yang secara semantik akurat dan secara leksikal tepat.

---

## 4.2 Tahap 05 — Evaluasi Kualitas Retrieval RAG

Evaluasi dilakukan untuk memvalidasi kinerja komponen pencari (*Retriever*) sebelum dokumen dikirim ke komponen *Generator* (LLM). Kualitas *Retriever* sangat menentukan akurasi respons LLM pada sistem RAG.

### 4.2.1 Metodologi Evaluasi dan Pengumpulan *Ground Truth*

Dataset sistem terdiri dari **720 data lowongan kerja** yang terbagi rata dalam 8 klaster karier. Pengujian sistem dilakukan menggunakan *Ground Truth* yang terdiri dari **20 kueri pengguna** yang mewakili profil pelamar dengan berbagai tingkat keahlian dan variasi klaster.

**Contoh 3 Kueri Pengujian:**
1. *"Saya fresh graduate S1 Sistem Informasi, mahir Excel dan SQL, pernah buat dashboard Power BI. Ingin berkarier sebagai data analyst."*
2. *"Saya punya pengalaman 3 tahun sebagai social media manager, terbiasa pakai Meta Ads dan Google Analytics. Sedang cari posisi digital marketing specialist tingkat senior."*
3. *"Saya bisa menggunakan Figma dan Adobe XD untuk membuat prototipe UI/UX, tapi belum ada pengalaman kerja formal."*

Setiap kueri dipetakan secara manual ke dokumen-dokumen lowongan kerja mana saja di dalam basis data (720 baris) yang dianggap relevan secara objektif. Label manual ini bertindak sebagai *Ground Truth* (kunci jawaban).

### 4.2.2 Metrik Evaluasi: Precision@k dan MRR

Untuk mengukur akurasi, digunakan dua metrik *Information Retrieval*:

**1. Precision at k (P@k)**  
Mengukur rasio dokumen relevan dalam $k$ daftar dokumen teratas yang dihasilkan sistem.  
$$P@k = \frac{\text{Jumlah dokumen relevan di Top-}k}{k}$$

**2. Mean Reciprocal Rank (MRR)**  
Mengukur rata-rata dari posisi peringkat dokumen relevan *pertama* yang ditemukan oleh sistem.  
$$\text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$$
Apabila dokumen relevan pertama ada di urutan 1, nilainya 1. Jika di urutan 2, nilainya 0.5. Metrik ini krusial untuk memastikan pengguna tidak perlu melihat terlalu banyak hasil yang salah sebelum menemukan rekomendasi yang relevan.

### 4.2.3 Analisis Hasil Evaluasi

Evaluasi membandingkan sistem *Hybrid Search* biasa melawan sistem yang ditambahkan modul **Re-ranking**. Modul *Re-ranking* mengevaluasi 10 kandidat teratas dari pencarian dengan menghitung indeks kesamaan (Jaccard Index) pada field *skills* dan filter absolut pada field pengalaman kerja minimal.

**Tabel 4.1 — Hasil Evaluasi Retrieval RAG (N=20 kueri)**

| Metrik Evaluasi | Hybrid Search (Tanpa Re-ranking) | Hybrid Search (Dengan Re-ranking) |
|---|:---:|:---:|
| **P@1** | 0.700 | **0.750** |
| **P@3** | 0.700 | **0.733** |
| **MRR** | 0.800 | **0.842** |

Implementasi *Re-ranking* berhasil menaikkan metrik **MRR dari 0.800 menjadi 0.842**. Kenaikan P@1 menjadi 0.750 menunjukkan bahwa dalam 75% kueri yang diujikan, posisi pekerjaan yang menempati peringkat absolut pertama adalah posisi yang benar-benar relevan dengan profil pelamar. Penggabungan *similarity* spasial dengan penyaringan diskrit (Jaccard *skill match*) terbukti efektif menghindari *false positive* yang sering terjadi apabila hanya mengandalkan perhitungan kosinus semata.

---

## 4.3 Tahap 06 — Pengembangan Backend API & Integrasi LLM

Tahap terakhir pada pipeline adalah mengekspos model *Retriever* dan *Generator* (LLM) melalui sebuah antarmuka pemrograman aplikasi (API) yang diimplementasikan menggunakan kerangka kerja web **FastAPI** di Python.

### 4.3.1 Implementasi API dengan FastAPI

FastAPI digunakan karena mendukung paradigma *Asynchronous I/O* (AIO) bawaan Python (`asyncio`). Hal ini krusial untuk RAG karena banyak waktu komputasi yang dihabiskan untuk menunggu (*blocking*) balasan kueri dari basis data PostgreSQL (`asyncpg`) dan layanan LLM lokal. Dengan pendekatan *asynchronous*, *thread* peladen web tidak terkunci (*blocked*) saat menunggu balasan, meningkatkan efisiensi konkurensi peladen.

### 4.3.2 Komunikasi Data dengan *Server-Sent Events (SSE)*

Pemrosesan *Large Language Model* (seperti Llama 3.1) bersifat *auto-regressive*, yaitu melakukan prediksi dan mencetak probabilitas keluaran kata demi kata. Menunggu LLM menyelesaikan satu paragraf utuh sebelum dikirimkan akan menghasilkan *Time To First Byte* (TTFB) yang sangat tinggi (di atas 10 detik).

Solusinya, koneksi klien dan peladen menggunakan protokol **Server-Sent Events (SSE)**. Lewat SSE, *backend* langsung menyalurkan (*stream*) patahan kata kepada antarmuka sistem (React/Next.js) sesaat setelah diprediksi oleh LLM. Implementasi ini berhasil menurunkan latensi respons visual menjadi sekitar 2,4 detik saja, meniru pengalaman pengguna pada *chatbot* konvensional.

### 4.3.3 Konstruksi *Prompt* untuk Llama 3.1

Dalam sistem RAG, prompt bukan sekadar pertanyaan, melainkan injeksi konteks. Kode sistem (`build_prompt()`) menggabungkan teks profil dari pengguna dengan teks spesifikasi dari Top 3 lowongan hasil pengambilan (*retrieval*).

Llama 3.1 kemudian diinstruksikan lewat sebuah templat sistem (*system prompt*) yang ketat. Model diwajibkan untuk:
1. Meringkas kesesuaian antara latar belakang profil kandidat dengan posisi yang diusulkan.
2. Mencetak bukti kecocokan dengan mengutip angka RAG (*Cosine Score*) serta angka *Skill Overlap* hasil re-ranking.
3. Memberikan rekomendasi kesenjangan (*gap analysis*) secara nyata dan objektif.

Hal ini bertujuan mereduksi kemungkinan LLM menghasilkan keluaran yang tidak beralasan faktual, sekaligus menegaskan bahwa keputusan bersumber dari dokumen relevan yang disuapkan dari basis data.

---

## 4.4 Kesimpulan Bab

Sistem pipeline mulai dari pembuatan vektor menggunakan model berbasis MoE (*Nomic-Embed-Text*), integrasi hibrida pada algoritma pemeringkatan (*Reciprocal Rank Fusion*), kalibrasi ulang lewat *Jaccard Index*, hingga perangkaian asinkronis dengan FastAPI dan model Llama 3.1, telah dieksekusi dan dievaluasi secara metodologis. Raihan nilai MRR sebesar 0.842 mengafirmasi bahwa skema *Retrieval-Augmented Generation* yang diimplementasikan telah mampu memadankan masukan naratif kompetensi kandidat dengan daftar spesifikasi ketenagakerjaan secara cepat, tepat, dan dapat dipertanggungjawabkan hasilnya.
