# BAB III — METODOLOGI PEMBANGUNAN SISTEM NUSANARA
## Pipeline Akuisisi Data, Rekayasa Pengetahuan, dan Infrastruktur Basis Data

---

## 3.1 Gambaran Umum Pipeline

Sistem NusaNara dibangun melalui enam tahapan pipeline yang saling bergantung secara sekuensial. Setiap tahapan menghasilkan artefak yang menjadi masukan bagi tahapan berikutnya, membentuk rantai transformasi data dari sumber mentah di web hingga rekomendasi karier yang dapat dijelaskan (*explainable*) kepada pengguna akhir.

```
┌──────────────────────────────────────────────────────────────────────┐
│           PIPELINE PEMBANGUNAN SISTEM NusaNara (6 Tahap Inti)        │
│                                                                      │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────────────┐ │
│  │ TAHAP 01 │──►│ TAHAP 02 │──►│ TAHAP 03 │──►│    TAHAP 04      │ │
│  │ Scraping │   │ Cleaning │   │ DB Import│   │ Embedding +      │ │
│  │ Glints   │   │ +Cluster │   │ pgvector │   │ Hybrid Search    │ │
│  │          │   │ Labeling │   │          │   │ + Re-ranking     │ │
│  └──────────┘   └──────────┘   └──────────┘   └──────────────────┘ │
│  720 lowongan   720 cleaned    DB: 720 row    VECTOR(768) terisi    │
│  8×90 cluster   content field  NULL emb       MRR=0.842             │
│                                                                      │
│  ┌──────────┐   ┌──────────────────────────────────────────────┐   │
│  │ TAHAP 05 │──►│                  TAHAP 06                    │   │
│  │ Evaluasi │   │  Backend API (FastAPI + SSE + Clerk JWT)     │   │
│  │ RAG      │   │  RAG end-to-end: Query→Embed→Search→LLM     │   │
│  │ P@k, MRR │   └──────────────────────────────────────────────┘   │
│  └──────────┘                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

**Tabel 3.1 — Teknologi Stack per Tahapan**

| Tahapan | Teknologi Utama | Fungsi |
|---|---|---|
| Scraping | Python, Selenium, selenium-stealth | Akuisisi data lowongan dari SPA berbasis React |
| Cleaning | Pandas, Python RegEx | Normalisasi, deduplication, content formulation |
| Database | PostgreSQL 16, pgvector, Docker | Penyimpanan vektor 768 dimensi |
| Embedding | nomic-embed-text-v2-moe (via Ollama) | Representasi semantik teks → vektor |
| Evaluasi | P@k, MRR, ground truth JSON | Validasi kuantitatif kualitas retrieval |
| Backend API | FastAPI, asyncpg, Llama 3.1, Clerk | Eksposur pipeline RAG via REST/SSE |

---

## 3.2 Tahap 01 — Akuisisi Data: Web Scraping Glints Indonesia

### 3.2.1 Justifikasi Sumber Data

Sistem NusaNara dibangun di atas paradigma **Retrieval-Augmented Generation (RAG)**, di mana kualitas *Knowledge Base* menentukan langsung kualitas rekomendasi yang dihasilkan. Menggunakan dataset publik yang statis (seperti Kaggle) tidak memadai karena kondisi pasar kerja Indonesia berubah secara dinamis — posisi yang tersedia, persyaratan keahlian, dan kisaran gaji berevolusi setiap kuartal.

Oleh karena itu, data lowongan kerja aktual diambil langsung dari **Glints Indonesia** (`glints.com/id`) — portal rekrutmen terbesar di Asia Tenggara dengan struktur konten lowongan yang terstandarisasi, mencakup judul posisi, nama perusahaan, lokasi, rentang gaji, keahlian yang dibutuhkan, dan deskripsi pekerjaan lengkap.

**Target dataset:** 720 lowongan unik, terdistribusi merata dalam 8 klaster karier dengan masing-masing 90 lowongan — sebuah keputusan metodologis eksplisit untuk memastikan validitas evaluasi lintas klaster tanpa bias distribusi.

### 3.2.2 Tantangan Teknis: Single Page Application (SPA)

Glints menggunakan arsitektur SPA berbasis React dengan mekanisme *Client-Side Rendering (CSR)*. Alur pemuatan konten berlangsung sebagai berikut:

```
Browser Request
      │
      ▼
