---

## 4.5 Tahap 04D — Re-ranking: Top-10 → Top-3

### 4.5.1 Motivasi Re-ranking

Hasil Hybrid Search menghasilkan Top-10 kandidat berdasarkan kemiripan tekstual. Namun, kemiripan teks tidak selalu berarti kesesuaian keahlian. Misalnya, lowongan "Data Scientist Senior" bisa memiliki teks yang sangat mirip dengan profil fresh graduate, padahal mensyaratkan 5 tahun pengalaman.

Re-ranking menambahkan lapisan penyaringan berbasis **konten faktual** (keahlian dan pengalaman), bukan hanya kemiripan teks.

### 4.5.2 Formula Re-ranking

Skor akhir setiap dokumen dihitung dengan rumus:

$$\text{FinalScore}(d) = 0.70 \cdot \text{CosSim}(Q, D) + 0.30 \cdot \text{SkillBonus}(Q, D)$$

Keterangan variabel:
- $d$ = dokumen kandidat yang sedang dinilai (salah satu dari Top-10 hasil Hybrid Search)
- $Q$ = vektor representasi query (narasi profil pengguna)
- $D$ = vektor representasi dokumen lowongan di basis data
- $\text{CosSim}(Q, D)$ = skor cosine similarity antara vektor query dan vektor dokumen, nilainya antara 0 dan 1
- $\text{SkillBonus}(Q, D)$ = komponen tambahan berdasarkan kesesuaian keahlian (lihat di bawah)
- Bobot **0.70** untuk CosSim dan **0.30** untuk SkillBonus dipilih agar kemiripan semantik tetap menjadi faktor dominan, namun faktor keahlian tetap berpengaruh signifikan

**SkillBonus** dihitung berdasarkan jumlah keahlian dokumen yang cocok dengan kata-kata dalam query (pencocokan *substring* dua arah):
$$\text{SkillBonus} = \min(\text{skill\_matches} \times 0.08,\ 0.30)$$

Keterangan:
- `skill_matches` = jumlah keahlian dari array `skills[]` dokumen yang ditemukan sebagai substring di dalam teks query, atau sebaliknya
- Setiap keahlian yang cocok memberikan kontribusi **0.08**, sehingga 4 keahlian cocok menghasilkan SkillBonus = 0.32 → di-cap menjadi **0.30** (nilai maksimum)
- Kata dengan panjang ≤ 2 karakter diabaikan agar kata seperti "di", "ke", "IT" tidak memicu false match

**Contoh perhitungan untuk query q02:**
> *"Fresh graduate SI, mahir Excel dan SQL, pernah buat dashboard Power BI"*

| Dokumen | CosSim | Skill Match | SkillBonus | FinalScore |
|---|:---:|:---:|:---:|:---:|
| Data Analyst (Bwbyaz) | 0.72 | 3 (SQL, Excel, Power BI) | min(0.24, 0.30) = 0.24 | 0.70×0.72 + 0.30×0.24 = **0.576** |
| BI Analyst (Waschen) | 0.68 | 2 (SQL, Power BI) | min(0.16, 0.30) = 0.16 | 0.70×0.68 + 0.30×0.16 = **0.524** |
| Project Manager | 0.41 | 0 | 0.00 | 0.70×0.41 + 0 = **0.287** |

Dokumen dengan FinalScore < 0.25 dibuang (threshold). Top-3 sisanya dikirim ke LLM.

### 4.5.3 Implementasi Re-ranking (Kode Aktual)

```python
# backend/rag/rerank.py — implementasi lengkap
SCORE_THRESHOLD = 0.25

def rerank(query: str, documents: list[dict], top_n: int = 3) -> list[dict]:
    query_lower = query.lower()
    query_words = set(query_lower.split())

    for doc in documents:
        skills = [s.lower() for s in (doc.get("skills") or [])]

        # Hitung skill overlap (substring match dua arah)
        skill_matches = sum(
            1 for skill in skills
            if any(
                word in skill or skill in word
                for word in query_words
                if len(word) > 2  # skip kata pendek
            )
        )
        doc["skill_matches"] = skill_matches
        skill_bonus = min(skill_matches * 0.08, 0.30)

        base_score = doc.get("sim_score", doc.get("fts_score", 0.5))
        doc["final_score"] = (base_score * 0.70) + (skill_bonus * 0.30)

    ranked = sorted(documents, key=lambda x: x.get("final_score", 0), reverse=True)
    return [doc for doc in ranked[:top_n] if doc.get("final_score", 0) >= SCORE_THRESHOLD]
```

