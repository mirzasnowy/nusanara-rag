import Head from 'next/head'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useUser, useClerk, useAuth } from '@clerk/nextjs'
import AppShell from '../components/AppShell'
import { getCachedToken } from '../lib/tokenCache'

const AVATAR_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuASWbYZQ3YBCgqY2_JHCdONborxOnZWXQ8Vx-Ygx5FzCVYPMgitwmaiZ-Yeqp6XkQHAupwrQTgcxv8xzVRPyJ7E0D7Q4m0cdzg8n0NZSfRQ2fNicfT3BdBMiwmOep91_gdBh4CmY4Q4gmK2zRuKxYiaXpnEtYC-ax8beOSBvhiiVsPNovO-EffecRz-BdikecfIfG74v6ShRf4Kdr2ntP5L32-FsLZrc-xbwVaxik3kCZcs5-w2tYvW8wr3k4Y7Fkz1hlTYWrb-UwcY'

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const [date, setDate] = useState('')
  const [tokenDebug, setTokenDebug] = useState(null)

  useEffect(() => {
    setDate(new Date().toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' }))
  }, [])

  // Debug: decode token dan tampilkan exp-iat
  async function checkToken() {
    try {
      const token = await getCachedToken(getToken)
      if (!token) { setTokenDebug({ error: 'Token null' }); return }

      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
      const diff = payload.exp - payload.iat
      setTokenDebug({
        iat: new Date(payload.iat * 1000).toLocaleTimeString('id-ID'),
        exp: new Date(payload.exp * 1000).toLocaleTimeString('id-ID'),
        diff_detik: diff,
        template_ok: diff > 1000,   // template kepakai kalau > 1000 detik
        raw: token,
      })
    } catch (e) {
      setTokenDebug({ error: e.message })
    }
  }

  const displayName = user?.firstName || user?.fullName || 'Pengguna'


  return (
    <>
      <Head>
        <title>Dashboard — NusaNara</title>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          /* ── Dashboard-specific styles ── */
          .db-hero {
            border-radius: 20px; overflow: hidden; position: relative;
            background: linear-gradient(135deg, rgba(7,30,56,0.9) 0%, rgba(4,17,30,0.95) 100%);
            border: 1px solid rgba(255,255,255,0.07);
            padding: 52px 56px;
            backdrop-filter: blur(12px);
          }
          .db-hero-grid {
            position: absolute; inset: 0; pointer-events: none;
            background-image:
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px);
            background-size: 48px 48px;
          }
          .db-hero-glow {
            position: absolute; top: -80px; right: -60px;
            width: 400px; height: 400px; pointer-events: none;
            background: radial-gradient(circle, rgba(255,153,51,0.13) 0%, transparent 65%);
          }
          .db-hero-glow2 {
            position: absolute; bottom: -60px; left: 20%;
            width: 280px; height: 280px; pointer-events: none;
            background: radial-gradient(circle, rgba(100,160,255,0.07) 0%, transparent 65%);
          }
          .db-pill {
            display: inline-flex; align-items: center; gap: 7px;
            padding: 5px 14px; border-radius: 20px;
            background: rgba(255,153,51,0.1); border: 1px solid rgba(255,153,51,0.2);
            font-size: 10px; color: hsl(35,100%,60%); text-transform: uppercase; letter-spacing: 0.12em;
            margin-bottom: 22px;
          }
          .db-pill-dot { width: 5px; height: 5px; border-radius: 50%; background: hsl(35,100%,60%); animation: pldot 2s ease infinite; }
          @keyframes pldot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }

          .db-hero-h {
            font-family: 'Instrument Serif', serif; font-weight: 400;
            font-size: clamp(2.2rem, 4vw, 3rem); line-height: 1.05;
            letter-spacing: -1.2px; color: rgba(255,255,255,0.92); margin-bottom: 16px;
          }
          .db-hero-h em { font-style: italic; color: hsl(35,100%,60%); }
          .db-hero-p { font-size: 14px; line-height: 1.8; color: rgba(255,255,255,0.45); max-width: 500px; margin-bottom: 36px; }

          .db-stats { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
          @media(max-width:780px){ .db-stats{grid-template-columns:1fr;} }

          .db-stat {
            background: rgba(7,24,48,0.6);
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 18px; padding: 28px;
            backdrop-filter: blur(12px);
            position: relative; overflow: hidden;
            transition: border-color 0.3s, transform 0.3s;
          }
          .db-stat:hover { border-color: rgba(255,153,51,0.2); transform: translateY(-3px); }
          .db-stat-icon {
            width: 38px; height: 38px; border-radius: 10px;
            background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07);
            display: flex; align-items: center; justify-content: center;
            font-size: 17px; color: rgba(255,255,255,0.35); margin-bottom: 18px;
          }
          .db-stat-val {
            font-family: 'Instrument Serif', serif; font-size: 48px; font-weight: 400;
            color: rgba(255,255,255,0.9); line-height: 1; letter-spacing: -2.5px; margin-bottom: 6px;
          }
          .db-stat-lbl { font-size: 11px; color: rgba(255,255,255,0.35); text-transform: uppercase; letter-spacing: 0.1em; }
          .db-stat-sub { font-size: 10px; color: rgba(255,255,255,0.18); margin-top: 3px; }
          .db-stat-badge {
            position: absolute; top: 24px; right: 24px;
            font-size: 10px; color: hsl(35,100%,60%);
            background: rgba(255,153,51,0.1); padding: 3px 9px; border-radius: 20px;
            border: 1px solid rgba(255,153,51,0.15);
          }

          .db-bottom { display: grid; grid-template-columns: 1.8fr 1fr; gap: 16px; }
          @media(max-width:880px){ .db-bottom{grid-template-columns:1fr;} }

          .db-empty {
            display: flex; flex-direction: column; align-items: center;
            justify-content: center; min-height: 160px; gap: 14px; text-align: center;
          }
          .db-empty-ico {
            width: 50px; height: 50px; border-radius: 13px;
            background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
            display: flex; align-items: center; justify-content: center;
            font-size: 22px; color: rgba(255,255,255,0.18);
          }
          .db-empty-txt { font-size: 12px; line-height: 1.65; color: rgba(255,255,255,0.3); max-width: 220px; }

          .db-qlink {
            display: flex; align-items: center; gap: 12px;
            padding: 11px 13px; border-radius: 11px;
            border: 1px solid rgba(255,255,255,0.06);
            margin-bottom: 8px; cursor: pointer; text-decoration: none;
            transition: all 0.2s;
          }
          .db-qlink:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,153,51,0.2); }
          .db-qlink-ic {
            width: 32px; height: 32px; border-radius: 8px;
            background: rgba(255,153,51,0.09);
            display: flex; align-items: center; justify-content: center;
            font-size: 15px; color: hsl(35,100%,60%); flex-shrink: 0;
          }
          .db-qlink-lbl { font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 500; }
          .db-qlink-sub { font-size: 10px; color: rgba(255,255,255,0.3); }
          .db-qlink-arr { margin-left: auto; font-size: 16px; color: rgba(255,255,255,0.18); transition: all 0.2s; }
          .db-qlink:hover .db-qlink-arr { transform: translateX(3px); color: hsl(35,100%,60%); }

          .db-kb {
            margin-top: 16px; padding: 18px 16px;
            background: rgba(255,153,51,0.06);
            border: 1px solid rgba(255,153,51,0.12);
            border-radius: 13px;
          }
        `}</style>
      </Head>

      <AppShell active="/dashboard" topbarTitle={`Dashboard — ${date}`}>

        {/* ── HERO ── */}
        <section className="db-hero nn-a0">
          <div className="db-hero-grid" />
          <div className="db-hero-glow" />
          <div className="db-hero-glow2" />
          <div style={{ position:'relative', zIndex:1 }}>
            <div className="db-pill">
              <div className="db-pill-dot" />
              Sistem Aktif
            </div>
            <h1 className="db-hero-h">
              Halo, {displayName}. 👋<br />
              Temukan karier <em>yang tepat</em> untukmu.
            </h1>
            <p className="db-hero-p">
              NusaNara mencocokkan narasimu dengan 720 lowongan nyata dari Glints Indonesia menggunakan RAG pipeline dan LLM lokal. Akurat, privat, real-time.
            </p>
            <button className="nn-btn" onClick={() => router.push('/rekomendasi')}>
              Mulai Rekomendasi
              <span className="material-symbols-outlined mi">arrow_forward</span>
            </button>
          </div>
        </section>

        {/* ── STATS ── */}
        <div className="db-stats nn-a1">
          {[
            { lbl:'Sesi Analisis',   val:'0', sub:'total sesi',  icon:'analytics', badge:null },
            { lbl:'Kecocokan Aktif', val:'0', sub:'lowongan',    icon:'hub',       badge:null },
            { lbl:'Kategori Karier', val:'8', sub:'tersedia',    icon:'category',  badge:'+720 data' },
          ].map((s, i) => (
            <div key={i} className="db-stat">
              {s.badge && <div className="db-stat-badge">{s.badge}</div>}
              <div className="db-stat-icon">
                <span className="material-symbols-outlined">{s.icon}</span>
              </div>
              <div className="db-stat-val">{s.val}</div>
              <div className="db-stat-lbl">{s.lbl}</div>
              <div className="db-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── BOTTOM ── */}
        <div className="db-bottom">
          <div className="nn-panel nn-a2">
            <div className="nn-panel-hd">
              <span className="material-symbols-outlined" style={{ fontSize:14 }}>history</span>
              Riwayat Analisis
            </div>
            <div className="db-empty">
              <div className="db-empty-ico">
                <span className="material-symbols-outlined">inbox</span>
              </div>
              <p className="db-empty-txt">Belum ada riwayat analisis. Mulai rekomendasi pertamamu untuk melihat hasilnya di sini.</p>
              <button className="nn-btn" style={{ fontSize:12, padding:'10px 20px' }} onClick={() => router.push('/rekomendasi')}>
                Mulai Sekarang
                <span className="material-symbols-outlined mi" style={{ fontSize:14 }}>arrow_forward</span>
              </button>
            </div>
          </div>

          <div className="nn-panel nn-a3">
            <div className="nn-panel-hd">
              <span className="material-symbols-outlined" style={{ fontSize:14 }}>bolt</span>
              Akses Cepat
            </div>
            {[
              { href:'/rekomendasi', icon:'auto_awesome',  lbl:'Rekomendasi Baru',    sub:'Tulis narasi kariermu' },
              { href:'/profil',      icon:'person_outline', lbl:'Edit Profil',         sub:'Perbarui informasimu' },
              { href:'/riwayat',     icon:'history',        lbl:'Lihat Riwayat',       sub:'Analisis sebelumnya' },
            ].map((q, i) => (
              <a key={i} href={q.href} className="db-qlink">
                <div className="db-qlink-ic">
                  <span className="material-symbols-outlined" style={{ fontSize:15 }}>{q.icon}</span>
                </div>
                <div>
                  <div className="db-qlink-lbl">{q.lbl}</div>
                  <div className="db-qlink-sub">{q.sub}</div>
                </div>
                <span className="material-symbols-outlined db-qlink-arr">chevron_right</span>
              </a>
            ))}
            <div className="db-kb">
              <div style={{ fontSize:10, color:'hsl(35,100%,60%)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:8 }}>Knowledge Base</div>
              <div style={{ fontFamily:'Instrument Serif, serif', fontSize:30, color:'rgba(255,255,255,0.9)', letterSpacing:-1, lineHeight:1 }}>720</div>
              <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:4 }}>lowongan dari Glints Indonesia</div>
            </div>
          </div>
        </div>
        {/* ── DEBUG JWT PANEL (hapus setelah verifikasi) ── */}
        <div style={{ marginTop:24, padding:'20px 24px', background:'rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:14, fontFamily:'monospace' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.1em' }}>🔐 JWT Debug</span>
            <button onClick={checkToken} style={{ fontSize:11, padding:'4px 12px', borderRadius:8, background:'rgba(255,153,51,0.15)', border:'1px solid rgba(255,153,51,0.3)', color:'hsl(35,100%,60%)', cursor:'pointer' }}>
              Decode Token
            </button>
          </div>

          {tokenDebug && !tokenDebug.error && (
            <div style={{ fontSize:12, color:'rgba(255,255,255,0.6)', lineHeight:2 }}>
              <div>📅 <b>iat</b>: {tokenDebug.iat}</div>
              <div>⏰ <b>exp</b>: {tokenDebug.exp}</div>
              <div style={{ color: tokenDebug.template_ok ? '#4ade80' : '#f87171', fontWeight:600 }}>
                ⚡ <b>exp - iat</b>: {tokenDebug.diff_detik} detik
                {tokenDebug.template_ok ? ' ✅ Template NUSANARA kepakai!' : ' ❌ Masih default Clerk (~60s)'}
              </div>
              <button onClick={() => navigator.clipboard.writeText(tokenDebug.raw)} style={{ marginTop:8, fontSize:11, padding:'4px 12px', borderRadius:8, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.6)', cursor:'pointer' }}>
                📋 Copy token → paste ke jwt.io
              </button>
            </div>
          )}
          {tokenDebug?.error && (
            <div style={{ fontSize:12, color:'#f87171' }}>❌ Error: {tokenDebug.error}</div>
          )}
        </div>

      </AppShell>
    </>
  )
}
