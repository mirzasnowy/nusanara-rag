# Task 07 — Frontend Development (Next.js 14)

## 1. Tujuan & Use Case

Membangun antarmuka web yang memungkinkan **mahasiswa dan fresh graduate** mengonsultasikan profil dan tujuan karier mereka kepada sistem RAG NusaNara, lalu menerima rekomendasi lowongan secara real-time.

**Framework:** Next.js 14 (App Router)  
**Bahasa:** TypeScript  
**Styling:** Tailwind CSS  
**Auth:** Clerk (`@clerk/nextjs@latest`)  
**Status:** 🔲 Belum diinisialisasi — tahap berikutnya setelah Task 06

---

## 2. Use Case Utama (Untuk Skripsi)

Sistem NusaNara digunakan oleh **mahasiswa semester akhir / fresh graduate** yang ingin mencari arah karier. Satu sesi penggunaan mengikuti alur berikut:

```
[Pengguna buka nusanara.id]
         │
         ▼
[Landing page — penjelasan sistem]
         │
         ▼
[Daftar / Login via Clerk (Google OAuth)]
         │
         ▼
[Input Narasi Karier]
  → "Saya lulusan S1 SI, mahir SQL dan Excel,
     ingin berkarier sebagai data analyst"
         │
         ▼
[Sistem RAG memproses (streaming real-time)]
  → 🔍 Mencari lowongan relevan...
  → 📊 10 dokumen ditemukan, re-ranking...
  → 🧠 Menyusun rekomendasi...
  → [Teks rekomendasi muncul token demi token]
         │
         ▼
[Hasil: 3 Rekomendasi Lowongan + Analisis]
  → Judul, Perusahaan, Lokasi, Gaji
  → Skor RAG + Skill Match (traceability)
  → Action Plan 7 hari
  → Skill Gap & Rencana Belajar
         │
         ▼
[Riwayat tersimpan — dapat diakses kembali]
```

---

## 3. Struktur Halaman (App Router)

Mengikuti struktur yang didefinisikan di `frontend/README.md`:

```
frontend/
├── app/
│   ├── layout.tsx               ← Root layout + <ClerkProvider>
│   ├── page.tsx                 ← Landing page (/) — penjelasan NusaNara
│   ├── sign-in/[[...sign-in]]/
│   │   └── page.tsx             ← Clerk hosted sign-in
│   ├── sign-up/[[...sign-up]]/
│   │   └── page.tsx             ← Clerk hosted sign-up
│   └── dashboard/
│       ├── page.tsx             ← Dashboard utama — ringkasan profil
│       ├── rekomendasi/
│       │   └── page.tsx         ← Form input narasi + streaming hasil
│       ├── riwayat/
│       │   ├── page.tsx         ← Daftar semua sesi konsultasi
│       │   └── [id]/page.tsx    ← Detail satu sesi
│       └── profil/page.tsx      ← Profil adaptif pengguna
│
├── components/
│   ├── NarrativeInput.tsx       ← Textarea + tombol kirim narasi
│   ├── StreamingText.tsx        ← Render SSE token stream real-time
│   ├── RecommendationCard.tsx   ← Kartu satu rekomendasi lowongan
│   └── HistoryList.tsx          ← Daftar riwayat percakapan
│
├── lib/
│   └── api.ts                   ← Fetch wrapper ke FastAPI dengan JWT
│
├── middleware.ts                 ← clerkMiddleware() — proteksi rute
└── .env.local
```

---

## 4. Arsitektur Frontend

```
┌──────────────────────────────────────────────────────────┐
│                   Next.js 14 App Router                   │
│                                                          │
│  ┌──────────┐  ┌──────────────────┐  ┌───────────────┐  │
│  │ /        │  │  /dashboard/     │  │  /dashboard/  │  │
│  │ Landing  │  │  rekomendasi     │  │  riwayat      │  │
│  │ (public) │  │  (SSE stream)    │  │  (history)    │  │
│  └──────────┘  └────────┬─────────┘  └───────────────┘  │
│                          │                                │
│  ┌─────────────────────────────────────────────────┐    │
│  │  middleware.ts (clerkMiddleware)                 │    │
│  │  Proteksi: /dashboard/** → redirect ke sign-in  │    │
│  └─────────────────────────────────────────────────┘    │
│                          │ fetch + Authorization: Bearer  │
│                          ▼                                │
│                 FastAPI Backend (:8000)                   │
│                 POST /api/recommend → SSE                 │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Implementasi Teknis Kunci

### A. Setup Awal

```bash
cd frontend/
npx create-next-app@latest ./ \
  --typescript --tailwind --eslint --app \
  --no-src-dir --import-alias "@/*"

npm install @clerk/nextjs react-markdown
```

### B. Middleware (Route Protection)

```typescript
// middleware.ts  ← bukan proxy.ts, nama file Next.js standard
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtected = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### C. Root Layout dengan ClerkProvider

```typescript
// app/layout.tsx
import { ClerkProvider, Show, SignInButton, UserButton } from "@clerk/nextjs";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <ClerkProvider>
          <header>
            <Show when="signed-out">
              <SignInButton />
            </Show>
            <Show when="signed-in">
              <UserButton />
            </Show>
          </header>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
```

> ⚠️ Gunakan `<Show when="signed-in/out">` — **bukan** `<SignedIn>/<SignedOut>` (deprecated di Clerk terbaru)

### D. Streaming SSE dari FastAPI

```typescript
// components/StreamingText.tsx — konsumsi SSE
async function getRecommendation(narrative: string, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ narrative }),
  });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const lines = decoder.decode(value).split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const payload = line.slice(6);
      if (payload === '[DONE]') return;
      const { content } = JSON.parse(payload);
      // Update state React untuk animasi mengetik
      setOutput(prev => prev + content);
    }
  }
}
```

### E. Environment Variables

```env
# frontend/.env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 6. Aturan Clerk yang Wajib Diikuti

| ✅ Gunakan | ❌ Jangan Gunakan |
|---|---|
| `clerkMiddleware()` dari `@clerk/nextjs/server` | `authMiddleware()` (deprecated) |
| `<Show when="signed-in">` | `<SignedIn>` (deprecated) |
| `<Show when="signed-out">` | `<SignedOut>` (deprecated) |
| `app/` directory (App Router) | `pages/` directory |
| `import from '@clerk/nextjs'` | Import dari versi lama |
| `async auth()` dari `@clerk/nextjs/server` | `withAuth()` (deprecated) |

---

## 7. Parameter Evaluasi Frontend

| Parameter | Target | Metode Uji |
|---|---|---|
| **Auth flow** | Login → dashboard tanpa error | Uji Google OAuth + email |
| **SSE Streaming** | Teks muncul real-time, tidak putus | Input narasi, amati animasi |
| **CORS** | Tidak ada preflight error | Network tab browser |
| **Rute proteksi** | `/dashboard` tanpa login → redirect sign-in | Akses langsung URL |
| **Riwayat** | Sesi tersimpan dan dapat diakses kembali | Lihat `/dashboard/riwayat` |
| **Responsif** | Layout tidak patah di mobile (375px) | DevTools responsive mode |

---

## 8. Cara Menjalankan

```bash
# Inisialisasi (sekali saja)
cd frontend/
npx create-next-app@latest ./ --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
npm install @clerk/nextjs react-markdown

# Development
npm run dev    # http://localhost:3000

# Backend harus berjalan di :8000
# Clerk keys harus diisi di .env.local
```

> **Catatan:** Clerk publishable key dan secret key didapat dari [dashboard.clerk.com](https://dashboard.clerk.com) setelah membuat aplikasi baru.
