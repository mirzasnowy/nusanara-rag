# BAB IV — METODOLOGI: REKAYASA VEKTOR DAN MEKANISME RETRIEVAL

---

## 4.1 Latar Belakang: Arsitektur RAG pada NusaNara

Sistem NusaNara menggunakan paradigma **Retrieval-Augmented Generation (RAG)** untuk menghasilkan rekomendasi karier. Pada RAG, LLM tidak menjawab dari memori latihannya, melainkan membaca dokumen relevan yang terlebih dahulu diambil dari basis pengetahuan (*Knowledge Base*). Ini memastikan respons LLM berlandaskan fakta aktual dari dataset lowongan.

Alur kerja penuh sistem dari input pengguna hingga respons:

```
Narasi Pengguna (teks bebas)
         │
         ▼
  [Query Expansion]      ← Memperkaya query dengan keyword domain (search.py)
         │
         ▼
  [Embedding Model]      ← nomic-embed-text-v2-moe via Ollama
  Text → Vector(768)
         │
         ▼
  ┌──────┴──────┐
  │   pgvector  │   ←── Semantic Search (cosine similarity)
  └──────┬──────┘
         │                    ┌───────────────┐
         ├───────────────────►│  tsvector FTS │ ← Full-text Search
         │                    └───────┬───────┘
         │                            │
         └───────────┬────────────────┘
                     ▼
              [RRF Fusion]    ← Reciprocal Rank Fusion (search.py)
              Top-10 Hasil
                     │
                     ▼
              [Re-ranking]    ← Skill overlap + Cosine score (rerank.py)
              Top-3 Terpilih
                     │
                     ▼
              [LLM: Llama 3.1] ← Prompt + Top-3 context (llm_service.py)
                     │
                     ▼
          Rekomendasi Karier (SSE stream)
```

---

## 4.2 Tahap 04A — Model Embedding: `nomic-embed-text-v2-moe`

### 4.2.1 Alasan Pemilihan Model

Model embedding adalah komponen yang mengubah teks menjadi vektor numerik. Pemilihan model ini krusial karena menentukan kualitas seluruh pencarian semantik.

Model **`nomic-embed-text-v2-moe`** dipilih berdasarkan tiga kriteria:

1. **Dukungan Bahasa Indonesia**: Model ini dilatih pada dataset multilingual yang mencakup **36,4 juta pasang teks Bahasa Indonesia** (Nussbaum & Duderstadt, 2025). Pada benchmark MIRACL (Multilingual Information Retrieval Across a Continuum of Languages), model ini mencapai skor **65.8 nDCG@10** — melampaui model sekelas seperti mE5-Base (62.3) dan mGTE-Base (63.4).

2. **Efisiensi via Mixture-of-Experts (MoE)**: Sebagaimana dijelaskan dalam paper teknis Nomic AI, model ini menggunakan arsitektur *Sparse Mixture-of-Experts* di mana hanya subset parameter yang diaktifkan saat inferensi. Dari total 475 juta parameter, hanya **305 juta yang aktif** (Nussbaum & Duderstadt, 2025). Ini memungkinkan model berjalan secara lokal tanpa GPU khusus.

3. **Deployment Lokal via Ollama**: Seluruh inferensi berjalan di server lokal (`http://localhost:11434`). Tidak ada data pengguna yang dikirim ke layanan eksternal, sesuai prinsip kedaulatan data.

**Tabel 4.1 — Spesifikasi Model Embedding**

| Properti | Nilai |
|---|---|
| Nama model | `nomic-embed-text-v2-moe` |
| Arsitektur | Sparse Mixture-of-Experts (MoE), berbasis XLM-Roberta |
| Total parameter | 475 juta |
| Parameter aktif saat inferensi | 305 juta |
| Dimensi vektor output | **768** |
| Bahasa yang didukung | Multilingual (40+ bahasa termasuk Indonesia) |
| Data latih Bahasa Indonesia | 36,4 juta pasang teks |
| MIRACL Score (multilingual retrieval) | **65.8 nDCG@10** |
| Deployment | Ollama (lokal, offline) |