HTML Awal Diterima (kosong — hanya shell)
      │
      ▼
JavaScript Bundle Dieksekusi di Browser
      │
      ▼
Fetch API ke Backend Glints (XHR/Fetch)
      │
      ▼
DOM Diisi dengan Data Lowongan
      │
      ▼
Halaman Siap Dibaca
```

Pendekatan konvensional menggunakan `requests` + `BeautifulSoup` hanya membaca HTML awal yang **masih kosong** sebelum JavaScript berjalan, sehingga tidak ada data lowongan yang dapat diekstrak. Oleh karena itu, dipilih **Selenium WebDriver** yang mengendalikan browser Chrome sungguhan dalam mode *headless* — JavaScript sepenuhnya tereksekusi dan DOM terisi sebelum elemen diekstrak.

### 3.2.3 Arsitektur Skrip Scraper (Dua Fase)

```
┌─────────────────────────────────────────────────────────┐
│              scraper_glints.py — Dua Fase               │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │ KATA KUNCI  │    │   FASE A     │    │  FASE B   │  │
│  │ 8 Klaster   │───►│  Pengumpulan │───►│  Ekstraksi│  │
│  │ (60+ kw)    │    │  Tautan      │    │  Detail   │  │
│  └─────────────┘    └──────────────┘    └───────────┘  │
│                           │                   │         │
│                      Daftar URL          raw_jobs.csv   │
└─────────────────────────────────────────────────────────┘
```

**Fase A — Pengumpulan Tautan (*Link Gathering*):**  
Skrip mengiterasi kata kunci per klaster, membuka halaman daftar lowongan Glints, lalu mensimulasikan *scroll* bertahap agar konten yang dimuat secara *lazy-loading* (hanya dimuat saat terlihat di layar) dapat terkumpul sepenuhnya. Selektor CSS yang digunakan mengidentifikasi elemen kartu lowongan dengan atribut kelas spesifik Glints:

```python
"a[class*='CompactOpportunityCardsc__JobCardTitleNoStyleAnchor']"
```

**Fase B — Ekstraksi Detail (*Deep Scraping*):**  
Setiap tautan dibuka satu per satu. Library `WebDriverWait` (Explicit Wait) digunakan untuk menunggu elemen DOM siap sebelum diekstrak, menghindari kesalahan `ElementNotFoundException` akibat kondisi *race*.

**Tabel 3.2 — Field yang Diekstrak per Lowongan**

| Field | Sumber DOM | Tipe Data |
|---|---|---|
| `title` | Tag `<h1>` judul posisi | TEXT |
| `company` | Elemen nama perusahaan | TEXT |
| `location` | Badge lokasi kota/provinsi | TEXT |
| `salary_text` | Badge rentang gaji | TEXT |
| `skills` | Tag skill berlabel Glints | TEXT (koma-separated) |
| `job_description` | Kontainer deskripsi lengkap | TEXT |
| `seniority_level` | Badge level senioritas | TEXT |
| `cluster` | Ditetapkan berdasarkan keyword | TEXT |
| `url` | URL halaman lowongan | TEXT |

### 3.2.4 Teknik Anti-Deteksi (Evasion)

Glints menggunakan sistem anti-bot berbasis Cloudflare yang mendeteksi otomasi browser melalui sejumlah *fingerprint*. Library **`selenium-stealth`** digunakan untuk memodifikasi fingerprint browser agar menyerupai sesi pengguna organik:

- **Penghapusan penanda otomasi:** variabel JavaScript `navigator.webdriver = true` yang secara default ter-*set* pada Selenium dihapus.
- **Pemalsuan properti rendering:** nilai `WebGL Vendor`, `Renderer`, dan `User-Agent` dimodifikasi ke nilai browser manusia nyata.
- **Simulasi perilaku manusia:** jeda acak (`time.sleep` dengan variasi nilai) disisipkan di antara setiap *request* untuk meniru pola navigasi pengguna organik, bukan pola burst request mesin.

### 3.2.5 Kata Kunci per Klaster

**Tabel 3.3 — Distribusi Kata Kunci Pencarian per Klaster Karier**

| Klaster | Kata Kunci Utama |
|---|---|
| Teknologi & Perangkat Lunak | Software Engineer, Web Developer, Backend Developer, Laravel, Node.js, Python Developer |
| Analisis Data | Data Analyst, Business Intelligence, Data Scientist, Machine Learning Engineer |
| Desain & Kreatif | Graphic Designer, UI/UX Designer, Motion Graphic, Content Writer, Illustrator |
| Pemasaran Digital | Digital Marketing, Social Media Specialist, SEO Specialist, Google Ads, Content Creator |
| Bisnis & Administrasi | Project Manager, Business Development, Office Manager, General Affairs |
| Sales & Customer Service | Sales Executive, Customer Service, Account Manager, Call Center Representative |
| Finance & Accounting | Accounting Staff, Finance Analyst, Internal Auditor, Tax Consultant |
| Education & Training | Guru, Tutor, Trainer, Instruktur, Learning & Development |

### 3.2.6 Strategi Multi-Phase Top-Up

Distribusi seimbang (90 lowongan per klaster) tidak selalu tercapai dalam satu siklus scraping karena faktor ketersediaan lowongan dan deduplication yang membuang entri duplikat. Strategi **top-up scraping** digunakan secara iteratif:

```
Siklus 1: Scraping Utama → raw_jobs_initial.csv
              │
              ▼ Cek distribusi per klaster
         Klaster kurang dari 90?
              │ Ya
              ▼
