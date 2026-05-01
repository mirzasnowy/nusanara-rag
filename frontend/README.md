# frontend/

Folder ini berisi Next.js 14 frontend untuk NusaNara.  
**Status:** Belum diinisialisasi — akan dikerjakan di Task 07.

## Setup (satu kali)

```bash
cd frontend/
npx create-next-app@latest ./ \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"

npm install @clerk/nextjs react-markdown
```

## Dependencies

- `@clerk/nextjs` — Auth (Google OAuth, Email OTP)
- `react-markdown` — Render output rekomendasi (Markdown dari LLM)

## Struktur folder yang direncanakan

```
frontend/
├── app/
│   ├── layout.tsx               ← Root layout + <ClerkProvider>
│   ├── page.tsx                 ← Landing page (/)
│   ├── sign-in/[[...sign-in]]/
│   │   └── page.tsx             ← Clerk hosted sign-in
│   ├── sign-up/[[...sign-up]]/
│   │   └── page.tsx             ← Clerk hosted sign-up
│   └── dashboard/
│       ├── page.tsx             ← Dashboard utama
│       ├── rekomendasi/
│       │   └── page.tsx         ← Input narasi + streaming hasil
│       ├── riwayat/
│       │   ├── page.tsx         ← Daftar riwayat sesi
│       │   └── [id]/page.tsx    ← Detail satu sesi
│       └── profil/page.tsx      ← Profil adaptif pengguna
│
├── components/
│   ├── NarrativeInput.tsx       ← Textarea input narasi
│   ├── StreamingText.tsx        ← SSE real-time text renderer
│   ├── RecommendationCard.tsx   ← Kartu satu rekomendasi lowongan
│   └── HistoryList.tsx          ← List riwayat percakapan
│
├── lib/
│   └── api.ts                   ← Fetch wrapper + JWT header
│
├── middleware.ts                 ← clerkMiddleware() (bukan proxy.ts)
└── .env.local
```

## Env yang diperlukan (frontend/.env.local)

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Catatan Clerk

Gunakan API terbaru `@clerk/nextjs`:
- `clerkMiddleware()` dari `@clerk/nextjs/server` (**bukan** `authMiddleware`)
- `<Show when="signed-in">` (**bukan** `<SignedIn>` yang deprecated)
- `<Show when="signed-out">` (**bukan** `<SignedOut>` yang deprecated)

Lihat detail implementasi di `docs/pipeline_steps/07_frontend_development.md`