### 4.2.2 Arsitektur Mixture-of-Experts (MoE)

Model embedding tradisional (*dense model*) mengaktifkan **seluruh** parameternya untuk setiap input, sehingga membutuhkan memori besar. Arsitektur MoE mengatasinya dengan mekanisme **routing**: setiap lapisan MLP diganti dengan beberapa jaringan "pakar" (*experts*), dan sebuah *router network* menentukan pakar mana yang diaktifkan untuk setiap input.

```
Input Token
     │
     ▼
┌────────────────────────────────────┐
│         Router Network             │
│  Hitung skor untuk 8 Expert        │
│  Pilih Top-2 Expert tertinggi      │
└────────┬──────────────┬────────────┘
         │              │
         ▼              ▼
   ┌──────────┐   ┌──────────┐   (6 Expert lain: TIDAK aktif)
   │ Expert 3 │   │ Expert 7 │
   │ (aktif)  │   │ (aktif)  │
   └────┬─────┘   └────┬─────┘
        │              │
        └──────┬───────┘
               ▼
        Output gabungan (weighted sum)
```

Secara matematis, output dari lapisan MoE dihitung sebagai:
$$\text{MoE}(x) = \sum_{i \in \text{TopK}} G(x)_i \cdot E_i(x)$$

Di mana:
- $x$ adalah vektor representasi token input yang sedang diproses
- $G(x)_i$ adalah **bobot probabilitas** (*gating weight*) yang ditetapkan oleh jaringan *router* untuk expert ke-$i$. Hanya Top-2 nilai tertinggi yang bukan nol.
- $E_i(x)$ adalah **hasil komputasi** dari jaringan expert ke-$i$ terhadap input $x$
- Hanya 2 dari 8 expert yang aktif (TopK = 2), sehingga 6 expert lainnya tidak berkontribusi dan tidak mengonsumsi sumber daya komputasi

Sederhananya: *router* memilih 2 "pakar" paling relevan, lalu hasil keduanya dijumlahkan dengan bobot proporsional.

### 4.2.3 Definisi Vector Embedding dan Dimensi 768

*Vector embedding* adalah fungsi pemetaan $f: T \rightarrow \mathbb{R}^{768}$ yang mengubah teks menjadi array berisi 768 bilangan riil.

Keterangan notasi:
- $T$ = teks masukan (bisa berupa kata, kalimat, atau paragraf)
- $\mathbb{R}^{768}$ = ruang vektor berdimensi 768, artinya setiap output adalah daftar berisi tepat 768 angka desimal
- $f$ = model embedding (`nomic-embed-text-v2-moe`) yang melakukan transformasi tersebut

Ide dasarnya: teks yang bermakna serupa akan dipetakan ke vektor yang berdekatan dalam ruang 768-dimensi. Misalnya, kalimat "saya mahir Python dan analisis data" dengan "saya terampil coding Python untuk data science" akan menghasilkan dua vektor yang sangat berdekatan, meskipun kalimatnya berbeda secara harfiah.

Pada sistem ini, proses embedding terjadi di dua konteks berbeda:

| Konteks | Prefix yang Digunakan | Tujuan |
|---|---|---|
| Mengindeks dokumen lowongan ke DB | `search_document: ` | Membuat vektor referensi yang tersimpan di pgvector |
| Memproses query pengguna saat pencarian | `search_query: ` | Membuat vektor query yang dibandingkan dengan vektor dokumen |

Penggunaan prefix berbeda ini bukan sekadar konvensi. Merujuk pada paper Nomic AI (Nussbaum & Duderstadt, 2025), model dilatih menggunakan paradigma *asymmetric biencoder*: query dan dokumen dioptimalkan secara berbeda dalam ruang vektor yang sama menggunakan prefix sebagai instruksi tugas ke model.

### 4.2.4 Pipeline Embedding Dataset (Implementasi Nyata)