Siklus 2: Top-up dengan keyword segar → _topup_scraper.py
              │
              ▼ Cek distribusi ulang
         Masih kurang?
              │ Ya
              ▼
Siklus 3: Direct top-up dengan keyword alternatif → _direct_topup.py
              │
              ▼
         Semua klaster = 90 ✓
```

Kata kunci alternatif digunakan untuk menghindari duplikat (contoh: `"Data+Science"` sebagai alternatif `"Data+Analyst"` jika semua hasil keyword utama sudah ada dalam dataset).

### 3.2.7 Output Akhir Tahap Scraping

| Metrik | Nilai |
|---|---|
| Total lowongan unik | **720** |
| Jumlah klaster | **8** |
| Lowongan per klaster | **90 (sempurna merata)** |
| File output | `data/raw_jobs_final.csv` |
| Ukuran file | ~281 KB |

---

## 3.3 Tahap 02 — Pembersihan Data & Pembentukan Knowledge Base

### 3.3.1 Tujuan dan Tantangan

Data mentah hasil scraping mengandung berbagai anomali yang lazim ditemukan dalam data web: duplikasi entri akibat lowongan yang muncul di beberapa halaman hasil pencarian, format teks yang tidak konsisten (terutama pada kolom gaji), nilai kosong (*missing values*) pada field opsional Glints, serta jabatan yang tidak sepenuhnya selaras dengan klaster yang ditargetkan. Tahapan ini bertujuan menghasilkan dataset bersih yang siap dimasukkan ke database sebagai *Knowledge Base* sistem RAG.

### 3.3.2 Pipeline Pembersihan Data

```
raw_jobs.csv (~900+ baris)
      │
      ▼
