NusaNara — Folder Data
======================

Folder ini berisi dataset lowongan kerja yang digunakan sebagai Knowledge Base
sistem RAG NusaNara. Data diambil dari Glints Indonesia via web scraping.

FILE:
-----

1. raw_jobs_final.csv (281 KB)
   - Dataset mentah hasil scraping (multi-batch, multi-keyword)
   - ~900+ baris sebelum deduplication
   - Kolom: title, company, location, salary_text, skills, job_description,
             seniority_level, cluster, url
   - JANGAN edit file ini — ini adalah arsip data mentah

2. cleaned_jobs.csv (266 KB)
   - Dataset final setelah cleaning, deduplication, dan normalisasi
   - 720 baris — 90 lowongan per klaster (8 klaster, perfectly balanced)
   - Kolom: title, company, location, salary_min, salary_max, skills[],
             cluster, content, seniority_level
   - File ini yang diimport ke PostgreSQL (Task 03)
   - File ini yang digunakan sebagai Knowledge Base sistem RAG

KLASTER (8 klaster, 90 lowongan masing-masing):
  1. Teknologi & Perangkat Lunak
  2. Analisis Data
  3. Desain & Kreatif
  4. Pemasaran Digital
  5. Bisnis & Administrasi
  6. Sales & Customer Service
  7. Finance & Accounting
  8. Education & Training

TOTAL: 720 lowongan unik