**File:** `backend/scripts/embed_knowledge.py`

Sebelum teks lowongan dikirim ke model, metadata terpisah (judul, perusahaan, keahlian, dsb.) digabungkan menjadi satu narasi koheren di kolom `content`:

**Contoh konkret untuk 1 baris dataset (versi final setelah rebuild content):**
```
search_document: Data Analyst di PT Bwbyaz.
Lokasi: Jakarta Selatan, DKI Jakarta.
Gaji: Rp 8 jt - 13 jt.
Klaster: Analisis Data.
Konteks karier: data analyst, analisis data, SQL, Excel, Python,
visualisasi data, dashboard, business intelligence, reporting.
Keahlian: SQL, Excel, Power BI, Python, Data Visualization.
Syarat: Minimal 1 tahun pengalaman.
```

Field **"Konteks karier"** ditambahkan melalui skrip `_rebuild_content.py` — berisi sinonim dan istilah teknis spesifik per sub-peran. Tujuannya memperkaya representasi semantik dokumen, sehingga dokumen lebih mudah ditemukan oleh query yang menggunakan kosakata berbeda namun bermakna sama (misal: *"analisis laporan bisnis"* harus menemukan lowongan *"Business Intelligence Analyst"*).

Teks ini kemudian dikirim ke Ollama melalui HTTP:
```python
# backend/rag/embed.py (implementasi aktual)
async with httpx.AsyncClient(timeout=120) as client:
    response = await client.post(
        "http://localhost:11434/api/embeddings",
        json={"model": "nomic-embed-text-v2-moe", "prompt": content}
    )
    vector = response.json()["embedding"]  # List[float], len=768
```

Output `vector` adalah list Python berisi 768 float, misalnya:
```python
[0.1245, -0.8932, 0.4511, 0.0092, -0.3201, 0.7821, ..., -0.3341]
# ^ indeks 0        ^ indeks 1                              ^ indeks 767
```

Vektor disimpan ke PostgreSQL:
```python
await conn.execute(
    "UPDATE knowledge_base SET content=$1, embedding=$2::vector WHERE id=$3",
    content, str(vector), row_id
)
```

Tipe kolom `embedding VECTOR(768)` ditangani oleh ekstensi `pgvector`.

**Status akhir setelah embedding selesai:**

| Metrik | Nilai |
|---|---|
| Total baris ter-embed | **720** |
| Dimensi vektor | **768** |
| NULL embeddings tersisa | **0** |
| Tipe kolom PostgreSQL | `VECTOR(768)` |

---

## 4.3 Tahap 04B — Pencarian Semantik dengan Cosine Similarity

### 4.3.1 Prinsip Cosine Similarity

Setelah semua dokumen tersimpan sebagai vektor, pencarian dilakukan dengan mengukur kemiripan antara vektor query ($\mathbf{Q}$) dan setiap vektor dokumen ($\mathbf{D}$). Metrik yang digunakan adalah **Cosine Similarity**, yang mengukur kosinus sudut antara dua vektor:

$$\text{CosSim}(\mathbf{Q}, \mathbf{D}) = \frac{\mathbf{Q} \cdot \mathbf{D}}{\|\mathbf{Q}\| \cdot \|\mathbf{D}\|} = \frac{\sum_{i=1}^{768} Q_i D_i}{\sqrt{\sum_{i=1}^{768} Q_i^2} \cdot \sqrt{\sum_{i=1}^{768} D_i^2}}$$

