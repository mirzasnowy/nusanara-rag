import '../styles/globals.css'
import { ClerkProvider, useAuth, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { getCachedToken, clearTokenCache } from '../lib/tokenCache'

// Route yang butuh login
const PROTECTED = ['/dashboard', '/rekomendasi', '/profil', '/riwayat']

function AuthGuard({ children }) {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const router = useRouter()

  // Redirect ke /auth jika belum login dan akses halaman protected
  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn && PROTECTED.includes(router.pathname)) {
      router.replace('/auth')
    }
  }, [isLoaded, isSignedIn, router.pathname])

  // Inisialisasi profil user ke database — hanya sekali per browser session
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return

    // sessionStorage persist walau komponen unmount/remount — lebih andal dari useRef
    const storageKey = `profile_init_${user.id}`
    if (sessionStorage.getItem(storageKey)) return
    sessionStorage.setItem(storageKey, '1')

    async function initProfile() {
      try {
        const token = await getCachedToken(getToken)  // pakai cache — tidak regenerate tiap saat
        if (!token) return

        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/profile/init`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: user.primaryEmailAddress?.emailAddress || '',
            full_name: user.fullName || user.firstName || '',
          }),
        })
      } catch (e) {
        console.error('[profile/init error]', e)
        // Hapus flag jika gagal agar bisa retry di reload berikutnya
        sessionStorage.removeItem(storageKey)
      }
    }

    initProfile()
  }, [isLoaded, isSignedIn, user?.id])  // ← user?.id bukan user — referensi user berubah tiap render


  // Tampilkan loading saat Clerk belum siap di protected page
  if (!isLoaded && PROTECTED.includes(router.pathname)) {
    return (
      <div style={{ background:'#07162C', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13, fontFamily:'Inter,sans-serif' }}>Memuat…</div>
      </div>
    )
  }

  return children
}

export default function App({ Component, pageProps }) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      signInUrl="/auth"
      signUpUrl="/auth"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
      afterSignOutUrl="/auth"
    >
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </ClerkProvider>
  )
}