---

## 4.6 Tahap 05 — Evaluasi Kualitas Retrieval RAG

### 4.6.1 Tujuan dan Setup Evaluasi

Evaluasi dilakukan untuk memvalidasi kualitas komponen *retriever* secara kuantitatif sebelum sistem digunakan oleh pengguna. Metode evaluasi mengikuti standar *Information Retrieval* dengan membandingkan dua konfigurasi:

| Konfigurasi | Deskripsi |
|---|---|
| **Sistem A** | Hybrid Search (Semantic + FTS via RRF) saja |
| **Sistem B** | Hybrid Search + Re-ranking (Skill + Threshold) |

**Dataset Evaluasi:**
- Knowledge Base: **720 lowongan** (90 per klaster × 8 klaster)
- Query uji (*Ground Truth*): **20 kueri** mencakup 8 klaster karier
- Relevansi dinilai manual dengan skala 0–3 (threshold biner: ≥2 = relevan)

### 4.6.2 Dataset Ground Truth (20 Query Uji)

**Tabel 4.2 — Daftar 20 Query Uji yang Digunakan**

| ID | Klaster Target | Profil Singkat |
|---|---|---|
| q01 | Teknologi, Analisis Data | D3 IT, Python + SQL, minat data/backend |
| q02 | Analisis Data | Fresh grad SI, Excel + SQL, target data analyst |
| q03 | Teknologi | Frontend dev, HTML/CSS/React |
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

**Contoh Ground Truth JSON (query q02):**
```json
{
  "query_id": "q02",
  "query": "Saya fresh graduate S1 Sistem Informasi, mahir Excel dan SQL, pernah buat dashboard Power BI. Ingin berkarier sebagai data analyst.",
  "relevant_clusters": ["Analisis Data"],
  "graded_relevance": [
    {"title": "Data Analyst",                    "score": 3},
    {"title": "Business Intelligence Analyst",   "score": 3},
    {"title": "Junior Data Analyst",             "score": 3},
    {"title": "Business Analyst",                "score": 2},
    {"title": "Project Manager",                 "score": 0}
  ]
}
```

Skala relevansi: **3** = sangat relevan, **2** = relevan, **1** = sedikit relevan, **0** = tidak relevan. Untuk perhitungan metrik biner, skor ≥ 2 dianggap **relevan**.

### 4.6.3 Metrik Evaluasi

**1. Precision@k (P@k)**

$$P@k = \frac{|\{d \in \text{retrieved}_{1:k} : d \in \text{relevant}\}|}{k}$$

Keterangan variabel:
- $k$ = jumlah dokumen teratas yang dievaluasi (dalam penelitian ini: k = 1, 3, dan 5)
- $\text{retrieved}_{1:k}$ = himpunan $k$ dokumen teratas yang dikembalikan sistem
- $\text{relevant}$ = himpunan dokumen yang dianggap relevan berdasarkan *ground truth* (skor ≥ 2)
- Pembilang = **jumlah dokumen yang ada di kedua himpunan** (relevan DAN masuk dalam Top-k)
- Hasil P@k berkisar 0.0 (tidak ada yang relevan) hingga 1.0 (semua relevan)

Contoh: jika dari Top-3 yang dikembalikan sistem, 2 di antaranya relevan, maka $P@3 = 2/3 \approx 0.667$.

**2. Mean Reciprocal Rank (MRR)**

$$\text{MRR} = \frac{1}{|Q|} \sum_{i=1}^{|Q|} \frac{1}{\text{rank}_i}$$

