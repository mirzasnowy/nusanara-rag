# Task 02 — Data Cleaning, Preprocessing & Pembentukan Knowledge Base

## 1. Tujuan

Data mentah hasil scraping mengandung anomali: duplikasi, format tidak konsisten, *missing values*, dan jabatan yang tidak relevan dengan klaster targetnya. Tahap ini menghasilkan dataset bersih yang siap masuk ke database sebagai *Knowledge Base* sistem RAG.

**File utama:** `backend/scripts/clean_jobs.py`

---

## 2. Pipeline Pembersihan Data

```
raw_jobs.csv
     │
     ▼
┌─────────────────────────────────────┐
│  A. Deduplikasi                     │
│     drop_duplicates(title+company)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  B. Validasi Kritis                 │
│     dropna(title, company)          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  C. Normalisasi Gaji (RegEx)        │
│     → salary_min, salary_max (int)  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  D. Inferensi Heuristik             │
│     → skills, experience            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  E. Pemberian Label Klaster         │
│     → kolom `cluster` (8 nilai)     │
└──────────────┬──────────────────────┘
               │
               ▼
         cleaned_jobs.csv
```

---

## 3. Detail Setiap Tahap

### A. Deduplikasi

```python
df.drop_duplicates(subset=["title", "company"])
```

Lowongan dengan judul **dan** nama perusahaan identik dihapus. Duplikat terjadi karena satu lowongan muncul di beberapa halaman keyword yang berbeda saat scraping.

**Dampak:** Mencegah bias dalam *vector space* — dokumen duplikat akan memiliki embedding yang hampir identik, sehingga dapat menggelembungkan skor *cosine similarity* secara artifisial.

### B. Validasi Kritis

Baris dengan kolom krusial (`title`, `company`) bernilai `NaN` dihapus. Tanpa judul atau perusahaan, sebuah lowongan tidak memiliki identitas yang bisa di-retrieve.

### C. Normalisasi Gaji (RegEx)

Kolom gaji dari Glints berupa teks bebas yang tidak seragam:

| Format Asli | Hasil |
|---|---|
| `"Rp 5 jt - 10 jt"` | `salary_min=5000000, salary_max=10000000` |
| `"IDR 3.000.000 - 5.000.000"` | `salary_min=3000000, salary_max=5000000` |
| `"Gaji Tidak Ditampilkan"` | `salary_min=NULL, salary_max=NULL` |

```python
nums = re.findall(r'[\d.]+', text)
multiplier = 1_000_000 if 'jt' in text.lower() else 1_000
salary_min = int(float(nums[0]) * multiplier)
```

Menghasilkan kolom `INTEGER` absolut di PostgreSQL yang mendukung filtering: `WHERE salary_min >= 5000000`.

### D. Inferensi Heuristik (Imputasi Pengetahuan)

Kolom `skills` dan `seniority_level` sering kosong saat scraping. Sistem mengisi kekosongan ini secara otomatis berdasarkan judul jabatan:

**Inferensi Level Pengalaman:**

| Kata Kunci di Judul | Imputasi `experience_min` |
|---|---|
| "Senior", "Lead", "Manager", "Head" | 3 tahun |
| "Junior", "Associate" | 1 tahun |
| "Intern", "Fresh", "Magang" | 0 tahun |

**Inferensi Skills:**

```python
SKILL_KEYWORDS = {
    "Data Scientist": ["Python", "Machine Learning", "SQL", "Statistics"],
    "UI/UX Designer": ["Figma", "Adobe XD", "Prototyping", "User Research"],
    "Digital Marketing": ["Google Ads", "SEO", "Social Media", "Analytics"],
    ...
}
```

Menggunakan `set()` untuk mencegah duplikasi skill dalam satu entry.

### E. Pemberian Label Klaster

Setiap lowongan di-assign ke salah satu dari **8 klaster karier** berdasarkan keyword judul:

| Klaster | Contoh Jabatan |
|---|---|
| Teknologi & Perangkat Lunak | Software Engineer, Web Developer, IT Support |
| Analisis Data | Data Analyst, Business Intelligence, Data Scientist |
| Desain & Kreatif | Graphic Designer, UI/UX Designer, Content Writer |
| Pemasaran Digital | Digital Marketing, SEO Specialist, Social Media Specialist |
| Bisnis & Administrasi | Project Manager, Business Development, Office Manager |
| Sales & Customer Service | Sales Executive, Customer Service, Account Manager |
| Finance & Accounting | Accounting Staff, Finance Analyst, Internal Auditor |
| Education & Training | Guru, Tutor, Trainer, Instruktur |

---

## 4. Pembentukan Content Field (Document Formulation)

Untuk mendukung embedding yang kaya konteks, setiap lowongan diformat menjadi representasi teks naratif (disimpan di kolom `content`):

```
search_document: {title} di {company}.
Lokasi: {location}.
Gaji: {salary_text}.
Klaster: {cluster}.
Konteks karier: {context_spesifik_klaster}.
Keahlian: {skills}.
Syarat: Minimal {experience} tahun pengalaman.
```

Prefix `search_document:` adalah instruksi khusus untuk model embedding `nomic-embed-text-v2-moe` agar representasi vektor dioptimalkan sebagai dokumen referensi (bukan query).

---

## 5. Output Akhir

| Metrik | Nilai |
|---|---|
| Baris input (raw) | ~900+ (multi-batch scraping) |
| Baris output (cleaned) | **720** |
| Lowongan per klaster | **90 (sempurna merata)** |
| File output | `data/cleaned_jobs.csv` |
| Kolom utama | `title, company, location, salary_min, salary_max, skills[], cluster, content, seniority_level` |

> **Catatan penting:** Proses cleaning dilakukan iteratif — jika satu klaster kekurangan data setelah deduplication, dilakukan top-up scraping (Task 01 fase kedua) dan cleaning ulang hingga mencapai 90 per klaster.
