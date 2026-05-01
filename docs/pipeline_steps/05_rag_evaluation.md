# Task 05 — Evaluasi Sistem RAG (Retrieval Quality Assessment)

## 1. Tujuan

Sebelum sistem dikonsumsi oleh pengguna akhir, **kualitas retrieval harus divalidasi secara kuantitatif**. Tahap ini merupakan kontribusi ilmiah inti dari penelitian — membuktikan bahwa sistem RAG NusaNara dapat mengambil lowongan yang relevan secara konsisten untuk berbagai profil pengguna.

**File utama:** `backend/scripts/evaluate_retrieval.py`  
**Ground Truth:** `backend/evaluation/ground_truth.json`

---

## 2. Kerangka Evaluasi

Evaluasi menggunakan paradigma **Information Retrieval (IR)** standar dengan dua konfigurasi sistem yang dibandingkan:

| Konfigurasi | Deskripsi |
|---|---|
| **Tanpa Reranking** | Hybrid Search (Semantic + FTS via RRF) langsung |
| **Dengan Reranking** | Hybrid Search → Re-ranking (Skill + Experience) |

```
                  20 Query Uji
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
  [Tanpa Reranking]         [Dengan Reranking]
  Hybrid Search only         + Skill/Exp Rerank
          │                         │
          ▼                         ▼
   Retrieved Titles          Retrieved Titles
          │                         │
          └────────────┬────────────┘
                       │
                       ▼
              Ground Truth Matching
                       │
                       ▼
            Precision@1, @3, @5, MRR
```

---

## 3. Dataset Evaluasi (Ground Truth)

**20 query uji** mencakup **8 klaster karier** dengan profil pengguna yang realistis dan beragam:

| Query ID | Klaster Target | Profil Singkat |
|---|---|---|
| q01 | Teknologi, Analisis Data | D3 IT, Python + SQL, minat data/backend |
| q02 | Analisis Data | Fresh grad SI, Excel + SQL, target data analyst |
| q03 | Teknologi | Frontend dev HTML/CSS/React |
| q04 | Desain & Kreatif | Lulusan desain grafis, Photoshop/Illustrator |
| q05 | Pemasaran Digital | Social media management, content creator |
| q06 | Bisnis & Administrasi | Project management, komunikasi bisnis |
| q07 | Desain & Kreatif | UI/UX Designer, Figma |
| q08 | Pemasaran Digital | Google Ads + SEO specialist |
| q09 | Teknologi | Backend developer, 1 tahun pengalaman |
| q10 | Analisis Data | Power BI, business analytics |
| q11 | Sales & Customer Service | Sales Executive B2B, negosiasi |
| q12 | Sales & Customer Service | Customer Service 3 tahun, call center |
| q13 | Finance & Accounting | S1 Akuntansi, CPA, audit |
| q14 | Finance & Accounting | Finance analyst, fintech, Excel |
| q15 | Education & Training | Guru matematika SMA, ingin jadi trainer |
| q16 | Education & Training | Tutor Bahasa Inggris online, TOEFL |
| q17 | Analisis Data | Statistika, R + Python, analisis kuantitatif |
| q18 | Teknologi | Laravel/PHP web developer |
| q19 | Pemasaran Digital | Konten video, TikTok/Instagram creator |
| q20 | Analisis Data, Finance | D4 Manajemen Informatika, Excel, laporan |

**Format Ground Truth (per query):**

```json
{
  "query_id": "q02",
  "query": "Saya fresh graduate S1 Sistem Informasi, mahir Excel dan SQL...",
  "relevant_clusters": ["Analisis Data"],
  "graded_relevance": [
    {"title": "Data Analyst", "score": 3},
    {"title": "Business Intelligence Analyst", "score": 3},
    {"title": "Junior Data Analyst", "score": 3},
    {"title": "Business Analyst", "score": 2},
    {"title": "Project Manager", "score": 0}
  ]
}
```

Skema skor relevansi:
- **3** = Sangat relevan (posisi ideal)
- **2** = Relevan (posisi terkait)
- **1** = Sedikit relevan (bisa jadi alternatif)
- **0** = Tidak relevan

Binary threshold untuk metrik: skor ≥ 2 dianggap **relevan**.

---

## 4. Metrik Evaluasi

### Precision@k

Mengukur proporsi dokumen relevan dalam Top-k hasil retrieval:

$$P@k = \frac{|\{d \in \text{retrieved}_{1:k} : d \in \text{relevant}\}|}{k}$$

- **P@1**: Apakah dokumen pertama sudah relevan?
- **P@3**: Dari 3 teratas, berapa yang relevan?
- **P@5**: Dari 5 teratas, berapa yang relevan?

### Mean Reciprocal Rank (MRR)

Mengukur posisi rata-rata dokumen relevan **pertama** yang ditemukan:

$$MRR = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$$

- Jika dokumen relevan pertama ada di posisi 1 → kontribusi = 1.0
- Jika di posisi 2 → kontribusi = 0.5
- Jika di posisi 3 → kontribusi = 0.33
- MRR mendekati 1.0 berarti dokumen relevan hampir selalu muncul di posisi pertama

---

## 5. Hasil Evaluasi Final

Evaluasi dilakukan pada **720 lowongan** (90 per klaster), menggunakan model `nomic-embed-text-v2-moe`.

### Metrik Keseluruhan (rata-rata 20 query)

| Metrik | Tanpa Reranking | Dengan Reranking |
|---|:-:|:-:|
| **P@1** | 0.700 | **0.750** |
| **P@3** | 0.700 | **0.733** |
| **P@5** | **0.710** | 0.710 |
| **MRR** | 0.800 | **0.842** |

### Precision@3 per Klaster

| Klaster | Tanpa Reranking | Dengan Reranking |
|---|:-:|:-:|
| Analisis Data | 0.800 | **0.800** |
| Bisnis & Administrasi | 0.667 | 0.667 |
| Desain & Kreatif | 0.778 | 0.778 |
| Education & Training | 0.500 | **0.667** |
| Finance & Accounting | 0.667 | 0.667 |
| Pemasaran Digital | 0.556 | 0.556 |
| Sales & Customer Service | 0.333 | **0.500** |
| Teknologi & Perangkat Lunak | **0.833** | 0.833 |

---

## 6. Temuan dan Perbaikan Iteratif

Evaluasi dilakukan secara **iteratif** — setiap temuan diikuti dengan perbaikan sistem:

### Iterasi 1 — Bug Awal: Cluster Bisnis = 0
**Temuan:** Cluster `Bisnis & Administrasi` P@3 = 0.000  
**Root cause:** Data noise (jabatan Office Boy, cleaning staff ikut masuk) + content terlalu miskin  
**Fix:** Hapus data non-relevan, rebuild content dengan konteks profesional  
**Hasil:** P@3 naik ke 0.667

### Iterasi 2 — Bug Kritis: pgvector ORDER BY
**Temuan:** Cluster `Sales` dan `Education` P@3 = 0.000, retrieval hanya mengembalikan 0-2 hasil  
**Root cause:** `ORDER BY embedding <=> $1::vector` (ASC) menggunakan IVFFlat index scan yang tidak melakukan full table scan  
**Fix:** Ganti ke `ORDER BY sim_score DESC` (computed column)  
**Hasil:** Sales naik 0→0.333/0.500, Education naik 0→0.167/0.167

### Iterasi 3 — Content & Ground Truth Sync
**Temuan:** Ground truth berisi judul yang berbeda dari judul di DB (varian nama)  
**Root cause:** Database berisi judul seperti `"Data Analyst/Data Scientist/Data Engineer/AI Engineer"` tapi GT hanya ada `"Data Analyst"`  
**Fix:** Rebuild content Education + Analisis Data dengan konteks per sub-peran; sync semua varian judul ke GT  
**Hasil:** Analisis Data 0.267→0.800, Education 0.167→0.667, MRR 0.671→0.842

---

## 7. Cara Menjalankan Evaluasi

```bash
# Dari direktori backend/
python scripts/evaluate_retrieval.py
```

Output (file final tersimpan di `backend/evaluation/`):

| File | Keterangan |
|---|---|
| `eval_summary_final.csv` | Tabel metrik P@1, P@3, P@5, MRR per konfigurasi — **siap salin ke Bab 4** |
| `eval_detail_final.csv` | Detail top-5 retrieved per query, lengkap dengan skor P@k dan MRR |
| `ground_truth.json` | 20 query uji + graded relevance labels (skor 0–3) |

> **Catatan untuk lampiran skripsi:** Gunakan `eval_summary_final.csv` untuk tabel metrik di Bab 4, dan `eval_detail_final.csv` sebagai lampiran detail per-query.
