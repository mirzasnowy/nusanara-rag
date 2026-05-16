import '../styles/globals.css'
import { ClerkProvider, useAuth, useUser } from '@clerk/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { initProfile } from '../lib/api'
import { log, error as logError } from '../lib/log'

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
  // PENTING: flag sessionStorage HANYA di-set setelah fetch sukses (200/201).
  // Bug sebelumnya: flag di-set sebelum fetch → kalau HTTP 4xx/5xx tidak retry → user baru tidak punya row di user_profiles
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user?.id) return

    const storageKey = `profile_init_${user.id}`
    if (sessionStorage.getItem(storageKey)) {
      log('[profile/init] sudah ter-init di session ini, skip')
      return
    }

    const email = user.primaryEmailAddress?.emailAddress || ''
    const fullName = user.fullName || user.firstName || ''
    log('[profile/init] memulai init untuk user:', user.id)

    initProfile(getToken, { email, full_name: fullName })
      .then(() => {
        log('[profile/init] ✅ sukses')
        sessionStorage.setItem(storageKey, '1')
      })
      .catch(e => {
        logError('[profile/init] gagal:', e.status, e.message)
        // JANGAN set flag → biarkan retry di navigation / reload berikutnya
      })
  }, [isLoaded, isSignedIn, user?.id, getToken])


  // Tampilkan loading saat Clerk belum siap di protected page
  if (!isLoaded && PROTECTED.includes(router.pathname)) {
    return (
      <div style={{ background:'#07162C', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ color:'rgba(255,255,255,0.4)', fontSize:13, fontFamily:'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif' }}>Memuat…</div>
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