Keterangan variabel:
- $|Q|$ = total jumlah query uji (dalam penelitian ini: 20 kueri)
- $\sum_{i=1}^{|Q|}$ = menjumlahkan kontribusi dari seluruh query
- $\text{rank}_i$ = posisi peringkat dokumen **relevan pertama** yang berhasil ditemukan oleh sistem untuk query ke-$i$
- $\frac{1}{\text{rank}_i}$ = nilai *reciprocal rank* — semakin awal dokumen relevan ditemukan, semakin besar nilainya (1/1=1.0, 1/2=0.5, 1/3=0.33, dst.)
- MRR mendekati 1.0 berarti dokumen relevan hampir selalu muncul di posisi pertama

**Contoh perhitungan MRR untuk 3 query:**

| Query | Posisi dokumen relevan pertama | Kontribusi MRR |
|---|:---:|:---:|
| q02 (Data Analyst) | 1 | 1/1 = **1.000** |
| q07 (UI/UX Designer) | 2 | 1/2 = **0.500** |
| q15 (Guru/Trainer) | 1 | 1/1 = **1.000** |
| **Rata-rata** | — | **(1.000 + 0.500 + 1.000) / 3 = 0.833** |

### 4.6.4 Hasil Evaluasi Keseluruhan

**Tabel 4.3 — Metrik Evaluasi (rata-rata 20 query)**

| Metrik | Sistem A (Tanpa Re-ranking) | Sistem B (Dengan Re-ranking) | Delta |
|---|:---:|:---:|:---:|
| **P@1** | 0.700 | **0.750** | +7.1% |
| **P@3** | 0.700 | **0.733** | +4.7% |
| **P@5** | 0.710 | 0.710 | 0.0% |
| **MRR** | 0.800 | **0.842** | +5.2% |

### 4.6.5 Hasil Evaluasi per Klaster (P@3)

**Tabel 4.4 — Precision@3 per Klaster Karier**

| Klaster | Tanpa Re-ranking | Dengan Re-ranking | Keterangan |
|---|:---:|:---:|---|
| Analisis Data | 0.800 | **0.800** | Stabil tinggi |
| Teknologi & Perangkat Lunak | **0.833** | 0.833 | Tertinggi — klaster paling besar sinyal semantiknya |
| Desain & Kreatif | 0.778 | 0.778 | Stabil |
| Finance & Accounting | 0.667 | 0.667 | Stabil |
| Bisnis & Administrasi | 0.667 | 0.667 | Stabil |
| Education & Training | 0.500 | **0.667** | Re-rank membantu signifikan (+33%) |
| Pemasaran Digital | 0.556 | 0.556 | Stabil |
| Sales & Customer Service | 0.333 | **0.500** | Re-rank membantu signifikan (+50%) |

### 4.6.6 Analisis: Dampak Re-ranking per Klaster

Klaster **Sales & Customer Service** dan **Education & Training** menunjukkan peningkatan terbesar dari re-ranking. Analisis penyebabnya:

- **Sales**: Istilah seperti "negosiasi", "target revenue", "closing" bersifat ambigu secara semantik — dapat muncul di klaster Bisnis atau Marketing. Re-ranking berbasis skill keyword ("sales", "account manager") mengembalikan kandidat yang tepat.
- **Education**: Profil guru/tutor sering menggunakan kosakata umum (mengajar, membimbing) yang tumpang tindih dengan HR/Training. Re-ranking mengunci ke skill spesifik seperti "kurikulum", "kelas", "TOEFL".

Klaster **Teknologi** dan **Analisis Data** tidak berubah karena terminologi teknis mereka (Python, SQL, React) sudah cukup diskriminatif secara semantik sehingga re-ranking tidak mengubah urutan.

### 4.6.7 Proses Evaluasi Iteratif

Nilai MRR akhir sebesar **0.842** bukan hasil langsung, melainkan dicapai melalui 3 iterasi perbaikan:

| Iterasi | Masalah Ditemukan | Tindakan Perbaikan | Hasil |
|---|---|---|---|
| 1 | Klaster Bisnis P@3 = 0.000 | Hapus data noise (Office Boy, Cleaning Staff), rebuild content | P@3 naik ke 0.667 |
| 2 | Sales & Education P@3 = 0.000, retrieval hanya 0-2 baris | Fix bug pgvector ORDER BY (IVFFlat partial scan) | Sales 0→0.333, Education 0→0.167, MRR: 0.671 |
| 3 | Ground Truth tidak sinkron dengan varian judul di DB | Sync semua varian judul; rebuild content per sub-peran | MRR: 0.671 → **0.842** |