┌─────────────────────────────────┐
│  A. Deduplikasi                 │
│     drop_duplicates             │
│     (title + company)           │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  B. Validasi Kritis             │
│     dropna(title, company)      │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  C. Normalisasi Gaji (RegEx)    │
│     → salary_min, salary_max    │
│       (INTEGER absolut)         │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  D. Inferensi Heuristik         │
│     → skills (dari judul)       │
│     → experience_min (senioritas│
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  E. Label Klaster               │
│     → 8 nilai tetap             │
└──────────────┬──────────────────┘
               │
               ▼
┌─────────────────────────────────┐
│  F. Content Formulation         │
│     → kolom `content` naratif   │
│       dengan prefix embedding   │
└──────────────┬──────────────────┘
               │
               ▼
      cleaned_jobs.csv (720 baris)
```

### 3.3.3 Tahap A — Deduplikasi

```python
df.drop_duplicates(subset=["title", "company"])
```

Baris dengan kombinasi `title` **dan** `company` yang identik dihapus. Duplikasi terjadi karena satu lowongan dapat muncul di beberapa halaman hasil pencarian untuk kata kunci berbeda (contoh: lowongan "Data Analyst" di PT XYZ dapat muncul saat scraping keyword "Data Analyst" maupun "Business Intelligence").

**Implikasi teknis terhadap embedding:** Dokumen duplikat dalam *vector space* akan menghasilkan vektor yang hampir identik (jarak cosine ≈ 0). Keberadaannya secara artifisial meningkatkan *cosine similarity* dokumen tersebut dengan query apa pun yang relevan, sehingga menggelembungkan metrik P@k secara tidak valid.

### 3.3.4 Tahap C — Normalisasi Gaji dengan Ekspresi Reguler

Data gaji dari Glints berbentuk teks bebas yang sangat beragam formatnya. Normalisasi dilakukan menggunakan ekspresi reguler:

**Tabel 3.4 — Contoh Normalisasi Format Gaji**

| Format Asli (Raw) | salary_min | salary_max |
|---|---|---|
| `"Rp 5 jt - 10 jt"` | 5.000.000 | 10.000.000 |
| `"IDR 3.000.000 - 5.000.000"` | 3.000.000 | 5.000.000 |
| `"Rp 8.000.000/bulan"` | 8.000.000 | NULL |
| `"Gaji Tidak Ditampilkan"` | NULL | NULL |
| `"Negotiable"` | NULL | NULL |

```python
nums = re.findall(r'[\d.]+', text)
multiplier = 1_000_000 if 'jt' in text.lower() else 1_000
salary_min = int(float(nums[0].replace('.','')) * multiplier)
```

Hasil normalisasi berupa nilai `INTEGER` absolut dalam satuan Rupiah, memungkinkan filtering berbasis nilai di PostgreSQL: `WHERE salary_min >= 5000000`.

### 3.3.5 Tahap D — Inferensi Heuristik (Imputasi Pengetahuan Domain)

Kolom `skills` dan `seniority_level` sering kali tidak diisi oleh perusahaan pemasang lowongan di Glints. Sistem mengisi kekosongan ini secara otomatis berdasarkan **pengetahuan domain** yang dienkodekan dalam kamus kata kunci:

**Inferensi Level Pengalaman dari Judul Jabatan:**

| Kata Kunci dalam Judul | Imputasi `experience_min` | Contoh Judul |
|---|---|---|
| "Senior", "Lead", "Manager", "Head", "Director" | 3 tahun | "Senior Data Analyst", "Project Lead" |
| (tidak ada penanda senioritas) | 1 tahun | "Data Analyst", "Software Engineer" |
| "Junior", "Associate" | 1 tahun | "Junior Developer", "Associate Analyst" |
| "Intern", "Fresh", "Magang", "Entry" | 0 tahun | "Fresh Graduate Welcome", "Internship" |

**Inferensi Skills dari Judul Jabatan:**

```python
SKILL_KEYWORDS = {
    "Data Scientist":    ["Python", "Machine Learning", "SQL",
                          "Statistics", "TensorFlow"],
    "Data Analyst":      ["SQL", "Excel", "Power BI", "Python",
                          "Data Visualization"],
    "UI/UX Designer":    ["Figma", "Adobe XD", "Prototyping",
                          "User Research", "Wireframing"],
    "Digital Marketing": ["Google Ads", "SEO", "Social Media",
                          "Meta Ads", "Analytics"],
    "Software Engineer": ["Python", "Git", "REST API",
                          "Database", "Agile"],
    ...
}
```

Hasilnya disimpan sebagai `TEXT[]` (array PostgreSQL), memungkinkan operasi set pada basis data: `WHERE 'Python' = ANY(skills)`.

### 3.3.6 Tahap F — Pembentukan Content Field (Document Formulation)

Ini adalah tahapan yang paling kritikal dalam keseluruhan pipeline. Model embedding tidak dapat memahami data terstruktur (tabel, JSON); ia hanya memproses teks. Oleh karena itu, semua metadata lowongan yang tersebar di berbagai kolom digabungkan menjadi **representasi teks naratif koheren** yang disimpan di kolom `content`.

Format template content field:

```
search_document: {title} di {company}.
Lokasi: {location}.
Gaji: {salary_text}.
Klaster: {cluster}.
Konteks karier: {konteks_spesifik_sub_peran}.
Keahlian: {skills}.
Syarat: Minimal {experience_min} tahun pengalaman.
```

**Contoh konkret untuk lowongan "Data Analyst":**

```
search_document: Data Analyst di PT Mitra Solusi Digital.
Lokasi: Jakarta Selatan, DKI Jakarta.
Gaji: Rp 6 jt - 10 jt.
Klaster: Analisis Data.
Konteks karier: data analyst, business intelligence, SQL, Excel,
Power BI, visualisasi data, laporan bisnis, insight.
Keahlian: SQL, Excel, Power BI, Python, Data Visualization.
Syarat: Minimal 1 tahun pengalaman.
```

**Mengapa prefix `search_document:` diperlukan?**

Model `nomic-embed-text-v2-moe` menggunakan arsitektur *asymmetric embedding* — representasi vektor untuk dokumen dan query dioptimalkan secara berbeda dalam ruang vektor yang sama. Prefix `search_document:` adalah instruksi ke model bahwa teks ini adalah dokumen referensi yang akan dicari (*retrieved*), sedangkan prefix `search_query:` digunakan untuk teks query pengguna.

**Mengapa "konteks karier" ditambahkan?**

Field deskripsi pekerjaan yang diambil dari Glints seringkali menggunakan bahasa formal administratif yang tidak mencerminkan terminologi teknis domain. Konteks karier berisi sinonim dan istilah teknis spesifik sub-peran yang memperkaya representasi semantik, meningkatkan kemungkinan dokumen ditemukan oleh query yang menggunakan kosakata berbeda namun bermakna sama.

### 3.3.7 Output Akhir Tahap Cleaning

**Tabel 3.5 — Statistik Output Cleaning**

| Metrik | Nilai |
|---|---|
| Baris input (raw) | ~900+ (multi-batch scraping) |
| Baris output (cleaned) | **720** |
| Lowongan per klaster | **90 (sempurna merata)** |
| File output | `data/cleaned_jobs.csv` |
| Ukuran file | ~266 KB |
| Kolom utama | title, company, location, salary_min, salary_max, skills[], cluster, content, seniority_level |

---

## 3.4 Tahap 03 — Database Ingestion & Infrastruktur Basis Data

### 3.4.1 Pilihan Teknologi Database

Sistem NusaNara membutuhkan database yang mampu menjalankan dua jenis pencarian secara bersamaan:
1. **Pencarian vektor** — membandingkan vektor query dengan ratusan vektor dokumen menggunakan kemiripan cosine
2. **Pencarian teks penuh** (*full-text search*) — mencocokkan kata kunci query dengan teks lowongan

**PostgreSQL 16** dengan ekstensi **`pgvector`** dipilih karena mengintegrasikan kedua kapabilitas ini dalam satu sistem database yang sama, menghindari kebutuhan infrastruktur terpisah (seperti Elasticsearch untuk FTS dan Pinecone untuk vector search).

PostgreSQL dijalankan dalam **container Docker** untuk isolasi lingkungan dan reprodusibilitas:

```bash
docker run -d \
  --name pg-nusanara \
  -e POSTGRES_USER=mirza \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=nusanara_dev \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

### 3.4.2 Skema Tabel `knowledge_base`

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS unaccent;  -- normalisasi teks (é → e)

CREATE TABLE knowledge_base (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(200)   NOT NULL,
    company         VARCHAR(200),
    location        VARCHAR(200),
    salary_text     VARCHAR(100),
    salary_min      INTEGER,                    -- untuk filtering gaji
    salary_max      INTEGER,
    requirements    TEXT,                       -- deskripsi persyaratan
    skills          TEXT[],                     -- array: ['Python', 'SQL', ...]
    cluster         VARCHAR(50),                -- salah satu dari 8 klaster
    experience_min  INTEGER DEFAULT 0,          -- syarat minimum tahun pengalaman
    content         TEXT NOT NULL DEFAULT '',   -- teks gabungan untuk embedding
    embedding       VECTOR(768),                -- nomic-embed-text output: 768 dimensi
    search_vector   TSVECTOR,                   -- untuk full-text search (auto-update via trigger)
    date_posted     VARCHAR(50),
    source_url      VARCHAR(500),
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Indeks vektor: mempercepat approximate nearest-neighbor search
-- lists = sqrt(jumlah_baris) — untuk 720 baris, 50 sudah optimal
CREATE INDEX IF NOT EXISTS idx_kb_embedding
    ON knowledge_base
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

-- Indeks full-text search
CREATE INDEX IF NOT EXISTS idx_kb_fts
    ON knowledge_base USING GIN (search_vector);

-- Indeks untuk filtering per klaster karier
CREATE INDEX IF NOT EXISTS idx_kb_cluster ON knowledge_base (cluster);

-- Trigger: otomatis memperbarui kolom search_vector saat data dimasukkan/diubah
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
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

**Penjelasan setiap kolom kritis:**

| Kolom | Tipe | Fungsi dalam RAG |
|---|---|---|
| `content` | TEXT | Teks naratif gabungan semua field → di-embed menjadi vektor saat indexing |
| `embedding` | VECTOR(768) | Array 768 angka riil hasil embedding → dibandingkan saat retrieval |
| `search_vector` | TSVECTOR | Token bahasa yang telah diproses → dipakai komponen Full-Text Search |
| `skills` | TEXT[] | Array keahlian → dipakai saat re-ranking untuk menghitung kesesuaian skill |
| `experience_min` | INTEGER | Syarat minimum tahun pengalaman → dipakai filter dan skor re-ranking |
| `cluster` | VARCHAR(50) | Label karier (8 nilai) → dipakai filter pencarian dan evaluasi per klaster |

### 3.4.3 Relasi Antar Komponen Pipeline

```
cleaned_jobs.csv
      │
      │  asyncpg (async INSERT)
      ▼
┌──────────────────────────────────────────────┐
│         PostgreSQL: knowledge_base           │
│                                              │
│  id │ title │ cluster │ content │ embedding  │
│  1  │ Data  │ Analisis│ search_ │   NULL ←──── Diisi Tahap 04
│     │ Analy │ Data    │ document│            │
│  2  │ UI/UX │ Desain  │ search_ │   NULL ←──── Diisi Tahap 04
│     │ Design│ Kreatif │ document│            │
│ ... │  ...  │   ...   │   ...   │    ...     │
└──────────────────────────────────────────────┘
      │
      │  pgvector ANN + FTS query
      ▼
   RAG Retriever (Tahap 04 & 05)
```

Kolom `embedding` masih `NULL` setelah Tahap 03 — data siap secara tekstual tetapi belum siap untuk pencarian semantik. Pengisian vektor dilakukan pada Tahap 04.

### 3.4.4 Idempotensi Operasi Ingestion

Skrip dirancang **idempotent** — aman dieksekusi berulang kali tanpa menghasilkan duplikasi data:

```python
async def ingest_row(conn, row):
    # Cek sebelum insert
    exists = await conn.fetchval(
        "SELECT 1 FROM knowledge_base WHERE title=$1 AND company=$2",
        row['title'], row['company']
    )
    if exists:
        return  # Skip — sudah ada
    await conn.execute(
        "INSERT INTO knowledge_base (title, company, ...) VALUES ($1, $2, ...)",
        row['title'], row['company'], ...
    )
```

Sifat idempotent ini krusial dalam konteks scraping bertahap — proses top-up dapat dijalankan berulang tanpa risiko data ganda.

### 3.4.5 Distribusi Final Knowledge Base

Setelah seluruh iterasi scraping, cleaning, dan ingestion selesai, distribusi data diverifikasi menggunakan skrip `_check_distribution.py`:

**Tabel 3.6 — Distribusi Lowongan per Klaster di Database**

| Klaster Karier | Jumlah Lowongan | Status |
|---|:---:|:---:|
| Analisis Data | 90 | ✅ |
| Bisnis & Administrasi | 90 | ✅ |
| Desain & Kreatif | 90 | ✅ |
| Education & Training | 90 | ✅ |
| Finance & Accounting | 90 | ✅ |
| Pemasaran Digital | 90 | ✅ |
| Sales & Customer Service | 90 | ✅ |
| Teknologi & Perangkat Lunak | 90 | ✅ |
| **TOTAL** | **720** | ✅ |

Distribusi seimbang sempurna (90 per klaster) merupakan **persyaratan metodologis** untuk validitas evaluasi sistem RAG lintas klaster. Tanpa keseimbangan ini, metrik Precision@k per klaster tidak dapat dibandingkan secara *fair* karena ukuran sampel yang berbeda.

---

*[Lanjutan di bab_pipeline_part2.md]*
