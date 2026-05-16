import { AuthenticateWithRedirectCallback } from '@clerk/react'

// Halaman ini dipanggil Clerk setelah Google OAuth selesai
// Clerk otomatis proses token dan redirect ke afterSignInUrl
export default function SSOCallback() {
  return (
    <div style={{
      background: '#07162C', minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, fontFamily: "'Instrument Serif',serif" }}>
        Memproses login Google…
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  )
}