---

## 4.7 Tahap 06 — Backend API dan Integrasi LLM

### 4.7.1 Arsitektur FastAPI dan Async I/O

Backend menggunakan FastAPI dengan `asyncpg` untuk koneksi database asinkron. Keuntungan arsitektur asinkron: saat menunggu balasan dari PostgreSQL atau Ollama (operasi I/O-bound), thread server tidak terkunci dan dapat melayani request lain secara konkuren.

Endpoint utama: `POST /api/recommend` — menerima `narrative` pengguna, menjalankan seluruh pipeline RAG, dan mengembalikan respons LLM via SSE stream.

### 4.7.2 Server-Sent Events untuk Streaming LLM

LLM bekerja secara *auto-regressive* — memprediksi satu token per langkah. Daripada menunggu output penuh, sistem menggunakan **Server-Sent Events (SSE)** untuk mengirim setiap token ke frontend segera setelah dihasilkan.

```python
# Contoh respons SSE stream
data: {"content": "🔍 Menarik data profil..."}
data: {"content": "📊 Menemukan 10 dokumen..."}
data: {"content": "## 1. 🌟 Analisis Profil\n"}
data: {"content": "Berdasarkan profil Anda sebagai..."}
...
data: [DONE]
```

Hasil pengujian performa: **TTFB = 2.4 detik**, total durasi ~185 detik untuk output ~4000 karakter.

### 4.7.3 Konstruksi Prompt dan Injeksi Konteks

Fungsi `build_prompt()` di `llm_service.py` menggabungkan narasi pengguna dengan Top-3 dokumen hasil retrieval menjadi satu prompt terstruktur. LLM diinstruksikan untuk:

1. Menganalisis profil pengguna berdasarkan narasi
2. Merekomendasikan hanya dari posisi yang ada di Top-3 dokumen
3. Menyebutkan skor kecocokan (CosSim score, skill overlap) secara eksplisit
4. Mengidentifikasi gap keahlian secara objektif

**Validasi output (7 kriteria, semua terpenuhi):**

| Kriteria | Hasil Uji | Detail |
|---|:---:|---|
| Struktur Analisis Profil muncul | ✅ | Section `## 1. 🌟 Analisis Profil` |
| 3 rekomendasi lengkap | ✅ | Detail posisi, perusahaan, action plan |
| Menyebut skor RAG | ✅ | *"skor RAG 0.51"* |
| Menyebut overlap skill | ✅ | *"overlap skill 3/4"* |
| Judul sesuai DB (tidak halusinasi) | ✅ | Semua judul identik dengan entri DB |
| TTFB < 10 detik | ✅ | **2.4 detik** |
| Output Bahasa Indonesia | ✅ | Konsisten |

---

## 4.8 Kesimpulan Bab

Pipeline Tahap 04–06 NusaNara mengintegrasikan komponen-komponen teknis secara berlapis:

1. **Embedding** dengan `nomic-embed-text-v2-moe` menghasilkan representasi vektor 768 dimensi yang mampu menangkap semantik Bahasa Indonesia secara efektif (didukung data latih 36,4 juta pasang teks).
2. **Hybrid Search + RRF** menggabungkan kekuatan pencarian semantik dan leksikal untuk menanggulangi kelemahan masing-masing.
3. **Re-ranking** menambahkan lapisan validasi berbasis keahlian, terbukti meningkatkan MRR dari 0.800 menjadi 0.842 dan P@1 dari 0.700 menjadi 0.750.
4. **Backend FastAPI + SSE** mengekspos pipeline ini sebagai layanan responsif dengan TTFB 2.4 detik.

Nilai MRR 0.842 mengindikasikan bahwa secara rata-rata, dokumen relevan pertama ditemukan pada posisi ke-1.19 dari daftar hasil pencarian — performa yang cukup kuat untuk konteks sistem rekomendasi karier berbasis RAG lokal.

---

## Referensi

Nussbaum, Z., & Duderstadt, B. (2025). *Training Sparse Mixture of Experts Text Embedding Models*. arXiv:2502.07972v3 [cs.CL]. Nomic AI.
