# Task 01 — Scraping Data Lowongan Kerja dari Glints Indonesia

## 1. Tujuan dan Konteks

Sistem NusaNara dibangun di atas arsitektur **Retrieval-Augmented Generation (RAG)** murni, di mana kualitas *Knowledge Base* menentukan langsung kualitas rekomendasi. Data lowongan tidak diambil dari dataset publik/statis karena kondisi pasar kerja Indonesia berubah dinamis. Oleh karena itu, data aktual diambil langsung (*web scraping*) dari **Glints Indonesia** (`glints.com/id`) — portal rekrutmen dengan struktur HTML yang terstandarisasi dan konten lowongan yang konsisten.

**Target akhir:** 720 lowongan unik, terbagi merata dalam **8 klaster karier** masing-masing **90 lowongan** (perfectly balanced dataset).

---

## 2. Alasan Pemilihan Selenium (bukan BeautifulSoup / Requests)

Glints menggunakan arsitektur **Single Page Application (SPA)** berbasis React dengan *Client-Side Rendering (CSR)*:

```
Browser Request → HTML kosong diterima → JavaScript dieksekusi → Data lowongan di-fetch via API → DOM diisi
```

Pendekatan `requests + BeautifulSoup` hanya membaca HTML awal yang **masih kosong** sebelum JavaScript berjalan. **Selenium WebDriver** mengontrol browser Chrome sungguhan (headless) sehingga JavaScript sepenuhnya tereksekusi sebelum DOM diekstrak.

---

## 3. Arsitektur Skrip Scraper

**File:** `backend/scripts/scraper_glints.py`

```
┌─────────────────────────────────────────────────────────┐
│                   scraper_glints.py                     │
│                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │ CLUSTER     │    │  PHASE A     │    │  PHASE B  │  │
│  │ KEYWORDS    │───►│  Link        │───►│  Deep     │  │
│  │ (8 cluster) │    │  Gathering   │    │  Scraping │  │
│  └─────────────┘    └──────────────┘    └───────────┘  │
│                            │                   │        │
│                       URL List           Raw CSV Output │
└─────────────────────────────────────────────────────────┘
```

### Fase A — Pengumpulan Tautan (Link Gathering)

Script mengiterasi **kata kunci per klaster**. Setiap keyword membuka halaman listing Glints, lalu mensimulasikan *scroll* manusia agar *lazy-loaded* lowongan termuat:

| Klaster | Kata Kunci Utama |
|---|---|
| Teknologi & Perangkat Lunak | Software Engineer, Web Developer, Backend Developer, Laravel, Node.js |
| Analisis Data | Data Analyst, Business Intelligence, Data Scientist, Machine Learning |
| Desain & Kreatif | Graphic Designer, UI/UX Designer, Motion Graphic, Content Writer |
| Pemasaran Digital | Digital Marketing, Social Media Specialist, SEO Specialist, Google Ads |
| Bisnis & Administrasi | Project Manager, Business Development, Office Manager |
| Sales & Customer Service | Sales Executive, Customer Service, Account Manager, Call Center |
| Finance & Accounting | Accounting Staff, Finance Analyst, Internal Auditor, Tax Staff |
| Education & Training | Guru, Tutor, Trainer, Instruktur |

CSS Selector yang digunakan untuk ekstraksi tautan:
```python
"a[class*='CompactOpportunityCardsc__JobCardTitleNoStyleAnchor']"
```

### Fase B — Ekstraksi Detail (Deep Scraping)

Setiap tautan dibuka satu per satu. `WebDriverWait` (Explicit Wait) digunakan untuk menunggu elemen DOM siap sebelum diekstrak:

| Field | Sumber DOM |
|---|---|
| `title` | Tag `<h1>` judul lowongan |
| `company` | Elemen nama perusahaan |
| `location` | Badge lokasi kota/provinsi |
| `salary_text` | Badge rentang gaji |
| `skills` | Tag skill yang dilabeli Glints |
| `job_description` | Kontainer deskripsi pekerjaan |
| `seniority_level` | Badge level pengalaman |

---

## 4. Deduplication & Quota Control

Kelas `Deduplicator` melacak URL yang sudah pernah diproses menggunakan `set()` untuk mencegah pengambilan duplikat. Setiap klaster memiliki *quota* maksimum sehingga distribusi terkontrol.

```python
class Deduplicator:
    def __init__(self):
        self.seen_urls = set()
    def is_new(self, url):
        if url in self.seen_urls: return False
        self.seen_urls.add(url)
        return True
```

---

## 5. Teknik Anti-Bot (Evasion)

Untuk menghindari deteksi dan pemblokiran IP oleh sistem Cloudflare Glints, digunakan **`selenium-stealth`** yang memodifikasi fingerprint browser:

- Menghapus variabel `navigator.webdriver = true` yang menjadi penanda browser otomatis
- Memalsukan properti `WebGL Vendor`, `Renderer`, dan `User-Agent` agar menyerupai sesi pengguna organik
- Jeda acak (`time.sleep`) di antara request untuk meniru pola perilaku manusia

---

## 6. Multi-Phase Scraping (Top-Up)

Karena target distribusi seimbang (90/klaster) tidak tercapai dalam satu kali scraping, dilakukan proses **top-up scraping** menggunakan skrip tambahan:

| Skrip | Fungsi |
|---|---|
| `_topup_scraper.py` | Top-up awal berdasarkan distribusi gap |
| `_direct_topup.py` | Top-up dengan keyword segar untuk menghindari duplikat |
| `_pipeline_topup.py` | Scraping → cleaning → insert → embed dalam satu pipeline |

**Strategi keyword segar** digunakan saat skrip utama gagal menemukan lowongan baru (karena duplikat di-skip). Contoh: keyword `"Data+Science"` dipakai sebagai alternatif dari `"Data+Analyst"`.

---

## 7. Output Akhir

| Metrik | Nilai |
|---|---|
| Total lowongan unik | **720** |
| Jumlah klaster | **8** |
| Lowongan per klaster | **90 (sempurna merata)** |
| File output | `data/raw_jobs_new_clusters.csv` |
| Format kolom | `title, company, location, salary_text, skills, job_description, seniority_level, cluster, url` |

> **Catatan:** Keseimbangan 90 lowongan per klaster adalah **keputusan metodologis eksplisit** untuk memastikan tidak ada bias distribusi data dalam evaluasi sistem RAG.