Keterangan variabel:
- $\mathbf{Q}$ = vektor representasi query pengguna, berisi 768 angka riil
- $\mathbf{D}$ = vektor representasi dokumen lowongan yang dibandingkan, berisi 768 angka riil
- $Q_i$ dan $D_i$ = nilai pada dimensi ke-$i$ dari masing-masing vektor (angka tunggal)
- $\mathbf{Q} \cdot \mathbf{D} = \sum_{i=1}^{768} Q_i D_i$ = *dot product* (perkalian titik): setiap pasang nilai pada dimensi yang sama dikalikan lalu dijumlahkan
- $\|\mathbf{Q}\| = \sqrt{\sum_{i=1}^{768} Q_i^2}$ = panjang (magnitudo) vektor Q
- $\|\mathbf{D}\|$ = panjang (magnitudo) vektor D
- Pembagian dengan produk magnitudo $\|\mathbf{Q}\| \cdot \|\mathbf{D}\|$ bertujuan **menormalkan** hasil, sehingga yang diukur hanya **arah** (makna), bukan panjang teks
- Hasil berkisar **-1 hingga 1**, namun pada embedding teks umumnya bernilai **0 hingga 1**

**Rentang nilai dan interpretasinya:**

| Nilai CosSim | Sudut | Interpretasi |
|:---:|:---:|---|
| 1.0 | 0° | Vektor identik — makna persis sama |
| 0.7 – 0.9 | 26°–46° | Sangat mirip — relevan tinggi |
| 0.4 – 0.7 | 46°–66° | Agak mirip — relevan sedang |
| 0 – 0.4 | 66°–90° | Tidak berhubungan |

**Contoh perhitungan sederhana (ilustrasi 2 dimensi):**

Misalkan:
- Query $\mathbf{Q} = [1, 0]$ (mewakili topik "analisis data")
- Dokumen A $\mathbf{D_A} = [0.9, 0.1]$ (lowongan Data Analyst)
- Dokumen B $\mathbf{D_B} = [0.1, 0.9]$ (lowongan Graphic Designer)

Perhitungan:
$$\text{CosSim}(\mathbf{Q}, \mathbf{D_A}) = \frac{(1)(0.9)+(0)(0.1)}{\sqrt{1} \cdot \sqrt{0.82}} = \frac{0.9}{0.906} \approx 0.993$$

$$\text{CosSim}(\mathbf{Q}, \mathbf{D_B}) = \frac{(1)(0.1)+(0)(0.9)}{\sqrt{1} \cdot \sqrt{0.82}} = \frac{0.1}{0.906} \approx 0.110$$

Dokumen A jauh lebih relevan (skor 0.993) dibanding Dokumen B (0.110). Logika yang sama berlaku pada 768 dimensi dalam sistem nyata.

### 4.3.2 Implementasi di pgvector

Pada implementasi aktual (`backend/rag/search.py`), kueri semantic search ke PostgreSQL menggunakan operator `<=>` (cosine distance) dari pgvector:

```sql
SELECT
    id, title, company, location, salary_text, skills, cluster,
    1 - (embedding <=> $1::vector) AS sim_score
FROM knowledge_base
WHERE embedding IS NOT NULL
ORDER BY sim_score DESC
LIMIT $2
```

Perhatikan pola `1 - (embedding <=> $1::vector)`: operator `<=>` menghitung **jarak** cosine (0 = identik, 1 = berlawanan), sehingga dibalik menjadi **skor kemiripan** dengan pengurangan dari 1.

> **Catatan teknis penting**: Selama pengembangan ditemukan bug kritis di mana `ORDER BY embedding <=> $1::vector ASC` (tanpa konversi ke skor) menyebabkan IVFFlat index scan tidak melakukan full table scan, hanya mengembalikan 2-4 baris dari 720. Fix dilakukan dengan menghitung `sim_score` secara eksplisit sebagai kolom terkomputasi, lalu `ORDER BY sim_score DESC`.

---

## 4.4 Tahap 04C — Hybrid Search dengan Reciprocal Rank Fusion (RRF)

### 4.4.1 Motivasi: Keterbatasan Pencarian Vektor Murni

Pencarian semantik unggul dalam memahami konteks, sinonim, dan parafrase. Namun, pencarian semantik murni rentan terhadap *false positive* pada istilah teknis spesifik. Contoh kasus nyata: query "programmer Golang" bisa mengambil dokumen "programmer Rust" karena kedua bahasa memiliki vektor semantik yang berdekatan ("bahasa sistem *backend*"), padahal keduanya berbeda secara keahlian teknis.

