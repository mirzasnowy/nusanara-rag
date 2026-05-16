import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { useAuth, useUser } from '@clerk/react'
import AppShell from '../components/AppShell'
import { getProfile, getHistory } from '../lib/api'

const STAT_META = [
  { key: 'sessions',  label: 'Sesi Analisis',         icon: 'analytics',   accent: '255,153,51', helperEmpty: 'belum ada sesi',     helperFn: v => `${v} sesi tercatat` },
  { key: 'positions', label: 'Posisi Direkomendasikan', icon: 'hub',         accent: '45,212,191', helperEmpty: 'belum ada posisi',   helperFn: v => `${v} posisi unik` },
  { key: 'skills',    label: 'Skill Teridentifikasi',  icon: 'psychology',  accent: '96,165,250', helperEmpty: 'belum terpetakan',   helperFn: v => `${v} skill aktif` },
  { key: 'interests', label: 'Minat Karier',           icon: 'interests',   accent: '139,126,246', helperEmpty: 'belum dipilih',     helperFn: v => `${v} bidang minat` },
]

function truncate(s, n) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s
}

const actions = [
  { href: '/rekomendasi', icon: 'auto_awesome', label: 'Rekomendasi Baru', sub: 'Tulis narasi karier', accent: '255,153,51' },
  { href: '/riwayat', icon: 'history', label: 'Riwayat Analisis', sub: 'Lihat hasil sebelumnya', accent: '96,165,250' },
  { href: '/profil', icon: 'person_outline', label: 'Profil', sub: 'Lengkapi preferensi', accent: '139,126,246' },
]

