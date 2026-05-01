# DESAIN APLIKASI WEB — NusaNara
# Panduan Lengkap UI/UX, Halaman, dan Alur Pengguna
**Versi 1.0 | Muhammad Mirza Kurniawan | UNSIKA 2025**

---

## Daftar Isi
1. [Gambaran Umum Aplikasi](#1-gambaran-umum-aplikasi)
2. [Peta Aplikasi (Sitemap)](#2-peta-aplikasi-sitemap)
3. [Alur Pengguna (User Flow)](#3-alur-pengguna-user-flow)
4. [Halaman per Halaman](#4-halaman-per-halaman)
   - 4.1 [Landing Page (`/`)](#41-landing-page-)
   - 4.2 [Halaman Sign In (`/sign-in`)](#42-halaman-sign-in-sign-in)
   - 4.3 [Halaman Sign Up (`/sign-up`)](#43-halaman-sign-up-sign-up)
   - 4.4 [Dashboard / Halaman Utama (`/dashboard`)](#44-dashboard--halaman-utama-dashboard)
   - 4.5 [Halaman Input Narasi (`/dashboard/rekomendasi`)](#45-halaman-input-narasi-dashboardrekomendasi)
   - 4.6 [Halaman Hasil Rekomendasi (`/dashboard/rekomendasi/hasil`)](#46-halaman-hasil-rekomendasi-dashboardrekomendasihasil)
   - 4.7 [Halaman Riwayat (`/dashboard/riwayat`)](#47-halaman-riwayat-dashboardriwayat)
   - 4.8 [Halaman Detail Riwayat (`/dashboard/riwayat/[id]`)](#48-halaman-detail-riwayat-dashboardriwayatid)
   - 4.9 [Halaman Profil (`/dashboard/profil`)](#49-halaman-profil-dashboardprofil)
   - 4.10 [Halaman 404 & Error](#410-halaman-404--error)
5. [Komponen Reusable](#5-komponen-reusable)
6. [State Management & Data Flow](#6-state-management--data-flow)
7. [Navigasi & Layout](#7-navigasi--layout)
8. [Desain Responsif](#8-desain-responsif)
9. [Diagram Alur Lengkap](#9-diagram-alur-lengkap)

---

## 1. Gambaran Umum Aplikasi

### 1.1 Identitas Produk

```
Nama Aplikasi : NusaNara
Tagline       : "Temukan Jalur Kariermu, Ceritakan Kisahmu"
Target User   : Siswa SMA/SMK dan Mahasiswa Indonesia
Platform      : Web App (Mobile-friendly)
Tech Frontend : Next.js 14 (App Router) + TypeScript + Tailwind CSS
Auth          : Clerk (Google OAuth)
Hosting       : Vercel
```

### 1.2 Prinsip Desain

- **Personal** — setiap halaman harus terasa seperti berbicara dengan konselor, bukan mesin
- **Sederhana** — tidak ada fitur yang tidak perlu, fokus pada narasi → rekomendasi
- **Transparan** — user tahu sistem sedang memproses apa
- **Adaptif** — sistem menunjukkan bahwa ia "ingat" pengguna dari sesi sebelumnya

### 1.3 Warna & Tipografi

```
Warna Utama  : #1E3A5F (navy gelap) — judul, header
Warna Aksen  : #2E86AB (biru cerah) — tombol utama, link, highlight
Warna Sukses : #27AE60 (hijau)      — badge, status sukses
Warna Teks   : #2C3E50              — body text
Background   : #F8FAFB              — background halaman
Card bg      : #FFFFFF              — kartu konten

Font Judul   : Inter Bold / Poppins Bold
Font Body    : Inter Regular
Font Kode    : -  (tidak ada)
```

---

## 2. Peta Aplikasi (Sitemap)

```
nusanara.vercel.app
│
├── /                              ← Landing Page (publik)
│
├── /sign-in                       ← Halaman Login (Clerk)
├── /sign-up                       ← Halaman Registrasi (Clerk)
│
└── /dashboard                     ← Area Terproteksi (wajib login)
    │
    ├── /dashboard                 ← Dashboard utama (ringkasan & CTA)
    │
    ├── /dashboard/rekomendasi     ← Halaman input narasi
    └── /dashboard/rekomendasi/hasil ← Halaman hasil streaming
    │
    ├── /dashboard/riwayat         ← Daftar semua riwayat rekomendasi
    └── /dashboard/riwayat/[id]    ← Detail satu riwayat
    │
    └── /dashboard/profil          ← Profil adaptif pengguna
```

### Akses Kontrol

```
Halaman          │ Tidak Login │ Sudah Login
─────────────────┼─────────────┼────────────
/                │ ✅ Bisa     │ ✅ Bisa
/sign-in         │ ✅ Bisa     │ → redirect /dashboard
/sign-up         │ ✅ Bisa     │ → redirect /dashboard
/dashboard/*     │ → /sign-in  │ ✅ Bisa
```

---

## 3. Alur Pengguna (User Flow)

### 3.1 Alur Utama: Pengguna Baru (Pertama Kali)

```
[Buka nusanara.vercel.app]
          │
          ▼
  ┌───────────────┐
  │  Landing Page │
  │  Baca info    │
  │  sistem       │
  └──────┬────────┘
         │ Klik "Mulai Sekarang"
         ▼
  ┌───────────────┐
  │  Sign Up Page │
  │  Pilih        │
  │  "Lanjut      │
  │   dengan      │
  │   Google"     │
  └──────┬────────┘
         │ Berhasil OAuth
         ▼
  ┌───────────────────────┐
  │  Dashboard (Pertama)  │
  │  Muncul onboarding    │
  │  "Halo [Nama]!        │
  │   Yuk mulai cerita    │
  │   tentang dirimu"     │
  └──────┬────────────────┘
         │ Klik "Buat Rekomendasi Pertama"
         ▼
  ┌───────────────────────┐
  │  Halaman Input Narasi │
  │  Isi textarea narasi  │
  │  (ada panduan/contoh) │
  └──────┬────────────────┘
         │ Klik "Dapatkan Rekomendasi"
         ▼
  ┌───────────────────────┐
  │  Loading state        │
  │  "NusaNara sedang     │
  │   membaca ceritamu..."│
  └──────┬────────────────┘
         │ Streaming dimulai
         ▼
  ┌───────────────────────┐
  │  Halaman Hasil        │
  │  Teks muncul          │
  │  huruf per huruf      │
  │  (streaming SSE)      │
  └──────┬────────────────┘
         │ Streaming selesai
         ▼
  ┌───────────────────────┐
  │  Hasil lengkap        │
  │  Tombol: "Simpan" /   │
  │  "Buat Rekomendasi    │
  │   Baru" / "Riwayat"   │
  └───────────────────────┘
```

### 3.2 Alur Pengguna Kembali (Sesi Berikutnya)

```
[Buka nusanara.vercel.app]
          │
          ▼ (sudah ada sesi Clerk)
  ┌───────────────────────┐
  │  Dashboard            │
  │  "Selamat kembali,    │
  │   [Nama]!"            │
  │                       │
  │  Profil Saat Ini:     │
  │  "[summary profil]"   │
  │                       │
  │  Riwayat terbaru: 3   │
  └──────┬────────────────┘
         │ Klik "Perbarui Rekomendasi"
         ▼
  ┌───────────────────────┐
  │  Halaman Input        │
  │  Narasi               │
  │                       │
  │  [Banner kuning]:     │
  │  "Profil kamu akan    │
  │   digabung dengan     │
  │   cerita baru ini"    │
  │                       │
  │  Textarea kosong      │
  │  (cerita baru saja)   │
  └──────┬────────────────┘
         │ Submit
         ▼
  [Proses sama seperti Alur Utama]
```

### 3.3 Alur Melihat Riwayat

```
[Dashboard]
     │ Klik "Riwayat"
     ▼
[Halaman Riwayat]
Tampil daftar card riwayat
(tanggal, cuplikan narasi, posisi direkomendasikan)
     │ Klik salah satu card
     ▼
[Halaman Detail Riwayat]
Tampil narasi asli + rekomendasi lengkap + profil saat itu
     │ Klik "Buat Rekomendasi Baru"
     ▼
[Halaman Input Narasi]
```

---

## 4. Halaman per Halaman

---

### 4.1 Landing Page (`/`)

**Tujuan:** Meyakinkan pengguna yang belum login untuk mendaftar. Menjelaskan apa itu NusaNara dan mengapa berguna.

#### Layout Keseluruhan

```
┌────────────────────────────────────────────┐
│  NAVBAR                                    │
│  [Logo NusaNara]          [Masuk] [Daftar] │
├────────────────────────────────────────────┤
│                                            │
│  HERO SECTION                              │
│  ┌──────────────────────────────────────┐  │
│  │  Heading besar:                      │  │
│  │  "Temukan Jalur Kariermu,            │  │
│  │   Ceritakan Kisahmu"                 │  │
│  │                                      │  │
│  │  Subheading:                         │  │
│  │  "NusaNara menganalisis ceritamu     │  │
│  │   dan memberikan rekomendasi karier  │  │
│  │   yang personal dan berbasis data    │  │
│  │   lowongan nyata di Indonesia."      │  │
│  │                                      │  │
│  │  [Mulai Sekarang - Gratis]           │  │
│  │  ↳ tombol biru besar                 │  │
│  │                                      │  │
│  │  Ilustrasi: gambar/animasi           │  │
│  │  seseorang membaca rekomendasi karier│  │
│  └──────────────────────────────────────┘  │
│                                            │
├────────────────────────────────────────────┤
│  STATS SECTION (3 angka)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │   476    │ │    5     │ │   92%    │   │
│  │ Lowongan │ │  Klaster │ │ User puas│   │
│  │  di DB   │ │  Karier  │ │ (SUS)    │   │
│  └──────────┘ └──────────┘ └──────────┘   │
│                                            │
├────────────────────────────────────────────┤
│  CARA KERJA (3 langkah)                    │
│                                            │
│  1. Ceritakan dirimu                       │
│  ┌─────────────────────────────────────┐   │
│  │ Tulis narasi bebas tentang minat,   │   │
│  │ pengalaman, dan tujuan kariermu     │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  2. NusaNara menganalisis                  │
│  ┌─────────────────────────────────────┐   │
│  │ Sistem RAG mencocokkan ceritamu     │   │
│  │ dengan 476 data lowongan nyata      │   │
│  └─────────────────────────────────────┘   │
│                                            │
│  3. Dapatkan rekomendasi personal          │
│  ┌─────────────────────────────────────┐   │
│  │ Narasi jalur karier, analisis skill │   │
│  │ gap, dan langkah konkret untukmu    │   │
│  └─────────────────────────────────────┘   │
│                                            │
├────────────────────────────────────────────┤
│  FITUR UNGGULAN (2x2 grid)                 │
│  ┌──────────────┐ ┌──────────────┐         │
│  │ 🧠 Adaptif  │ │ 📊 Data Nyata│         │
│  │ Sistem ingat │ │ Berbasis     │         │
│  │ ceritamu dari│ │ lowongan dari│         │
│  │ sesi ke sesi │ │ Glints ID    │         │
│  └──────────────┘ └──────────────┘         │
│  ┌──────────────┐ ┌──────────────┐         │
│  │ 🇮🇩 Lokal   │ │ 🔒 Aman     │         │
│  │ Konteks      │ │ Login dengan │         │
│  │ Indonesia,   │ │ Google,      │         │
│  │ gaji rupiah  │ │ data aman    │         │
│  └──────────────┘ └──────────────┘         │
│                                            │
├────────────────────────────────────────────┤
│  CONTOH OUTPUT (preview)                   │
│  ┌─────────────────────────────────────┐   │
│  │ "Berdasarkan ceritamu sebagai       │   │
│  │  mahasiswa informatika yang suka    │   │
│  │  Python dan pernah ikut hackathon,  │   │
│  │  NusaNara merekomendasikan...       │   │
│  │                                     │   │
│  │  ✅ Data Scientist Junior           │   │
│  │  ✅ Backend Developer               │   │
│  │  ✅ ML Engineer Intern..."          │   │
│  │                       [terpotong]   │   │
│  │  [Coba Sendiri →]                   │   │
│  └─────────────────────────────────────┘   │
│                                            │
├────────────────────────────────────────────┤
│  CTA FINAL                                 │
│  "Siap menemukan jalur kariermu?"          │
│  [Mulai Sekarang - Gratis]                 │
│                                            │
├────────────────────────────────────────────┤
│  FOOTER                                    │
│  © 2025 NusaNara · Skripsi UNSIKA          │
│  Muhammad Mirza Kurniawan                  │
└────────────────────────────────────────────┘
```

#### Elemen & Interaksi

| Elemen | Deskripsi | Aksi |
|---|---|---|
| Navbar Logo | "NusaNara" dengan ikon kompas kecil | Klik → scroll ke atas |
| Tombol "Masuk" | Outline button, kanan atas | Klik → `/sign-in` |
| Tombol "Daftar" | Filled button biru, kanan atas | Klik → `/sign-up` |
| Tombol "Mulai Sekarang" (Hero) | Besar, biru, CTA utama | Klik → `/sign-up` |
| Stats | Angka animasi counter saat scroll | — |
| Contoh output | Card dengan teks terpotong (blur gradient) | Klik "Coba Sendiri" → `/sign-up` |

---

### 4.2 Halaman Sign In (`/sign-in`)

**Tujuan:** Login pengguna yang sudah punya akun. Ditangani sepenuhnya oleh **Clerk**.

#### Layout

```
┌────────────────────────────────────────────┐
│  NAVBAR                                    │
│  [← Kembali ke Beranda]                   │
├────────────────────────────────────────────┤
│                                            │
│  (tengah halaman, card putih)              │
│  ┌──────────────────────────────────────┐  │
│  │         🧭 NusaNara                  │  │
│  │                                      │  │
│  │    "Masuk ke Akunmu"                 │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │  G  Lanjutkan dengan Google    │  │  │
│  │  └────────────────────────────────┘  │  │
│  │                                      │  │
│  │  ───────── atau ─────────            │  │
│  │                                      │  │
│  │  Email:  [________________]          │  │
│  │  Password:[________________]         │  │
│  │                                      │  │
│  │  [Masuk]                             │  │
│  │                                      │  │
│  │  Belum punya akun? [Daftar]          │  │
│  └──────────────────────────────────────┘  │
│                                            │
└────────────────────────────────────────────┘
```

#### Catatan Teknis

- Seluruh form ini di-render oleh Clerk component `<SignIn />`
- Styling disesuaikan melalui Clerk appearance config (warna sesuai brand NusaNara)
- Setelah berhasil login → redirect otomatis ke `/dashboard`
- Error handling ditangani Clerk (email salah, password salah, dsb)

```tsx
// app/sign-in/page.tsx
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFB]">
      <SignIn
        appearance={{
          elements: {
            formButtonPrimary: "bg-[#2E86AB] hover:bg-[#1E3A5F]",
            card: "shadow-lg rounded-2xl",
          }
        }}
        redirectUrl="/dashboard"
      />
    </div>
  );
}
```

---

### 4.3 Halaman Sign Up (`/sign-up`)

**Tujuan:** Registrasi pengguna baru. Ditangani sepenuhnya oleh Clerk.

#### Layout

```
┌────────────────────────────────────────────┐
│  NAVBAR                                    │
│  [← Kembali ke Beranda]                   │
├────────────────────────────────────────────┤
│                                            │
│  (tengah halaman, card putih)              │
│  ┌──────────────────────────────────────┐  │
│  │         🧭 NusaNara                  │  │
│  │                                      │  │
│  │    "Mulai Perjalanan Kariermu"       │  │
│  │    Gratis, tanpa kartu kredit        │  │
│  │                                      │  │
│  │  ┌────────────────────────────────┐  │  │
│  │  │  G  Daftar dengan Google       │  │  │  ← Direkomendasikan
│  │  └────────────────────────────────┘  │  │
│  │                                      │  │
│  │  ───────── atau ─────────            │  │
│  │                                      │  │
│  │  Nama Lengkap: [_______________]     │  │
│  │  Email:        [_______________]     │  │
│  │  Password:     [_______________]     │  │
│  │                                      │  │
│  │  [Buat Akun]                         │  │
│  │                                      │  │
│  │  Sudah punya akun? [Masuk]           │  │
│  └──────────────────────────────────────┘  │
│                                            │
└────────────────────────────────────────────┘
```

#### Alur setelah Daftar

```
Klik "Daftar dengan Google"
        ↓
Google OAuth popup
        ↓
Berhasil
        ↓
Clerk otomatis buat user_id (format: user_xxxxxxxx)
        ↓
Redirect → /dashboard
        ↓
FastAPI auto-create row di user_profiles
(saat GET /profile pertama kali dipanggil)
```

---

### 4.4 Dashboard / Halaman Utama (`/dashboard`)

**Tujuan:** Halaman pertama setelah login. Memberi sambutan personal, ringkasan profil, statistik penggunaan, dan CTA utama.

#### Layout — Pengguna Baru (Belum Punya Rekomendasi)

```
┌────────────────────────────────────────────────────┐
│  SIDEBAR                │  MAIN CONTENT             │
│  ─────────────────────  │  ─────────────────────── │
│  🧭 NusaNara            │                           │
│                         │  WELCOME BANNER (onboard) │
│  [Avatar] Muhammad M.   │  ┌─────────────────────┐  │
│                         │  │ 👋 Halo, Muhammad!  │  │
│  ─ Navigasi ─           │  │                     │  │
│  🏠 Dashboard     ←sini │  │ NusaNara siap       │  │
│  🎯 Rekomendasi         │  │ membantu menemukan  │  │
│  📋 Riwayat             │  │ jalur kariermu.     │  │
│  👤 Profil              │  │                     │  │
│                         │  │ Mulai dengan        │  │
│  ─────────────────────  │  │ menceritakan        │  │
│  [Keluar]               │  │ sedikit tentang     │  │
│                         │  │ dirimu!             │  │
│                         │  │                     │  │
│                         │  │ [Buat Rekomendasi   │  │
│                         │  │  Pertamaku →]       │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  TIPS NARASI              │
│                         │  ┌─────────────────────┐  │
│                         │  │ 💡 Tips menulis     │  │
│                         │  │ narasi yang baik:   │  │
│                         │  │                     │  │
│                         │  │ • Ceritakan minatmu │  │
│                         │  │ • Sebutkan skill    │  │
│                         │  │ • Pengalaman apapun │  │
│                         │  │ • Tujuan ke depan   │  │
│                         │  └─────────────────────┘  │
└────────────────────────────────────────────────────┘
```

#### Layout — Pengguna Kembali (Sudah Ada Riwayat)

```
┌────────────────────────────────────────────────────┐
│  SIDEBAR                │  MAIN CONTENT             │
│  (sama seperti di atas) │                           │
│                         │  HEADER                   │
│                         │  "Selamat kembali,        │
│                         │   Muhammad! 👋"            │
│                         │                           │
│                         │  PROFIL ADAPTIF CARD      │
│                         │  ┌─────────────────────┐  │
│                         │  │ 🧠 Profil Kariermu  │  │
│                         │  │                     │  │
│                         │  │ "Mahasiswa           │  │
│                         │  │ informatika semester │  │
│                         │  │ 6 dengan minat kuat  │  │
│                         │  │ di Python dan ML.   │  │
│                         │  │ Pernah ikut 2       │  │
│                         │  │ hackathon."         │  │
│                         │  │                     │  │
│                         │  │ Diperbarui: 2 jam   │  │
│                         │  │ yang lalu           │  │
│                         │  │            [Lihat]  │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  STATISTIK (3 card kecil) │
│                         │  ┌───────┐ ┌───────┐ ┌──┐│
│                         │  │  3    │ │Terakhir│ │↑ ││
│                         │  │Sesi   │ │2 hr   │ │  ││
│                         │  │Total  │ │lalu   │ │  ││
│                         │  └───────┘ └───────┘ └──┘│
│                         │                           │
│                         │  CTA UTAMA                │
│                         │  ┌─────────────────────┐  │
│                         │  │ Ada cerita baru?    │  │
│                         │  │ Perbarui rekomendasimu│ │
│                         │  │                     │  │
│                         │  │ [+ Rekomendasi Baru]│  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  RIWAYAT TERBARU (3 card) │
│                         │  ┌─────────────────────┐  │
│                         │  │ 📄 2 jam lalu       │  │
│                         │  │ "Saya suka Python   │  │
│                         │  │  dan hackathon..."  │  │
│                         │  │ → Data Scientist    │  │
│                         │  │            [Lihat]  │  │
│                         │  └─────────────────────┘  │
│                         │  [Lihat Semua Riwayat →]  │
└────────────────────────────────────────────────────┘
```

#### Elemen Dashboard

| Elemen | Kondisi | Isi |
|---|---|---|
| Welcome banner | Sesi pertama | Onboarding dengan CTA "Buat Rekomendasi Pertama" |
| Profil card | Sesi ke-2 dst | Ringkasan profil adaptif + waktu update terakhir |
| Statistik | Selalu | Jumlah total sesi, sesi terakhir |
| CTA utama | Selalu | Tombol "Rekomendasi Baru" (biru, menonjol) |
| Riwayat terbaru | Ada riwayat | 3 card riwayat terbaru dengan preview narasi |

---

### 4.5 Halaman Input Narasi (`/dashboard/rekomendasi`)

**Tujuan:** Pengguna menuliskan narasi bebas tentang dirinya. Halaman paling penting secara fungsional.

#### Layout

```
┌────────────────────────────────────────────────────┐
│  SIDEBAR                │  MAIN CONTENT             │
│  (navigasi)             │                           │
│                         │  BREADCRUMB               │
│                         │  Dashboard > Rekomendasi  │
│                         │                           │
│                         │  HEADER                   │
│                         │  "Ceritakan Tentang Dirimu"│
│                         │  "Semakin detail ceritamu, │
│                         │   semakin personal         │
│                         │   rekomendasinya."          │
│                         │                           │
│                         │  [BANNER PROFIL - jika    │
│                         │   sudah ada profil]       │
│                         │  ┌─────────────────────┐  │
│                         │  │ 🔄 Profil lamamu    │  │
│                         │  │ akan digabungkan    │  │
│                         │  │ dengan cerita baru  │  │
│                         │  │ ini secara otomatis │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  FORM INPUT               │
│                         │  ┌─────────────────────┐  │
│                         │  │                     │  │
│                         │  │  [TEXTAREA]         │  │
│                         │  │                     │  │
│                         │  │  Placeholder:       │  │
│                         │  │  "Ceritakan tentang │  │
│                         │  │  dirimu di sini...  │  │
│                         │  │  Contoh: Saya       │  │
│                         │  │  mahasiswa semester │  │
│                         │  │  6 jurusan          │  │
│                         │  │  Informatika. Saya  │  │
│                         │  │  suka programming   │  │
│                         │  │  Python dan pernah  │  │
│                         │  │  ikut hackathon..." │  │
│                         │  │                     │  │
│                         │  │              50/50  │  │ ← counter karakter minimum
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  PANDUAN SINGKAT          │
│                         │  ┌─────────────────────┐  │
│                         │  │ 💡 Apa yang bisa    │  │
│                         │  │ kamu ceritakan:     │  │
│                         │  │                     │  │
│                         │  │ ✅ Jurusan/sekolah  │  │
│                         │  │ ✅ Mata pelajaran   │  │
│                         │  │    favorit          │  │
│                         │  │ ✅ Hobi & minat     │  │
│                         │  │ ✅ Pengalaman       │  │
│                         │  │    (magang, lomba)  │  │
│                         │  │ ✅ Skill yang kamu  │  │
│                         │  │    kuasai           │  │
│                         │  │ ✅ Impian karier    │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  CONTOH NARASI (toggle)   │
│                         │  [Lihat Contoh Narasi ▾]  │
│                         │  ┌─────────────────────┐  │ ← collapsible
│                         │  │ "Saya siswa SMK     │  │
│                         │  │ Multimedia kelas 12.│  │
│                         │  │ Saya jago desain    │  │
│                         │  │ Canva dan Figma,    │  │
│                         │  │ sering bikin konten │  │
│                         │  │ untuk OSIS. Mau     │  │
│                         │  │ kerja di bidang     │  │
│                         │  │ desain atau digital │  │
│                         │  │ marketing."         │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  TOMBOL AKSI              │
│                         │  [Dapatkan Rekomendasi →] │ ← disabled jika < 50 char
│                         │  [Batal]                  │
└────────────────────────────────────────────────────┘
```

#### Validasi Form

```
Validasi minimal:
- Panjang narasi minimum: 50 karakter
- Panjang narasi maksimum: 2000 karakter
- Counter karakter ditampilkan real-time
- Tombol submit disabled jika belum memenuhi syarat

Pesan error:
- < 50 karakter: "Ceritakan lebih banyak, minimal 50 karakter ya!"
- > 2000 karakter: "Narasi terlalu panjang, coba dipersingkat sedikit"
```

#### State Tombol Submit

```
State 1 (belum cukup karakter):
[Dapatkan Rekomendasi →]   ← disabled, warna abu-abu

State 2 (siap submit):
[Dapatkan Rekomendasi →]   ← aktif, warna biru

State 3 (loading - setelah klik):
[⏳ Memproses narasimu...] ← disabled, ada spinner
```

---

### 4.6 Halaman Hasil Rekomendasi (`/dashboard/rekomendasi/hasil`)

**Tujuan:** Menampilkan hasil rekomendasi dari LLM secara streaming. Halaman paling kompleks secara teknis.

#### Layout — Fase Loading (Sedang Streaming)

```
┌────────────────────────────────────────────────────┐
│  SIDEBAR                │  MAIN CONTENT             │
│  (navigasi)             │                           │
│                         │  HEADER                   │
│                         │  "Rekomendasi Kariermu"   │
│                         │                           │
│                         │  STATUS BANNER            │
│                         │  ┌─────────────────────┐  │
│                         │  │ 🔍 NusaNara sedang  │  │
│                         │  │ membaca ceritamu    │  │
│                         │  │ dan mencocokkan     │  │
│                         │  │ dengan data         │  │
│                         │  │ lowongan...         │  │
│                         │  │                     │  │
│                         │  │ [████████░░░░░░░░]  │  │ ← progress bar animasi
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  CONTENT AREA             │
│                         │  ┌─────────────────────┐  │
│                         │  │                     │  │
│                         │  │  ## 1. 🌟 Narasi    │  │
│                         │  │  Jalur Karier        │  │
│                         │  │                     │  │
│                         │  │  Berdasarkan cerita │  │
│                         │  │  yang kamu bagikan, │  │
│                         │  │  sebagai mahasiswa  │  │ ← teks muncul
│                         │  │  informatika yang   │  │   huruf per huruf
│                         │  │  memiliki passion   │  │   (streaming)
│                         │  │  di Python dan ▌    │  │ ← cursor berkedip
│                         │  │                     │  │
│                         │  └─────────────────────┘  │
└────────────────────────────────────────────────────┘
```

#### Layout — Fase Selesai (Hasil Lengkap)

```
┌────────────────────────────────────────────────────┐
│  SIDEBAR                │  MAIN CONTENT             │
│  (navigasi)             │                           │
│                         │  HEADER + STATUS          │
│                         │  "Rekomendasi Kariermu"   │
│                         │  ✅ Selesai · 23 detik    │
│                         │                           │
│                         │  HASIL LENGKAP            │
│                         │  ┌─────────────────────┐  │
│                         │  │                     │  │
│                         │  │ ## 1. 🌟 Narasi     │  │
│                         │  │ Jalur Karier        │  │
│                         │  │                     │  │
│                         │  │ Berdasarkan cerita  │  │
│                         │  │ yang kamu bagikan...│  │
│                         │  │ [paragraf panjang]  │  │
│                         │  │                     │  │
│                         │  │ ─────────────────── │  │
│                         │  │ ## 2. 💼 Rekomendasi│  │
│                         │  │ Posisi (Top 3)      │  │
│                         │  │                     │  │
│                         │  │ ### Data Scientist  │  │
│                         │  │ Junior              │  │
│                         │  │ Gaji: Rp 8-15jt     │  │
│                         │  │ Lokasi: Jakarta     │  │
│                         │  │ Mengapa cocok: ...  │  │
│                         │  │                     │  │
│                         │  │ ### Backend Dev     │  │
│                         │  │ ...                 │  │
│                         │  │                     │  │
│                         │  │ ─────────────────── │  │
│                         │  │ ## 3. 🔍 Skill Gap  │  │
│                         │  │ ...                 │  │
│                         │  │                     │  │
│                         │  │ ─────────────────── │  │
│                         │  │ ## 4. 📚 Rencana    │  │
│                         │  │ Pengembangan Skill  │  │
│                         │  │ ...                 │  │
│                         │  │                     │  │
│                         │  │ ─────────────────── │  │
│                         │  │ ## 5. 🇮🇩 Insight  │  │
│                         │  │ Pasar Kerja Lokal   │  │
│                         │  │ ...                 │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  TOMBOL AKSI (sticky)     │
│                         │  ┌─────────────────────┐  │
│                         │  │ [📋 Salin Teks]     │  │
│                         │  │ [+ Rekomendasi Baru]│  │
│                         │  │ [📂 Lihat Riwayat]  │  │
│                         │  └─────────────────────┘  │
└────────────────────────────────────────────────────┘
```

#### Komponen Teknis Streaming

```tsx
// Pseudocode alur streaming di frontend

async function fetchRecommendation(narrative: string) {
  setStatus("loading");

  const response = await fetch("/api/recommend", {
    method: "POST",
    body: JSON.stringify({ narrative }),
    headers: { Authorization: `Bearer ${clerkToken}` }
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    // Parse "data: {"token": "Berdasarkan"}\n\n"
    const token = parseSSEToken(chunk);
    setDisplayText(prev => prev + token);  // tambah huruf per huruf
  }

  setStatus("done");
  saveToHistory();
}
```

#### State Handling

```
state: "idle"
→ Belum ada aksi (tidak mungkin di halaman ini)

state: "loading"
→ Tampil progress bar + teks streaming muncul perlahan
→ Tombol aksi disabled

state: "streaming"
→ Teks terus bertambah
→ Cursor berkedip di akhir teks

state: "done"
→ Progress bar hilang, muncul badge "✅ Selesai · X detik"
→ Tombol aksi muncul (Salin, Rekomendasi Baru, Riwayat)

state: "error"
→ Muncul pesan error
→ Tombol "Coba Lagi"
```

---

### 4.7 Halaman Riwayat (`/dashboard/riwayat`)

**Tujuan:** Menampilkan daftar semua rekomendasi yang pernah dibuat pengguna.

#### Layout

```
┌────────────────────────────────────────────────────┐
│  SIDEBAR                │  MAIN CONTENT             │
│  (navigasi)             │                           │
│                         │  BREADCRUMB               │
│                         │  Dashboard > Riwayat      │
│                         │                           │
│                         │  HEADER + COUNTER         │
│                         │  "Riwayat Rekomendasi"    │
│                         │  "3 rekomendasi tersimpan"│
│                         │                           │
│                         │  FILTER / SORT (opsional) │
│                         │  [Terbaru ▾]  [Semua ▾]   │
│                         │                           │
│                         │  DAFTAR CARD RIWAYAT      │
│                         │                           │
│                         │  ┌─────────────────────┐  │
│                         │  │ 📄 Rekomendasi #3   │  │
│                         │  │                     │  │
│                         │  │ 🕒 2 jam yang lalu  │  │
│                         │  │                     │  │
│                         │  │ Narasiku:           │  │
│                         │  │ "Saya mahasiswa     │  │
│                         │  │ informatika semester│  │
│                         │  │ 6..."  [lebih]      │  │
│                         │  │                     │  │
│                         │  │ Direkomendasikan:   │  │
│                         │  │ 🏷️ Data Scientist  │  │
│                         │  │ 🏷️ Backend Dev     │  │
│                         │  │ 🏷️ ML Engineer     │  │
│                         │  │                     │  │
│                         │  │ ⏱️ 23 detik        │  │
│                         │  │             [Buka →]│  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  ┌─────────────────────┐  │
│                         │  │ 📄 Rekomendasi #2   │  │
│                         │  │ 🕒 Kemarin, 14:32   │  │
│                         │  │ "Saya suka desain   │  │
│                         │  │ grafis dan..."      │  │
│                         │  │ 🏷️ UI/UX Designer  │  │
│                         │  │ 🏷️ Graphic Designer│  │
│                         │  │             [Buka →]│  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  ┌─────────────────────┐  │
│                         │  │ 📄 Rekomendasi #1   │  │
│                         │  │ 🕒 3 hari lalu      │  │
│                         │  │ [card lebih redup]  │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  [Buat Rekomendasi Baru+] │
└────────────────────────────────────────────────────┘
```

#### Kondisi Empty State

```
Jika belum ada riwayat:

┌─────────────────────────────────┐
│                                 │
│        📭                       │
│                                 │
│  Belum ada riwayat              │
│                                 │
│  Mulai dengan membuat           │
│  rekomendasi pertamamu!         │
│                                 │
│  [Buat Rekomendasi Sekarang]    │
│                                 │
└─────────────────────────────────┘
```

---

### 4.8 Halaman Detail Riwayat (`/dashboard/riwayat/[id]`)

**Tujuan:** Menampilkan ulang satu rekomendasi secara lengkap beserta konteks (narasi asli, profil saat itu).

#### Layout

```
┌────────────────────────────────────────────────────┐
│  SIDEBAR                │  MAIN CONTENT             │
│  (navigasi)             │                           │
│                         │  BREADCRUMB               │
│                         │  Dashboard > Riwayat >    │
│                         │  Rekomendasi #3           │
│                         │                           │
│                         │  HEADER                   │
│                         │  "Detail Rekomendasi"     │
│                         │  🕒 2 jam yang lalu       │
│                         │                           │
│                         │  NARASI YANG DIKIRIM      │
│                         │  ┌─────────────────────┐  │
│                         │  │ 💬 Narasimu saat itu│  │
│                         │  │                     │  │
│                         │  │ "Saya mahasiswa     │  │
│                         │  │ informatika semester│  │
│                         │  │ 6 di UNSIKA. Saya   │  │
│                         │  │ suka Python dan     │  │
│                         │  │ Machine Learning,   │  │
│                         │  │ pernah ikut         │  │
│                         │  │ hackathon 2 kali."  │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  PROFIL SAAT ITU          │
│                         │  ┌─────────────────────┐  │
│                         │  │ 🧠 Profil saat      │  │
│                         │  │ rekomendasi dibuat  │  │
│                         │  │                     │  │
│                         │  │ "Mahasiswa semester │  │
│                         │  │ 6, minat Python     │  │
│                         │  │ dan ML, 2 hackathon"│  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  HASIL REKOMENDASI        │
│                         │  ┌─────────────────────┐  │
│                         │  │                     │  │
│                         │  │ ## 1. 🌟 Narasi...  │  │
│                         │  │ [isi lengkap]       │  │
│                         │  │                     │  │
│                         │  │ ## 2. 💼 Posisi...  │  │
│                         │  │ [isi lengkap]       │  │
│                         │  │                     │  │
│                         │  │ [dst...]            │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  METADATA                 │
│                         │  ⏱️ Response time: 23 dtk │
│                         │                           │
│                         │  TOMBOL AKSI              │
│                         │  [← Kembali ke Riwayat]  │
│                         │  [+ Buat Rekomendasi Baru]│
└────────────────────────────────────────────────────┘
```

---

### 4.9 Halaman Profil (`/dashboard/profil`)

**Tujuan:** Menampilkan profil adaptif pengguna yang terakumulasi dari semua sesi. Pengguna bisa melihat bagaimana sistem "mengenali" mereka.

#### Layout

```
┌────────────────────────────────────────────────────┐
│  SIDEBAR                │  MAIN CONTENT             │
│  (navigasi)             │                           │
│                         │  BREADCRUMB               │
│                         │  Dashboard > Profil       │
│                         │                           │
│                         │  HEADER                   │
│                         │  "Profil Kariermu"        │
│                         │                           │
│                         │  KARTU IDENTITAS          │
│                         │  ┌─────────────────────┐  │
│                         │  │ [Avatar Google]     │  │
│                         │  │ Muhammad Mirza K.   │  │
│                         │  │ mirza@gmail.com     │  │
│                         │  │                     │  │
│                         │  │ Bergabung: Jan 2025 │  │
│                         │  │ Total sesi: 3       │  │
│                         │  │ Terakhir aktif:     │  │
│                         │  │ 2 jam lalu          │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  PROFIL ADAPTIF           │
│                         │  ┌─────────────────────┐  │
│                         │  │ 🧠 Apa yang         │  │
│                         │  │ NusaNara tahu       │  │
│                         │  │ tentangmu           │  │
│                         │  │                     │  │
│                         │  │ "Mahasiswa           │  │
│                         │  │ informatika semester│  │
│                         │  │ 6 di UNSIKA dengan  │  │
│                         │  │ keahlian Python dan │  │
│                         │  │ Machine Learning.   │  │
│                         │  │ Aktif di kompetisi  │  │
│                         │  │ hackathon dan        │  │
│                         │  │ tertarik berkarier  │  │
│                         │  │ di bidang data."    │  │
│                         │  │                     │  │
│                         │  │ Diperbarui otomatis │  │
│                         │  │ setiap kamu membuat │  │
│                         │  │ rekomendasi baru.   │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  SKILL TERDETEKSI         │
│                         │  ┌─────────────────────┐  │
│                         │  │ 💡 Skill yang       │  │
│                         │  │ terdeteksi          │  │
│                         │  │                     │  │
│                         │  │ [Python] [ML] [SQL] │  │ ← pill/badge
│                         │  │ [Hackathon]         │  │
│                         │  │ [Data Analysis]     │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  MINAT KARIER             │
│                         │  ┌─────────────────────┐  │
│                         │  │ 🎯 Minat karier     │  │
│                         │  │ yang terdeteksi     │  │
│                         │  │                     │  │
│                         │  │ [Data Science]      │  │
│                         │  │ [Machine Learning]  │  │
│                         │  │ [Backend Dev]       │  │
│                         │  └─────────────────────┘  │
│                         │                           │
│                         │  ZONA BERBAHAYA           │
│                         │  ┌─────────────────────┐  │
│                         │  │ ⚠️ Reset Profil     │  │
│                         │  │                     │  │
│                         │  │ Menghapus semua     │  │
│                         │  │ data profil adaptif │  │
│                         │  │ yang tersimpan.     │  │
│                         │  │ Riwayat tetap ada.  │  │
│                         │  │                     │  │
│                         │  │ [Reset Profil]      │  │ ← tombol merah outline
│                         │  └─────────────────────┘  │
└────────────────────────────────────────────────────┘
```

#### Konfirmasi Reset Profil

```
Saat klik "Reset Profil":

┌──────────────────────────────────┐
│  ⚠️ Konfirmasi Reset Profil      │
│                                  │
│  Profil adaptifmu akan dihapus.  │
│  Riwayat rekomendasi tetap ada.  │
│                                  │
│  Yakin ingin melanjutkan?        │
│                                  │
│  [Batal]   [Ya, Reset Profil]    │
└──────────────────────────────────┘
```

---

### 4.10 Halaman 404 & Error

#### Halaman 404

```
┌────────────────────────────────────┐
│                                    │
│         🧭                         │
│                                    │
│    Halaman tidak ditemukan         │
│    Error 404                       │
│                                    │
│    Sepertinya kamu salah jalan.    │
│    Yuk kembali ke jalur yang benar!│
│                                    │
│    [Kembali ke Dashboard]          │
│                                    │
└────────────────────────────────────┘
```

#### Halaman Error (Ollama down / DB error)

```
┌─────────────────────────────────────────┐
│                                         │
│         ⚠️                              │
│                                         │
│    Ups, ada yang tidak beres            │
│                                         │
│    Sistem sedang mengalami gangguan.    │
│    Tim kami sudah diberitahu.           │
│                                         │
│    Pesan error:                         │
│    "Tidak dapat terhubung ke            │
│     server rekomendasi"                 │
│                                         │
│    [Coba Lagi]  [Kembali ke Dashboard] │
│                                         │
└─────────────────────────────────────────┘
```

---

## 5. Komponen Reusable

### 5.1 Daftar Komponen UI

```
components/
│
├── layout/
│   ├── Sidebar.tsx           ← Navigasi kiri (desktop)
│   ├── MobileNav.tsx         ← Navigasi bawah (mobile)
│   ├── Navbar.tsx            ← Navbar untuk landing page
│   └── PageWrapper.tsx       ← Wrapper dengan padding konsisten
│
├── ui/
│   ├── Button.tsx            ← Tombol dengan variant (primary, outline, danger)
│   ├── Card.tsx              ← Card container dengan shadow
│   ├── Badge.tsx             ← Pill/tag berwarna (skill, posisi karier)
│   ├── Spinner.tsx           ← Loading spinner
│   ├── ProgressBar.tsx       ← Progress bar animasi untuk streaming
│   ├── Modal.tsx             ← Modal konfirmasi (reset profil, dll)
│   └── EmptyState.tsx        ← Tampilan kosong dengan ilustrasi
│
├── domain/
│   ├── ProfileCard.tsx       ← Card ringkasan profil adaptif
│   ├── HistoryCard.tsx       ← Card riwayat rekomendasi di daftar
│   ├── RecommendationView.tsx← Render markdown hasil rekomendasi
│   ├── StreamingText.tsx     ← Teks yang muncul huruf per huruf (SSE)
│   ├── NarrativeInput.tsx    ← Form textarea + counter + panduan
│   └── StatCard.tsx          ← Card statistik kecil (jumlah sesi, dll)
│
└── feedback/
    ├── Toast.tsx             ← Notifikasi singkat (berhasil salin, dll)
    ├── ErrorBanner.tsx       ← Banner error inline
    └── LoadingOverlay.tsx    ← Overlay loading fullscreen
```

### 5.2 Spesifikasi Komponen Kritis

#### `StreamingText.tsx`

```tsx
interface StreamingTextProps {
  apiEndpoint: string;
  payload: { narrative: string };
  onStart?: () => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

// Behavior:
// - Buka SSE connection ke FastAPI
// - Setiap token diterima → append ke state
// - Render markdown dari teks yang terakumulasi
// - Cursor berkedip di akhir saat masih streaming
// - Panggil onComplete saat event "done" diterima
```

#### `NarrativeInput.tsx`

```tsx
interface NarrativeInputProps {
  hasExistingProfile: boolean;  // tampilkan banner profil lama
  onSubmit: (narrative: string) => void;
  isLoading: boolean;
  minLength?: number;  // default: 50
  maxLength?: number;  // default: 2000
}

// Behavior:
// - Textarea dengan auto-resize
// - Counter karakter real-time
// - Tombol disabled jika < minLength
// - Tampilkan banner "profil akan digabung" jika hasExistingProfile
// - Section panduan collapsible
// - Section contoh narasi collapsible
```

#### `RecommendationView.tsx`

```tsx
interface RecommendationViewProps {
  markdown: string;         // teks markdown dari LLM
  isStreaming?: boolean;    // jika true, tampil cursor berkedip
  showActions?: boolean;    // tampilkan tombol salin, dll
}

// Behavior:
// - Render markdown menjadi HTML (pakai react-markdown)
// - Section 1-5 otomatis dapat styling berbeda
// - Tombol "Salin" salin seluruh teks
// - Jika isStreaming=true, sembunyikan tombol aksi
```

---

## 6. State Management & Data Flow

### 6.1 Data yang Dikelola

```
Global State (Context / Zustand):
├── user: { id, name, email, imageUrl }   ← dari Clerk
└── profile: { summary, skills, session_count }  ← dari API

Local State (per halaman):
├── /rekomendasi
│   ├── narrativeText: string
│   └── submitStatus: "idle" | "loading" | "error"
│
├── /rekomendasi/hasil
│   ├── streamedText: string        ← akumulasi token SSE
│   ├── streamStatus: "loading" | "streaming" | "done" | "error"
│   └── responseTimeMs: number
│
├── /riwayat
│   └── historyList: HistoryItem[]
│
└── /profil
    └── profileData: UserProfile
```

### 6.2 API Calls per Halaman

```
Halaman              │ API Call                    │ Method
─────────────────────┼─────────────────────────────┼───────
/dashboard           │ GET /profile                │ GET
                     │ GET /history?limit=3        │ GET
/rekomendasi         │ GET /profile (cek ada/tidak)│ GET
/rekomendasi/hasil   │ POST /recommend (streaming) │ POST + SSE
/riwayat             │ GET /history                │ GET
/riwayat/[id]        │ GET /history/:id            │ GET
/profil              │ GET /profile                │ GET
                     │ DELETE /profile (reset)     │ DELETE
```

---

## 7. Navigasi & Layout

### 7.1 Sidebar (Desktop — lebar ≥ 768px)

```
┌──────────────────┐
│  🧭 NusaNara     │  ← logo + nama
│                  │
│  ┌────────────┐  │
│  │  [Avatar]  │  │
│  │  Muhammad  │  │
│  │  mirza@... │  │
│  └────────────┘  │
│                  │
│  ── Menu ──      │
│                  │
│  🏠 Dashboard    │  ← highlight jika active
│  🎯 Rekomendasi  │
│  📋 Riwayat      │
│  👤 Profil       │
│                  │
│  ── ── ── ──     │
│                  │
│  [Keluar]        │
│                  │
│  ── ── ── ──     │
│  v1.0 · UNSIKA   │
└──────────────────┘
```

### 7.2 Bottom Navigation (Mobile — lebar < 768px)

```
┌──────────────────────────────────────┐
│ (konten halaman)                     │
│                                      │
│                                      │
├──────────────────────────────────────┤
│  🏠        🎯        📋        👤   │
│  Home   Rekomen   Riwayat   Profil  │
└──────────────────────────────────────┘
```

### 7.3 Navbar Landing Page

```
┌────────────────────────────────────────────┐
│  🧭 NusaNara          [Masuk] [Daftar]     │
└────────────────────────────────────────────┘

Sticky di atas, background putih dengan shadow ringan.
Di mobile: sembunyikan teks "NusaNara", tampilkan ikon saja.
```

---

## 8. Desain Responsif

### 8.1 Breakpoint

```
Mobile  : < 640px   (sm)
Tablet  : 640-1024px (md)
Desktop : > 1024px  (lg)
```

### 8.2 Perubahan Layout per Breakpoint

| Elemen | Mobile | Tablet | Desktop |
|---|---|---|---|
| Sidebar | Hilang (bottom nav) | Kolaps (ikon saja) | Penuh dengan label |
| Hero section | Stack vertikal | Stack vertikal | Side by side |
| Stats cards | 1 kolom | 3 kolom | 3 kolom |
| Fitur cards | 1 kolom | 2 kolom | 2 kolom |
| Dashboard layout | 1 kolom | 1 kolom | 2 kolom (sidebar+main) |
| Riwayat cards | 1 kolom | 2 kolom | 1 kolom (lebar penuh) |
| History detail | Stack vertikal | Stack vertikal | Side by side |

---

## 9. Diagram Alur Lengkap

### 9.1 Diagram Alur: Sisi Pengguna (Frontend)

```
                    ┌─────────────────┐
                    │  Buka Aplikasi  │
                    └────────┬────────┘
                             │
              ┌──────────────▼──────────────┐
              │   Sudah ada sesi Clerk?      │
              └──────────────┬──────────────┘
                    No │              │ Yes
                       ▼              ▼
              ┌──────────────┐  ┌──────────────┐
              │ Landing Page │  │  Dashboard   │
              └──────┬───────┘  └──────┬───────┘
                     │                 │
             Klik    │        ┌────────▼────────┐
         "Mulai"     │        │ Punya riwayat?  │
                     │        └────────┬────────┘
                     │          No │       │ Yes
                     ▼            ▼       ▼
              ┌──────────┐  [Onboard]  [Profil+
              │ Sign Up  │  Banner    Riwayat
              │ / Sign In│           terbaru]
              └────┬─────┘
                   │ Berhasil
                   ▼
              ┌──────────────────────────────┐
              │         Dashboard            │
              └────────────┬─────────────────┘
                           │
          ┌────────────────┼──────────────────┐
          │                │                  │
          ▼                ▼                  ▼
   [Rekomendasi]      [Riwayat]           [Profil]
          │                │                  │
          ▼                ▼                  ▼
  ┌───────────────┐ ┌─────────────┐  ┌───────────────┐
  │ Input Narasi  │ │ Daftar Card │  │ Profil Adaptif│
  │ (textarea)    │ │ Riwayat     │  │ + Skill       │
  └───────┬───────┘ └──────┬──────┘  │ + Reset       │
          │                │         └───────────────┘
          │ Submit         │ Klik card
          ▼                ▼
  ┌───────────────┐ ┌──────────────────┐
  │  Loading +    │ │ Detail Riwayat   │
  │  Streaming    │ │ (narasi + hasil) │
  └───────┬───────┘ └──────────────────┘
          │
          ▼
  ┌───────────────┐
  │ Hasil Lengkap │
  │ + Tombol Aksi │
  └───────────────┘
```

### 9.2 Diagram Alur: Sisi Sistem (Frontend ↔ Backend)

```
FRONTEND (Vercel)              BACKEND (VPS Jakarta)
──────────────────             ─────────────────────────────────

User klik "Dapatkan
Rekomendasi"
      │
      │ POST /recommend
      │ Header: Authorization: Bearer {JWT}
      │ Body: { narrative: "Saya mahasiswa..." }
      │─────────────────────────────────────────►
      │
      │                         [1] Validasi JWT via Clerk JWKS
      │                         [2] Ambil profil lama dari PostgreSQL
      │                         [3] Gabung profil + narasi → embed
      │                         [4] Hybrid search di pgvector
      │                             (semantic + full-text + RRF)
      │                         [5] Reranking → top 3 dokumen
      │                         [6] Bangun prompt 5-in-1
      │                         [7] Kirim ke Ollama Llama 3.1 8B
      │
      │ ◄── SSE stream dimulai ─────────────────────────────────
      │
      │ data: {"token": "Berdasarkan"}
      │ data: {"token": " cerita"}
      │ data: {"token": " yang"}
      │ ...
      │ (ratusan token)
      │ ...
      │                         [8] Streaming selesai
      │                         [9] Update profil adaptif di PostgreSQL
      │                         [10] Simpan ke recommendation_history
      │
      │ data: {"done": true, "time_ms": 23400}
      │ ◄────────────────────────────────────────────────────────
      │
UI tampilkan tombol aksi
(Salin, Rekomendasi Baru, Riwayat)
```

### 9.3 Diagram Komponen Halaman Hasil (Streaming Detail)

```
┌─────────────────────────────────────────────────┐
│ RecommendationResultPage                        │
│                                                 │
│  ┌─────────────────┐                            │
│  │ StatusBanner     │ ← "Memproses..." / "Selesai"│
│  └─────────────────┘                            │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ StreamingText                           │    │
│  │                                         │    │
│  │  ┌───────────────────────────────────┐  │    │
│  │  │ RecommendationView                │  │    │
│  │  │ (render markdown terakumulasi)    │  │    │
│  │  │                                   │  │    │
│  │  │  ## 1. 🌟 Narasi Jalur Karier    │  │    │
│  │  │  Berdasarkan ceritamu...▌         │  │    │
│  │  │                                   │  │    │
│  │  └───────────────────────────────────┘  │    │
│  │                                         │    │
│  │  useEffect: buka SSE connection         │    │
│  │  useState: streamedText accumulator     │    │
│  │  useState: status (streaming/done/error)│    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │ ActionButtons (hidden saat streaming)   │    │
│  │ [📋 Salin] [+ Baru] [📂 Riwayat]      │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## Ringkasan Halaman

| Halaman | URL | Auth | Fungsi Utama | API |
|---|---|---|---|---|
| Landing Page | `/` | ❌ Tidak perlu | Marketing, konversi ke daftar | — |
| Sign In | `/sign-in` | ❌ Tidak perlu | Login Clerk | Clerk |
| Sign Up | `/sign-up` | ❌ Tidak perlu | Registrasi Clerk | Clerk |
| Dashboard | `/dashboard` | ✅ Wajib | Ringkasan, profil, CTA, riwayat singkat | GET /profile, GET /history |
| Input Narasi | `/dashboard/rekomendasi` | ✅ Wajib | Form input narasi bebas | GET /profile |
| Hasil Streaming | `/dashboard/rekomendasi/hasil` | ✅ Wajib | Tampil hasil LLM streaming (SSE) | POST /recommend |
| Riwayat | `/dashboard/riwayat` | ✅ Wajib | Daftar semua rekomendasi | GET /history |
| Detail Riwayat | `/dashboard/riwayat/[id]` | ✅ Wajib | Satu rekomendasi lengkap | GET /history/:id |
| Profil | `/dashboard/profil` | ✅ Wajib | Profil adaptif, skill, reset | GET/DELETE /profile |

---

*Desain Web App NusaNara v1.0 — Muhammad Mirza Kurniawan — UNSIKA 2025*