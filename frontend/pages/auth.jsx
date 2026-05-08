import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useSignIn, useSignUp, useAuth, SignInButton, SignUpButton } from '@clerk/nextjs'

const VIDEO_SRC = 'https://res.cloudinary.com/dzyfjpnjg/video/upload/f_auto,q_auto/v1777679367/0219e81c-80bb-4395-a88a-030f78c129cc.mp4_rzl0ls.mp4'

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>

  </svg>
)

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { isSignedIn } = useAuth()
  const { isLoaded: signInLoaded, signIn, setActive: setActiveSignIn } = useSignIn()
  const { isLoaded: signUpLoaded, signUp, setActive: setActiveSignUp } = useSignUp()


  // Kalau sudah login, langsung ke dashboard
  useEffect(() => {
    if (isSignedIn) router.replace('/dashboard')
  }, [isSignedIn])

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/lucide@latest'
    script.onload = () => window.lucide?.createIcons()
    document.body.appendChild(script)
  }, [])

  const isRegister = mode === 'register'

  // ── Login dengan email+password ──
  async function handleLogin() {
    setError(''); setLoading(true)
    try {
      const result = await signIn.create({ identifier: email, password })
      if (result.status === 'complete') {
        await setActiveSignIn({ session: result.createdSessionId })
        router.replace('/dashboard')
      }
    } catch (e) {
      setError(e.errors?.[0]?.message || 'Login gagal. Periksa email dan kata sandi.')
    } finally { setLoading(false) }
  }

  // ── Register dengan email+password ──
  async function handleRegister() {
    setError(''); setLoading(true)
    try {
      const result = await signUp.create({
        emailAddress: email,
        password,
        firstName: name.split(' ')[0] || name,
        lastName: name.split(' ').slice(1).join(' ') || '',
      })
      if (result.status === 'complete') {
        await setActiveSignUp({ session: result.createdSessionId })
        router.replace('/dashboard')
      } else {
        // Verifikasi email mungkin diperlukan
        setError('Cek email Anda untuk verifikasi.')
      }
    } catch (e) {
      setError(e.errors?.[0]?.message || 'Registrasi gagal.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <Head>
        <title>{isRegister ? 'Buat Akun — NusaNara' : 'Masuk — NusaNara'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          :root {
            --accent:  hsl(35,100%,60%);
            --bg:      #07162C;
            --surface: rgba(255,255,255,0.03);
            --border:  rgba(255,255,255,0.07);
            --text:    rgba(255,255,255,0.92);
            --muted:   rgba(255,255,255,0.45);
            --serif: 'Instrument Serif', serif;
            --sans:  'Inter', sans-serif;
          }
          * { box-sizing: border-box; }

          .auth-input {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.07);
            color: #fff;
            width: 100%; padding: 14px 16px 14px 44px;
            border-radius: 14px; font-size: 13px;
            font-family: var(--sans);
            transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
            outline: none;
          }
          .auth-input::placeholder { color: rgba(255,255,255,0.22); }
          .auth-input:focus {
            background: rgba(255,255,255,0.07);
            border-color: rgba(255,255,255,0.18);
            box-shadow: 0 0 0 4px rgba(255,255,255,0.04);
          }
          .auth-input.no-icon { padding-left: 16px; }

          .auth-btn-primary {
            width: 100%; padding: 14px;
            background: #fff; color: #07162C;
            border: none; border-radius: 14px;
            font-size: 14px; font-weight: 600;
            font-family: var(--sans); cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 8px;
            transition: all 0.35s cubic-bezier(0.16,1,0.3,1);
          }
          .auth-btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(255,255,255,0.15);
          }

          .auth-btn-outline {
            width: 100%; padding: 13px;
            background: transparent;
            border: 1px solid rgba(255,255,255,0.1);
            color: #fff; border-radius: 14px;
            font-size: 13px; font-weight: 500;
            font-family: var(--sans); cursor: pointer;
            display: flex; align-items: center; justify-content: center; gap: 10px;
            transition: all 0.25s ease;
          }
          .auth-btn-outline:hover {
            background: rgba(255,255,255,0.06);
            border-color: rgba(255,255,255,0.2);
          }

          .noise {
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
          }

          .mode-tab {
            flex: 1; padding: 9px;
            border-radius: 10px; border: none;
            font-size: 13px; font-weight: 500;
            font-family: var(--sans); cursor: pointer;
            transition: all 0.25s ease;
          }
          .mode-tab.active { background: rgba(255,255,255,0.1); color: #fff; }
          .mode-tab.inactive { background: transparent; color: rgba(255,255,255,0.35); }
          .mode-tab.inactive:hover { color: rgba(255,255,255,0.65); }

          @keyframes slideIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
          .form-panel { animation: slideIn 0.3s ease both; }

          .strength-bar { height: 3px; border-radius: 3px; transition: width .4s ease, background .4s ease; }
        `}</style>
      </Head>

      <div style={{ background:'#050505', color:'#fff', minHeight:'100vh', display:'flex', overflow:'hidden', fontFamily:'var(--sans)' }}>

        {/* ── LEFT PANEL ── */}
        <div className="hidden lg:flex" style={{ width:'50%', position:'relative', overflow:'hidden', background:'#000' }}>
          <video autoPlay loop muted playsInline style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }}>
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
          <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, #050505 0%, transparent 50%)' }} />
          <div className="noise" style={{ position:'absolute', inset:0, opacity:.03, mixBlendMode:'overlay', pointerEvents:'none' }} />
          <div style={{ position:'relative', zIndex:10, width:'100%', height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end', padding:'52px 56px' }}>
            <h1 style={{ fontFamily:'var(--serif)', fontSize:'clamp(2.5rem,5vw,4.5rem)', lineHeight:.95, letterSpacing:'-1.5px', fontWeight:400, marginBottom:16 }}>
              Temukan potensi{' '}
              <em style={{ fontStyle:'normal', color:'hsl(240,4%,66%)' }}>Kariermu.</em>
            </h1>
            <p style={{ color:'rgba(255,255,255,0.55)', fontSize:15, fontWeight:300, maxWidth:400, lineHeight:1.7 }}>
              Lebih dari sekadar portal lowongan. Kami memahami narasi Anda dan memetakan lintasan karier masa depan.
            </p>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ width:'100%', flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 24px', position:'relative', background:'#07162C' }}>
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at top right, rgba(255,153,51,0.09), transparent 60%)', pointerEvents:'none' }} />
          <div className="noise" style={{ position:'absolute', inset:0, opacity:.035, mixBlendMode:'overlay', pointerEvents:'none' }} />

          <div style={{ width:'100%', maxWidth:380, position:'relative', zIndex:10 }}>

            {/* Back */}
            <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:8, color:'rgba(255,255,255,0.35)', fontSize:10, textTransform:'uppercase', letterSpacing:'0.2em', fontWeight:500, textDecoration:'none', marginBottom:40, transition:'color .2s' }}
              onMouseOver={e=>e.currentTarget.style.color='#fff'} onMouseOut={e=>e.currentTarget.style.color='rgba(255,255,255,0.35)'}>
              <i data-lucide="arrow-left" style={{ width:13, height:13 }}></i>
              Kembali
            </Link>

            {/* Mode Toggle */}
            <div style={{ display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:14, padding:4, marginBottom:36, gap:4 }}>
              <button className={`mode-tab ${!isRegister ? 'active' : 'inactive'}`} onClick={() => setMode('login')}>Masuk</button>
              <button className={`mode-tab ${isRegister ? 'active' : 'inactive'}`} onClick={() => setMode('register')}>Buat Akun</button>
            </div>

            {/* ── LOGIN FORM ── */}
            {!isRegister && (
              <div key="login" className="form-panel">
                <div style={{ marginBottom:36 }}>
                  <h2 style={{ fontFamily:'var(--serif)', fontSize:'clamp(2.2rem,4vw,3rem)', lineHeight:.95, letterSpacing:'-1.2px', fontWeight:400, marginBottom:10 }}>
                    Selamat Datang
                  </h2>
                  <p style={{ color:'var(--muted)', fontSize:13, fontWeight:300 }}>Masukkan detail akun Anda untuk melanjutkan.</p>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, fontWeight:500, letterSpacing:'0.06em', color:'rgba(255,255,255,0.6)', marginBottom:8, textTransform:'uppercase' }}>Email Akademik</label>
                    <div style={{ position:'relative' }}>
                      <i data-lucide="mail" style={{ position:'absolute', left:15, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'rgba(255,255,255,0.35)', pointerEvents:'none' }}></i>
                      <input type="email" placeholder="nama@kampus.ac.id" className="auth-input"
                        value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                      <label style={{ fontSize:10, fontWeight:500, letterSpacing:'0.06em', color:'rgba(255,255,255,0.6)', textTransform:'uppercase' }}>Kata Sandi</label>
                      <a href="#" style={{ fontSize:10, color:'rgba(255,255,255,0.4)', textDecoration:'none', transition:'color .2s' }}>Lupa sandi?</a>
                    </div>
                    <div style={{ position:'relative' }}>
                      <i data-lucide="lock" style={{ position:'absolute', left:15, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'rgba(255,255,255,0.35)', pointerEvents:'none' }}></i>
                  <input type="password" placeholder="••••••••" className="auth-input"
                    value={password} onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && handleLogin()} />
                    </div>
                  </div>
                  <button className="auth-btn-primary" style={{ marginTop:8 }} onClick={handleLogin} disabled={loading}>
                    {loading ? 'Memproses…' : 'Masuk ke Akun'}
                    {!loading && <i data-lucide="arrow-right" style={{ width:16, height:16 }}></i>}
                  </button>
                  {error && <div style={{ fontSize:12, color:'#ff6b6b', textAlign:'center', marginTop:4 }}>{error}</div>}
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:16, margin:'28px 0' }}>
                  <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Atau</span>
                  <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)' }} />
                </div>

                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="auth-btn-outline">
                    <GoogleIcon />
                    Lanjutkan dengan Clerk
                  </button>
                </SignInButton>

                <p style={{ textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:32 }}>
                  Belum punya akun?{' '}
                  <button onClick={() => setMode('register')} style={{ color:'#fff', background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'var(--sans)', textDecoration:'underline', textUnderlineOffset:3 }}>
                    Buat akun baru
                  </button>
                </p>
              </div>
            )}

            {/* ── REGISTER FORM ── */}
            {isRegister && (
              <div key="register" className="form-panel">
                <div style={{ marginBottom:36 }}>
                  <h2 style={{ fontFamily:'var(--serif)', fontSize:'clamp(2rem,4vw,2.8rem)', lineHeight:.95, letterSpacing:'-1.2px', fontWeight:400, marginBottom:10 }}>
                    Mulai Perjalanan
                  </h2>
                  <p style={{ color:'var(--muted)', fontSize:13, fontWeight:300 }}>Buat akun gratis dan temukan jalur kariermu.</p>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div>
                    <label style={{ display:'block', fontSize:10, fontWeight:500, letterSpacing:'0.06em', color:'rgba(255,255,255,0.6)', marginBottom:8, textTransform:'uppercase' }}>Nama Lengkap</label>
                    <div style={{ position:'relative' }}>
                      <i data-lucide="user" style={{ position:'absolute', left:15, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'rgba(255,255,255,0.35)', pointerEvents:'none' }}></i>
                      <input type="text" placeholder="Nama Lengkap Anda" className="auth-input" />
                    </div>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, fontWeight:500, letterSpacing:'0.06em', color:'rgba(255,255,255,0.6)', marginBottom:8, textTransform:'uppercase' }}>Email Akademik</label>
                    <div style={{ position:'relative' }}>
                      <i data-lucide="mail" style={{ position:'absolute', left:15, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'rgba(255,255,255,0.35)', pointerEvents:'none' }}></i>
                      <input type="email" placeholder="nama@kampus.ac.id" className="auth-input" />
                    </div>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, fontWeight:500, letterSpacing:'0.06em', color:'rgba(255,255,255,0.6)', marginBottom:8, textTransform:'uppercase' }}>Kata Sandi</label>
                    <div style={{ position:'relative' }}>
                      <i data-lucide="lock" style={{ position:'absolute', left:15, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'rgba(255,255,255,0.35)', pointerEvents:'none' }}></i>
                      <input type="password" placeholder="Min. 8 karakter" className="auth-input" />
                    </div>
                    <div style={{ display:'flex', gap:4, marginTop:8 }}>
                      {[0,1,2,3].map(i => (
                        <div key={i} className="strength-bar" style={{ flex:1, background:'rgba(255,255,255,0.08)' }} />
                      ))}
                    </div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:6 }}>Kekuatan sandi</div>
                  </div>
                  <div>
                    <label style={{ display:'block', fontSize:10, fontWeight:500, letterSpacing:'0.06em', color:'rgba(255,255,255,0.6)', marginBottom:8, textTransform:'uppercase' }}>Konfirmasi Sandi</label>
                    <div style={{ position:'relative' }}>
                      <i data-lucide="shield-check" style={{ position:'absolute', left:15, top:'50%', transform:'translateY(-50%)', width:16, height:16, color:'rgba(255,255,255,0.35)', pointerEvents:'none' }}></i>
                      <input type="password" placeholder="Ulangi kata sandi" className="auth-input" />
                    </div>
                  </div>

                  {/* Terms */}
                  <label style={{ display:'flex', alignItems:'flex-start', gap:10, cursor:'pointer' }}>
                    <input type="checkbox" style={{ marginTop:3, accentColor:'var(--accent)', width:14, height:14, flexShrink:0 }} />
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.6 }}>
                      Saya menyetujui{' '}
                      <a href="#" style={{ color:'rgba(255,255,255,0.7)', textDecoration:'underline' }}>Syarat & Ketentuan</a>
                      {' '}dan{' '}
                      <a href="#" style={{ color:'rgba(255,255,255,0.7)', textDecoration:'underline' }}>Kebijakan Privasi</a>
                    </span>
                  </label>

                  <button className="auth-btn-primary" style={{ marginTop:4 }} onClick={handleRegister} disabled={loading}>
                    {loading ? 'Memproses…' : 'Buat Akun Sekarang'}
                    {!loading && <i data-lucide="arrow-right" style={{ width:16, height:16 }}></i>}
                  </button>
                  {error && <div style={{ fontSize:12, color:'#ff6b6b', textAlign:'center', marginTop:4 }}>{error}</div>}
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:16, margin:'24px 0' }}>
                  <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)' }} />
                  <span style={{ fontSize:10, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Atau</span>
                  <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.08)' }} />
                </div>

                <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                  <button className="auth-btn-outline">
                    <GoogleIcon />
                    Lanjutkan dengan Clerk
                  </button>
                </SignUpButton>

                <p style={{ textAlign:'center', fontSize:12, color:'rgba(255,255,255,0.4)', marginTop:28 }}>
                  Sudah punya akun?{' '}
                  <button onClick={() => setMode('login')} style={{ color:'#fff', background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, fontFamily:'var(--sans)', textDecoration:'underline', textUnderlineOffset:3 }}>
                    Masuk
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
