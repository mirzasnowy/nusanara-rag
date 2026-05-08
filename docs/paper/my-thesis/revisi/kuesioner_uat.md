# Kuesioner User Acceptance Testing (UAT)
## NusaNara — Sistem Bimbingan Karier Berbasis RAG
### Instrumen Evaluasi Penerimaan Pengguna

---

## Petunjuk Pengisian

Berikan penilaian Anda terhadap setiap pernyataan berikut berdasarkan pengalaman Anda menggunakan sistem NusaNara. Pilih angka yang paling menggambarkan tingkat persetujuan Anda:

| Skala | Keterangan |
|:-:|---|
| **1** | Sangat Tidak Setuju |
| **2** | Tidak Setuju |
| **3** | Cukup / Netral |
| **4** | Setuju |
| **5** | Sangat Setuju |

---

## Bagian A — Relevansi dan Akurasi Rekomendasi (Aspek RAG)

| No | Pernyataan | 1 | 2 | 3 | 4 | 5 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| 1 | Rekomendasi posisi karier yang diberikan sistem sesuai dengan latar belakang dan keterampilan yang saya ceritakan | | | | | |
| 2 | Informasi lowongan pekerjaan yang ditampilkan (posisi, keterampilan, perusahaan) terasa relevan dengan konteks karier Indonesia | | | | | |
| 3 | Sistem memberikan analisis yang membantu saya memahami kesesuaian antara profil saya dan pasar kerja | | | | | |

---

## Bagian B — Personalisasi Adaptif (Aspek Adaptive System)

| No | Pernyataan | 1 | 2 | 3 | 4 | 5 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| 4 | Sistem tampak memahami minat dan keterampilan saya dari narasi yang saya sampaikan secara percakapan | | | | | |
| 5 | Saya merasa rekomendasi yang diberikan bersifat personal dan tidak generik | | | | | |

---

## Bagian C — Kegunaan dan Pengalaman Pengguna (Aspek Usability)

| No | Pernyataan | 1 | 2 | 3 | 4 | 5 |
|---|---|:-:|:-:|:-:|:-:|:-:|
| 6 | Saya mendapatkan wawasan baru tentang pilihan karier yang belum pernah saya pertimbangkan sebelumnya | | | | | |
| 7 | Secara keseluruhan, saya merasa sistem NusaNara bermanfaat untuk membantu eksplorasi karier saya | | | | | |

---

## Rumus Pengolahan Data

### Mean Per Item
$$\bar{x}_i = \frac{\sum_{j=1}^{n} x_{ij}}{n}$$

Di mana $n$ = jumlah responden, $x_{ij}$ = skor responden $j$ pada item $i$.

### Grand Mean
$$\bar{X} = \frac{\sum_{i=1}^{7} \bar{x}_i}{7}$$

### Persentase Persetujuan (Skor ≥ 4)
$$PA_i = \frac{|\{j : x_{ij} \geq 4\}|}{n} \times 100\%$$

---

## Tabel Interpretasi Grand Mean

| Rentang | Interpretasi |
|---|---|
| 4.21 – 5.00 | Sangat Baik / Sangat Diterima |
| 3.41 – 4.20 | Baik / Diterima |
| 2.61 – 3.40 | Cukup |
| 1.81 – 2.60 | Tidak Baik |
| 1.00 – 1.80 | Sangat Tidak Baik |

---

## Justifikasi Jumlah Sampel

Evaluasi UAT dilakukan terhadap **10–15 responden** yang dipilih secara *purposive sampling*, yaitu mahasiswa aktif yang sedang dalam fase eksplorasi karier (minimal semester 5 atau sedang mencari pekerjaan pertama). Justifikasi jumlah sampel:

1. **Kerangka DSR:** Peffers et al. (2007) menyatakan evaluasi formatif dalam DSR tidak mensyaratkan sampel besar — tujuannya adalah memvalidasi kesesuaian artefak dengan konteks penggunaan yang dituju, bukan generalisasi statistik.
2. **Fokus penelitian:** Kontribusi utama penelitian ini adalah pada komponen teknis RAG (diukur melalui P@k dan MRR), bukan pada pengukuran dampak psikologis pengguna. UAT berfungsi sebagai validasi pelengkap.
3. **Purposive sampling:** Pemilihan responden berdasarkan kriteria spesifik (fase eksplorasi karier aktif) memastikan relevansi dan kedalaman umpan balik melebihi sampel acak yang lebih besar.

---

## Template Tabel Hasil (Isi setelah data terkumpul)

| Responden | Q1 | Q2 | Q3 | Q4 | Q5 | Q6 | Q7 | Mean |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| R01 | | | | | | | | |
| R02 | | | | | | | | |
| ... | | | | | | | | |
| **Mean Item** | | | | | | | | |
| **Grand Mean** | | | | | | | | **—** |

---

## Catatan Pengumpulan Data

- **Media:** Google Form (daring)
- **Durasi uji coba:** Responden diberi waktu 10–15 menit untuk menggunakan NusaNara sebelum mengisi kuesioner
- **Skenario penggunaan:** Responden diminta menuliskan narasi latar belakang pendidikan dan minat karier mereka dalam bahasa percakapan natural