Untuk mengatasinya, sistem menggabungkan dua metode pencarian:
- **Semantic Search**: via `pgvector` — unggul dalam pemahaman konteks
- **Full-Text Search (FTS)**: via `tsvector` — unggul dalam pencocokan kata kunci eksak

### 4.4.2 Algoritma Reciprocal Rank Fusion

Kedua metode menghasilkan dua daftar peringkat berbeda. RRF menggabungkannya berdasarkan posisi peringkat — bukan nilai skor mentah yang tidak bisa dibandingkan langsung karena memiliki skala berbeda:

$$\text{RRF}(d) = \sum_{r \in R} \frac{1}{k + \text{rank}(d, r)}, \quad k = 60$$

Keterangan variabel:
- $d$ = dokumen yang sedang dihitung skor RRF-nya
- $R$ = himpunan metode pencarian yang digunakan; dalam sistem ini $R = \{\text{Semantic Search},\ \text{Full-Text Search}\}$
- $\sum_{r \in R}$ = menjumlahkan kontribusi dari setiap metode pencarian
- $\text{rank}(d, r)$ = posisi peringkat dokumen $d$ pada hasil metode $r$ (peringkat 1 = terbaik)
- $k = 60$ = konstanta stabilisasi standar yang mencegah satu dokumen mendominasi hanya karena satu metode menempatkannya di posisi pertama. Tanpa $k$, dokumen di peringkat 1 akan mendapat skor $1/1 = 1.0$, jauh lebih besar dari peringkat 2 ($1/2 = 0.5$). Dengan $k=60$, perbedaannya menjadi $1/61 ≈ 0.0164$ vs $1/62 ≈ 0.0161$ — lebih adil.
- Dokumen yang **tidak ditemukan** oleh satu metode tidak mendapat kontribusi dari metode tersebut (skor = 0 untuk komponen itu)

**Contoh perhitungan RRF nyata:**

Misalkan ada 3 dokumen dengan peringkat berikut:

| Dokumen | Rank (Semantic) | Rank (FTS) | RRF Score |
|---|:---:|:---:|---|
| Data Analyst (Bwbyaz) | 1 | 2 | $\frac{1}{61} + \frac{1}{62} = 0.0325$ |
| BI Analyst (Waschen) | 3 | 1 | $\frac{1}{63} + \frac{1}{61} = 0.0323$ |
| Business Analyst | 2 | 5 | $\frac{1}{62} + \frac{1}{65} = 0.0315$ |

Dokumen pertama unggul tipis karena peringkat 1 di semantic meskipun hanya peringkat 2 di FTS.

### 4.4.3 Implementasi RRF (Kode Aktual)

```python
# backend/rag/search.py — bagian RRF Fusion (baris 223-234)
k = 60
rrf_scores: dict[int, float] = {}

for rank, row in enumerate(semantic_results):
    doc_id = row["id"]
    rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (k + rank + 1)

for rank, row in enumerate(fulltext_results):
    doc_id = row["id"]
    rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (k + rank + 1)

ranked_ids = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
# Kembalikan top_k (default: 10) dokumen
```

### 4.4.4 Query Expansion Sebelum Embedding

Sebelum query pengguna di-embed, sistem memperkayanya dengan kata kunci domain menggunakan fungsi `_expand_query()`. Ini penting karena narasi pengguna yang singkat ("saya suka ngoding Python") mengandung sedikit sinyal semantik dibanding dokumen lowongan yang panjang.

```python
# Contoh: query "saya mahir Python dan suka data"
# → deteksi keyword "python" dan "data"
# → expansi: "python programming developer software engineer |
#              data analyst data engineer data science analytics"
# → embedding_input = "search_query: python programming developer ..."
```

Word-boundary check (`\b`) diterapkan agar kata seperti "seorang" tidak memicu keyword "seo".
