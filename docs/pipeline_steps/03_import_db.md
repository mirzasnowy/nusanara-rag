# Task 03 — Database Ingestion & Pembangunan Skema Knowledge Base

## 1. Tujuan

Memindahkan dataset bersih dari CSV ke dalam **PostgreSQL** sebagai *Single Source of Truth* sistem RAG. Database bukan sekadar penyimpan teks — ia juga menyimpan representasi vektor 768 dimensi untuk setiap lowongan yang digunakan dalam pencarian semantik.

**File utama:** `backend/scripts/import_to_db.py`  
**Database:** PostgreSQL 16 + ekstensi `pgvector`, dijalankan dalam container **Docker** (`pg-nusanara`)

---

## 2. Arsitektur Database

### Skema Tabel Utama: `knowledge_base`

```sql
CREATE TABLE knowledge_base (
    id            SERIAL PRIMARY KEY,
    title         TEXT NOT NULL,
    company       TEXT,
    location      TEXT,
    salary_text   TEXT,
    salary_min    INTEGER,
    salary_max    INTEGER,
    skills        TEXT[],            -- Array PostgreSQL native
    seniority     TEXT,
    cluster       TEXT NOT NULL,     -- Salah satu dari 8 klaster
    content       TEXT,              -- Narasi gabungan untuk embedding
    embedding     VECTOR(768),       -- pgvector: 768 dimensi
    search_vector TSVECTOR           -- Full-text search index
);
```

### Relasi Antar Komponen

```
cleaned_jobs.csv
      │
      │  asyncpg (async INSERT)
      ▼
┌─────────────────────────────────────────┐
│        PostgreSQL: knowledge_base       │
│                                         │
│  id │ title │ cluster │ content │ ...  │
│  ─  │  ─    │   ─     │    ─    │ ─── │
│     │       │         │         │     │
│  embedding VECTOR(768)  ← Task 04 mengisi ini
│  search_vector TSVECTOR ← Auto-generated trigger
└─────────────────────────────────────────┘
      │
      │  pgvector ANN search
      ▼
   RAG Retriever (Task 05)
```

---

## 3. Infrastruktur: Docker Container

PostgreSQL dijalankan dalam container Docker terpisah untuk isolasi lingkungan dan portabilitas:

```bash
docker run -d \
  --name pg-nusanara \
  -e POSTGRES_USER=mirza \
  -e POSTGRES_PASSWORD=devpassword \
  -e POSTGRES_DB=nusanara_dev \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

Keunggulan Docker untuk konteks riset:
- Environment reproducible — tidak bergantung pada instalasi PostgreSQL di OS host
- Mudah di-backup dan di-migrate ke VPS produksi
- Isolasi port mencegah konflik dengan PostgreSQL lokal lain

---

## 4. Metodologi Ingestion

### A. Koneksi Asinkron (asyncpg)

Operasi I/O ke database bersifat *I/O Bound*. Library **`asyncpg`** memungkinkan eksekusi non-blocking:

```python
async def ingest_row(conn, row):
    # Cek idempoten sebelum insert
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

### B. Type Casting Kolom Kompleks

| Tipe CSV | Tipe PostgreSQL | Handling |
|---|---|---|
| `"Python,SQL,Excel"` | `TEXT[]` | `list(map(str.strip, val.split(',')))` |
| `"3000000.0"` (float string) | `INTEGER` | `try: int(float(val)) except: None` |
| `NULL / NaN` | `NULL` | Pengecekan `pd.isna()` |

### C. Idempotensi Operasi

Script dirancang **idempotent** — aman dieksekusi berulang kali:
- Sebelum `INSERT`, dicek apakah `(title, company)` sudah ada → jika ya, *skip*
- Pola ini setara dengan `INSERT ... ON CONFLICT DO NOTHING`

### D. Full-Text Search (tsvector)

Kolom `search_vector` diisi otomatis via PostgreSQL trigger atau saat embedding, menggabungkan `title`, `skills`, dan `cluster`:

```sql
search_vector = to_tsvector('simple', title || ' ' || array_to_string(skills, ' ') || ' ' || cluster)
```

Ini digunakan oleh komponen FTS dalam `hybrid_search` (Task 05).

---

## 5. Inisialisasi pgvector

Ekstensi pgvector harus diaktifkan sebelum tabel dapat menyimpan kolom `VECTOR`:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Kolom `embedding VECTOR(768)` diisi oleh **Task 04 (Embedding)**. Setelah Task 03, kolom ini masih `NULL` — artinya data siap secara tekstual tetapi belum siap untuk pencarian semantik.

---

## 6. Distribusi Data Final di Database

Setelah seluruh iterasi scraping + cleaning + ingestion selesai:

```
Cluster                          | Jumlah
---------------------------------|-------
Analisis Data                    |   90  ✓
Bisnis & Administrasi            |   90  ✓
Desain & Kreatif                 |   90  ✓
Education & Training             |   90  ✓
Finance & Accounting             |   90  ✓
Pemasaran Digital                |   90  ✓
Sales & Customer Service         |   90  ✓
Teknologi & Perangkat Lunak      |   90  ✓
---------------------------------|-------
TOTAL                            |  720  ✓
```

> **Distribusi seimbang sempurna (90 per klaster)** merupakan persyaratan metodologis utama untuk validitas evaluasi sistem RAG lintas klaster. Tanpa keseimbangan ini, metrik Precision@k per klaster tidak dapat dibandingkan secara fair.

---

## 7. Verifikasi

Setelah ingestion, distribusi diverifikasi menggunakan:

```bash
python scripts/_check_distribution.py
```

Output akan menampilkan jumlah per klaster dan flag gap jika ada klaster yang belum mencapai 90.