function formatRelative(iso) {
  if (!iso) return ''
  const now = Date.now()
  const t = new Date(iso).getTime()
  const diff = Math.max(0, now - t)
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useUser()
  const { getToken, isSignedIn } = useAuth()
  const [date, setDate] = useState('')
  const [profile, setProfile] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setDate(new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
  }, [])

  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false
    setLoading(true)
    Promise.allSettled([
      getProfile(getToken),
      getHistory(getToken, { page: 1, limit: 4 }),
    ])
      .then(([p, h]) => {
        if (cancelled) return
        if (p.status === 'fulfilled') setProfile(p.value)
        if (h.status === 'fulfilled') setHistory(h.value.items || [])
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isSignedIn, getToken])

  const displayName = user?.firstName || user?.fullName || 'Pengguna'

  const stats = useMemo(() => {
    const uniquePositions = new Set()
    history.forEach(item => (item.identified_positions || []).forEach(p => uniquePositions.add(p)))
    const values = {
      sessions: profile?.session_count ?? 0,
      positions: uniquePositions.size,
      skills: profile?.identified_skills?.length ?? 0,
      interests: profile?.career_interests?.length ?? 0,
    }
    return STAT_META.map(meta => {
      const v = values[meta.key]
      return {
        ...meta,
        value: String(v),
        helper: v === 0 ? meta.helperEmpty : meta.helperFn(v),
      }
    })
  }, [profile, history])

  const recent = useMemo(() => history.slice(0, 4), [history])

  return (
    <>
      <Head>
        <title>Dashboard - NusaNara</title>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          .db-page {
            display: grid;
            gap: 18px;
          }

          .db-hero {
            position: relative;
            overflow: hidden;
            min-height: 286px;
            display: grid;
            grid-template-columns: minmax(0, 1.2fr) 320px;
            gap: 28px;
            align-items: end;
            padding: 34px;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 22px;
            background: rgba(7,24,40,0.34);
            backdrop-filter: blur(28px) saturate(128%);
            -webkit-backdrop-filter: blur(28px) saturate(128%);
            box-shadow:
              0 22px 58px rgba(0,0,0,0.18),
              inset 0 1px 0 rgba(255,255,255,0.10),
              inset 0 -1px 0 rgba(0,0,0,0.18);
          }

          .db-hero::before {
            content: '';
            position: absolute;
            inset: 0;
            background-image:
              linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
            background-size: 42px 42px;
            pointer-events: none;
          }

          .db-hero::after {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: linear-gradient(135deg, rgba(255,255,255,0.07), transparent 36%, rgba(255,255,255,0.02) 72%, transparent);
            pointer-events: none;
          }

          .db-hero-main,
          .db-hero-side {
            position: relative;
            z-index: 1;
          }

          .db-pill {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 18px;
            padding: 6px 12px;
            border: 1px solid rgba(255,153,51,0.2);
            border-radius: 999px;
            background: rgba(255,153,51,0.09);
            color: hsl(35,100%,60%);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: .12em;
            text-transform: uppercase;
          }

          .db-pill-dot {
            width: 6px;
            height: 6px;
            border-radius: 999px;
            background: hsl(35,100%,60%);
            box-shadow: 0 0 16px rgba(255,153,51,0.5);
          }

          .db-title {
            max-width: 660px;
            margin: 0;
            color: rgba(255,255,255,0.93);
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: clamp(1.6rem, 3.2vw, 2.6rem);
            font-weight: 400;
            line-height: .98;
            letter-spacing: -1.5px;
          }

          .db-title em {
            color: hsl(240,4%,66%);
            font-style: normal;
          }

          .db-copy {
            max-width: 560px;
            margin: 18px 0 26px;
            color: rgba(255,255,255,0.58);
            font-size: 14px;
            line-height: 1.75;
          }

          .db-hero-side {
            align-self: stretch;
            display: grid;
            gap: 12px;
          }

          .db-side-card {
            --db-accent: 255,153,51;
            position: relative;
            overflow: hidden;
            padding: 18px;
            border: 1px solid rgba(var(--db-accent),0.14);
            border-radius: 16px;
            background:
              radial-gradient(circle at 92% 12%, rgba(var(--db-accent),0.10), transparent 36%),
              rgba(7,24,40,0.28);
            backdrop-filter: blur(20px) saturate(124%);
            -webkit-backdrop-filter: blur(20px) saturate(124%);
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.08),
              inset 0 -1px 0 rgba(0,0,0,0.14);
          }

          .db-side-label {
            margin-bottom: 8px;
            color: rgba(var(--db-accent),0.64);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: .13em;
            text-transform: uppercase;
          }

          .db-side-value {
            color: rgba(255,255,255,0.88);
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: 34px;
            line-height: 1;
            letter-spacing: -1.2px;
          }

          .db-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }

          .db-stat {
            --db-accent: 255,153,51;
            position: relative;
            overflow: hidden;
            min-height: 142px;
            padding: 18px;
            border: 1px solid rgba(var(--db-accent),0.14);
            border-radius: 16px;
            background:
              radial-gradient(circle at 86% 12%, rgba(var(--db-accent),0.10), transparent 34%),
              rgba(7,24,40,0.34);
            backdrop-filter: blur(24px) saturate(126%);
            -webkit-backdrop-filter: blur(24px) saturate(126%);
            box-shadow:
              0 16px 42px rgba(0,0,0,0.15),
              inset 0 1px 0 rgba(255,255,255,0.09),
              inset 0 -1px 0 rgba(0,0,0,0.16);
          }

          .db-stat-icon {
            width: 38px;
            height: 38px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 18px;
            border: 1px solid rgba(var(--db-accent),0.14);
            border-radius: 11px;
            background: rgba(var(--db-accent),0.08);
            color: rgba(var(--db-accent),0.78);
          }

          .db-stat-value {
            color: rgba(255,255,255,0.94);
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: 42px;
            line-height: .9;
            letter-spacing: -2px;
          }

          .db-stat-label {
            margin-top: 10px;
            color: rgba(255,255,255,0.62);
            font-size: 11px;
            font-weight: 600;
            letter-spacing: .1em;
            text-transform: uppercase;
          }

          .db-stat-helper {
            margin-top: 4px;
            color: rgba(255,255,255,0.44);
            font-size: 11px;
          }

          .db-content {
            display: grid;
            grid-template-columns: minmax(0, 1.45fr) minmax(300px, .8fr);
            gap: 16px;
          }

          .db-empty {
            min-height: 210px;
            display: grid;
            place-items: center;
            text-align: center;
          }

          .db-empty-inner {
            max-width: 360px;
            display: grid;
            justify-items: center;
            gap: 14px;
          }

          .db-empty-icon {
            width: 54px;
            height: 54px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255,153,51,0.16);
            border-radius: 16px;
            background: rgba(255,153,51,0.08);
            color: hsl(35,100%,60%);
          }

          .db-empty-title {
            color: rgba(255,255,255,0.86);
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: 24px;
            line-height: 1.1;
          }

          .db-empty-copy {
            color: rgba(255,255,255,0.4);
            font-size: 13px;
            line-height: 1.7;
          }

          .db-action-list {
            display: grid;
            gap: 9px;
          }

          .db-action {
            --db-accent: 255,153,51;
            display: grid;
            grid-template-columns: 40px minmax(0, 1fr) 20px;
            gap: 12px;
            align-items: center;
            padding: 12px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 13px;
            color: inherit;
            text-decoration: none;
            background: rgba(7,24,40,0.24);
            backdrop-filter: blur(18px) saturate(120%);
            -webkit-backdrop-filter: blur(18px) saturate(120%);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
            transition: background .2s ease, border-color .2s ease, transform .2s ease;
          }

          .db-action:hover {
            border-color: rgba(var(--db-accent),0.18);
            background:
              radial-gradient(circle at 8% 50%, rgba(var(--db-accent),0.07), transparent 38%),
              rgba(7,24,40,0.34);
            transform: translateY(-1px);
          }

          .db-action-icon {
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            background: rgba(var(--db-accent),0.09);
            color: rgba(var(--db-accent),0.82);
          }

          .db-action-label {
            display: block;
            color: rgba(255,255,255,0.88);
            font-size: 13px;
            font-weight: 600;
            line-height: 1.35;
          }

          .db-action-sub {
            display: block;
            margin-top: 6px;
            color: rgba(255,255,255,0.48);
            font-size: 11px;
            line-height: 1.45;
          }

          .db-recent {
            display: grid;
            gap: 8px;
          }

          .db-recent-item {
            display: grid;
            grid-template-columns: 36px minmax(0, 1fr) auto;
            gap: 12px;
            align-items: start;
            padding: 12px 13px;
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 12px;
            background: rgba(7,24,40,0.22);
            color: inherit;
            text-decoration: none;
            transition: border-color .2s, background .2s, transform .2s;
          }

          .db-recent-item:hover {
            border-color: rgba(255,153,51,0.22);
            background: rgba(255,153,51,0.04);
            transform: translateY(-1px);
          }

          .db-recent-icon {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 10px;
            background: rgba(255,153,51,0.1);
            color: hsl(35,100%,62%);
            margin-top: 2px;
          }

          .db-recent-preview {
            display: block;
            color: rgba(255,255,255,0.88);
            font-size: 12.5px;
            font-weight: 500;
            line-height: 1.5;
          }

          .db-recent-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 8px;
          }

          .db-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border: 1px solid rgba(96,165,250,0.22);
            border-radius: 999px;
            background: rgba(96,165,250,0.08);
            color: rgba(180,210,255,0.88);
            font-size: 10.5px;
            font-weight: 500;
            white-space: nowrap;
          }

          .db-recent-meta {
            display: block;
            margin-top: 7px;
            color: rgba(255,255,255,0.42);
            font-size: 11px;
          }

          .db-recent-chev {
            color: rgba(255,255,255,0.26);
            font-size: 18px;
            margin-top: 8px;
          }

          .db-skeleton {
            min-height: 60px;
            border-radius: 12px;
            background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.07), rgba(255,255,255,0.04));
            background-size: 200% 100%;
            animation: db-shimmer 1.4s ease-in-out infinite;
          }

          @keyframes db-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }

          @media (max-width: 980px) {
            .db-hero {
              grid-template-columns: 1fr;
              min-height: auto;
              padding: 26px;
            }

            .db-hero-side {
              grid-template-columns: repeat(2, 1fr);
            }

            .db-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .db-content {
              grid-template-columns: 1fr;
            }
          }

          @media (max-width: 640px) {
            .db-page {
              gap: 14px;
            }

            .db-hero {
              padding: 20px;
              border-radius: 18px;
            }

            .db-title {
              font-size: clamp(1.4rem, 7vw, 2rem);
            }

            .db-copy {
              margin-bottom: 18px;
              font-size: 13px;
            }

            .db-hero-side,
            .db-grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 10px;
            }

            .db-side-card,
            .db-stat {
              min-height: auto;
              padding: 14px;
            }

            .db-side-value {
              font-size: 28px;
            }

            .db-stat-icon {
              width: 34px;
              height: 34px;
              margin-bottom: 12px;
            }

            .db-stat-value {
              font-size: 34px;
            }

            .db-empty {
              min-height: 180px;
            }
          }
        `}</style>
      </Head>

      <AppShell active="/dashboard" topbarTitle={date || 'Dashboard'}>
        <div className="db-page">
          <section className="db-hero nn-a0">
            <div className="db-hero-main">
              <h1 className="db-title">
                Halo, {displayName}.<br />
                Temukan jalur <em>kariermu.</em>
              </h1>
              <p className="db-copy">
                Mulai dari narasi singkat, NusaNara membantu memetakan peluang karier, kecocokan lowongan, dan langkah belajar yang lebih terarah.
              </p>
              <button className="nn-btn" type="button" onClick={() => router.push('/rekomendasi')}>
                Mulai Rekomendasi
                <span className="material-symbols-outlined mi">arrow_forward</span>
              </button>
            </div>

            <aside className="db-hero-side">
              <div className="db-side-card" style={{ '--db-accent': '96,165,250' }}>
                <div className="db-side-label">Basis Data</div>
                <div className="db-side-value">720</div>
                <div className="db-stat-helper">lowongan terkurasi</div>
              </div>
              <div className="db-side-card" style={{ '--db-accent': '255,153,51' }}>
                <div className="db-side-label">Kategori</div>
                <div className="db-side-value">8</div>
                <div className="db-stat-helper">jalur karier utama</div>
              </div>
            </aside>
          </section>

          <section className="db-grid nn-a1">
            {stats.map(item => (
              <div className="db-stat" key={item.label} style={{ '--db-accent': item.accent }}>
                <div className="db-stat-icon">
                  <span className="material-symbols-outlined" style={{ fontSize: 19 }}>{item.icon}</span>
                </div>
                <div className="db-stat-value">{item.value}</div>
                <div className="db-stat-label">{item.label}</div>
                <div className="db-stat-helper">{item.helper}</div>
              </div>
            ))}
          </section>

          <section className="db-content">
            <div className="nn-panel nn-a2">
              <div className="nn-panel-hd">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>history</span>
                Aktivitas Terakhir
              </div>
              {loading ? (
                <div className="db-recent">
                  <div className="db-skeleton" />
                  <div className="db-skeleton" />
                  <div className="db-skeleton" />
                </div>
              ) : recent.length === 0 ? (
                <div className="db-empty">
                  <div className="db-empty-inner">
                    <div className="db-empty-icon">
                      <span className="material-symbols-outlined" style={{ fontSize: 25 }}>inbox</span>
                    </div>
                    <div>
                      <div className="db-empty-title">Belum ada analisis</div>
                      <p className="db-empty-copy">
                        Jalankan rekomendasi pertama untuk melihat ringkasan hasil dan riwayat aktivitas di dashboard.
                      </p>
                    </div>
                    <Link href="/rekomendasi" className="nn-btn">
                      Analisis Sekarang
                      <span className="material-symbols-outlined mi">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="db-recent">
                  {recent.map(item => {
                    const positions = item.identified_positions || []
                    const preview = truncate(item.narrative_preview || item.narrative_input || '', 60) || 'Sesi rekomendasi'
                    return (
                      <Link href="/riwayat" key={item.id} className="db-recent-item">
                        <span className="db-recent-icon">
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>auto_awesome</span>
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span className="db-recent-preview">{preview}</span>
                          {positions.length > 0 && (
                            <span className="db-recent-badges">
                              {positions.slice(0, 3).map((p, i) => (
                                <span key={i} className="db-badge">{p}</span>
                              ))}
                              {positions.length > 3 && (
                                <span className="db-badge" style={{ opacity: 0.7 }}>+{positions.length - 3}</span>
                              )}
                            </span>
                          )}
                          <span className="db-recent-meta">{formatRelative(item.created_at)}</span>
                        </span>
                        <span className="material-symbols-outlined db-recent-chev">chevron_right</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="nn-panel nn-a3">
              <div className="nn-panel-hd">
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>bolt</span>
                Akses Cepat
              </div>
              <div className="db-action-list">
                {actions.map(item => (
                  <Link href={item.href} className="db-action" key={item.href} style={{ '--db-accent': item.accent }}>
                    <span className="db-action-icon">
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{item.icon}</span>
                    </span>
                    <span>
                      <span className="db-action-label">{item.label}</span>
                      <span className="db-action-sub">{item.sub}</span>
                    </span>
                    <span className="material-symbols-outlined" style={{ color: 'rgba(255,255,255,0.24)', fontSize: 20 }}>chevron_right</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </div>
      </AppShell>
    </>
  )
}
