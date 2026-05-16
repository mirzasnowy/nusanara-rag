import Head from 'next/head'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '@clerk/react'
import AppShell from '../components/AppShell'
import { getHistory, getHistoryDetail } from '../lib/api'
import { log, warn } from '../lib/log'

function formatDateLong(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function formatRelative(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} hari lalu`
  return formatDateLong(iso)
}

function truncate(s, n) {
  if (!s) return ''
  return s.length > n ? s.slice(0, n).trimEnd() + '…' : s
}

/**
 * Backend kadang return retrieved_chunks sebagai string JSON (dari Postgres JSONB).
 * Selalu parse dulu sebelum diakses sebagai array.
 */
function parseChunks(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      warn('[riwayat] Gagal parse retrieved_chunks:', e.message)
      return []
    }
  }
  return []
}

export default function RiwayatPage() {
  const { getToken, isSignedIn } = useAuth()
  const [items, setItems] = useState([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [detailCache, setDetailCache] = useState({})
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false
    setLoading(true)
    getHistory(getToken, { page: 1, limit: 20 })
      .then(res => {
        if (cancelled) return
        setItems(res.items)
        setTotalSessions(res.total)
      })
      .catch(e => {
        if (cancelled) return
        setError(e.message || 'Gagal memuat riwayat.')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isSignedIn, getToken])

  const stats = useMemo(() => {
    const positions = new Set()
    const clusters = new Set()
    items.forEach(item => {
      (item.identified_positions || []).forEach(p => positions.add(p))
      const chunks = parseChunks(item.retrieved_chunks)
      const firstCluster = chunks[0]?.cluster
      if (firstCluster != null && firstCluster !== '') clusters.add(firstCluster)
    })
    log(`[riwayat] Stats: ${totalSessions} sesi, ${positions.size} posisi unik, ${clusters.size} kategori`)
    return {
      sessions: totalSessions,
      positions: positions.size,
      clusters: clusters.size,
    }
  }, [items, totalSessions])

  async function handleToggle(id) {
    if (expandedId === id) {
      setExpandedId(null)
      return
    }
    setExpandedId(id)
    if (detailCache[id]) return
    setDetailLoading(true)
    try {
      const detail = await getHistoryDetail(getToken, id)
      setDetailCache(prev => ({ ...prev, [id]: detail }))
    } catch (e) {
      setDetailCache(prev => ({ ...prev, [id]: { _error: e.message } }))
    } finally {
      setDetailLoading(false)
    }
  }

  const isEmpty = !loading && items.length === 0

  return (
    <>
      <Head>
        <title>Riwayat - NusaNara</title>
        <style>{`
          .rw-page { display: grid; gap: 18px; }

          .rw-header {
            position: relative;
            overflow: hidden;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 18px;
            align-items: end;
            padding: 26px;
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 20px;
            background: rgba(7,24,40,0.34);
            backdrop-filter: blur(26px) saturate(128%);
            -webkit-backdrop-filter: blur(26px) saturate(128%);
            box-shadow:
              0 18px 48px rgba(0,0,0,0.16),
              inset 0 1px 0 rgba(255,255,255,0.09),
              inset 0 -1px 0 rgba(0,0,0,0.16);
          }

          .rw-header::before {
            content: '';
            position: absolute;
            inset: 0;
            border-radius: inherit;
            background: linear-gradient(135deg, rgba(255,255,255,0.07), transparent 36%, rgba(255,255,255,0.02) 72%, transparent);
            pointer-events: none;
          }

          .rw-header > * { position: relative; z-index: 1; }

          .rw-kicker {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            margin-bottom: 14px;
            padding: 5px 12px;
            border: 1px solid rgba(255,153,51,0.16);
            border-radius: 999px;
            background: rgba(255,153,51,0.08);
            color: hsl(35,100%,60%);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: .12em;
            text-transform: uppercase;
          }

          .rw-title {
            margin: 0;
            color: rgba(255,255,255,0.92);
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: clamp(1.6rem, 3.2vw, 2.6rem);
            font-weight: 400;
            line-height: 1;
            letter-spacing: -1.2px;
          }

          .rw-title em { color: hsl(240,4%,66%); font-style: normal; }

          .rw-copy {
            max-width: 610px;
            margin: 14px 0 0;
            color: rgba(255,255,255,0.58);
            font-size: 14px;
            line-height: 1.72;
          }

          .rw-stats {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 12px;
          }

          .rw-stat {
            --rw-accent: 255,153,51;
            min-height: 116px;
            padding: 16px;
            border: 1px solid rgba(var(--rw-accent),0.14);
            border-radius: 15px;
            background:
              radial-gradient(circle at 86% 12%, rgba(var(--rw-accent),0.10), transparent 34%),
              rgba(7,24,40,0.34);
            backdrop-filter: blur(24px) saturate(126%);
            -webkit-backdrop-filter: blur(24px) saturate(126%);
            box-shadow:
              0 16px 42px rgba(0,0,0,0.15),
              inset 0 1px 0 rgba(255,255,255,0.09),
              inset 0 -1px 0 rgba(0,0,0,0.16);
          }

          .rw-stat-top {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 14px;
            color: rgba(var(--rw-accent),0.68);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: .1em;
            text-transform: uppercase;
          }

          .rw-stat-value {
            color: rgba(255,255,255,0.94);
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: 36px;
            line-height: .95;
            letter-spacing: -1.6px;
          }

          .rw-empty {
            min-height: 280px;
            display: grid;
            place-items: center;
            text-align: center;
          }

          .rw-empty-inner {
            max-width: 440px;
            display: grid;
            justify-items: center;
            gap: 15px;
          }

          .rw-empty-icon {
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid rgba(255,153,51,0.16);
            border-radius: 18px;
            background: rgba(255,153,51,0.08);
            color: hsl(35,100%,60%);
          }

          .rw-empty-title {
            color: rgba(255,255,255,0.88);
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: 28px;
            line-height: 1.05;
            letter-spacing: -.6px;
          }

          .rw-empty-copy { color: rgba(255,255,255,0.56); font-size: 13px; line-height: 1.7; }

          .rw-list { display: grid; gap: 10px; }

          .rw-item {
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 16px;
            background: rgba(7,24,40,0.28);
            backdrop-filter: blur(18px) saturate(120%);
            -webkit-backdrop-filter: blur(18px) saturate(120%);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
            overflow: hidden;
            transition: border-color .2s, transform .2s;
          }

          .rw-item.open { border-color: rgba(255,153,51,0.3); }

          .rw-item-head {
            display: grid;
            grid-template-columns: 56px minmax(0, 1fr) auto;
            gap: 14px;
            align-items: start;
            padding: 14px 16px;
            cursor: pointer;
          }

          .rw-sesi-num {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 56px;
            padding: 8px 0;
            border-radius: 12px;
            background: rgba(255,153,51,0.1);
            border: 1px solid rgba(255,153,51,0.18);
            color: hsl(35,100%,62%);
          }

          .rw-sesi-num-label {
            font-size: 9px;
            font-weight: 600;
            letter-spacing: .14em;
            text-transform: uppercase;
            opacity: .78;
          }

          .rw-sesi-num-value {
            margin-top: 2px;
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: 19px;
            font-weight: 500;
            line-height: 1;
            letter-spacing: -.5px;
          }

          .rw-item-preview {
            display: block;
            color: rgba(255,255,255,0.92);
            font-size: 13px;
            font-weight: 500;
            line-height: 1.5;
          }

          .rw-badges {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin-top: 8px;
          }

          .rw-badge {
            display: inline-flex;
            align-items: center;
            padding: 2px 9px;
            border: 1px solid rgba(96,165,250,0.22);
            border-radius: 999px;
            background: rgba(96,165,250,0.08);
            color: rgba(180,210,255,0.9);
            font-size: 10.5px;
            font-weight: 500;
            white-space: nowrap;
          }

          .rw-item-meta {
            margin-top: 8px;
            color: rgba(255,255,255,0.46);
            font-size: 11.5px;
          }

          .rw-item-actions {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 6px;
            margin-top: 2px;
          }

          .rw-detail-btn {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            padding: 6px 11px;
            border: 1px solid rgba(255,153,51,0.28);
            border-radius: 9px;
            background: rgba(255,153,51,0.06);
            color: hsl(35,100%,68%);
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: background .2s, border-color .2s;
          }

          .rw-detail-btn:hover {
            background: rgba(255,153,51,0.14);
            border-color: hsl(35,100%,62%);
            color: hsl(35,100%,76%);
          }

          .rw-item-chev {
            color: rgba(255,255,255,0.38);
            transition: transform .25s;
          }

          .rw-item.open .rw-item-chev {
            transform: rotate(180deg);
            color: hsl(35,100%,62%);
          }

          .rw-profile-block {
            padding: 12px 14px;
            border-left: 3px solid rgba(96,165,250,0.4);
            border-radius: 0 11px 11px 0;
            background: rgba(96,165,250,0.05);
            color: rgba(255,255,255,0.78);
            font-size: 12.5px;
            line-height: 1.65;
            white-space: pre-wrap;
          }

          .rw-profile-block.empty {
            color: rgba(255,255,255,0.4);
            font-style: italic;
          }

          .rw-chunk-link {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            margin-top: 6px;
            color: hsl(35,100%,68%);
            font-size: 11px;
            font-weight: 500;
            text-decoration: none;
            text-underline-offset: 3px;
          }

          .rw-chunk-link:hover {
            text-decoration: underline;
            color: hsl(35,100%,78%);
          }

          .rw-skill-matches {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 6px;
          }

          .rw-skill-chip {
            padding: 1px 7px;
            border-radius: 999px;
            background: rgba(45,212,191,0.08);
            border: 1px solid rgba(45,212,191,0.22);
            color: rgba(126,232,210,0.92);
            font-size: 10px;
            font-weight: 500;
          }

          .rw-detail {
            padding: 0 18px 18px;
            border-top: 1px solid rgba(255,255,255,0.06);
            display: grid;
            gap: 16px;
          }

          .rw-detail-block-label {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            margin-top: 16px;
            margin-bottom: 8px;
            color: hsl(35,100%,62%);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: .14em;
            text-transform: uppercase;
          }

          .rw-narr {
            padding: 12px 14px;
            border-radius: 11px;
            background: rgba(7,24,40,0.4);
            color: rgba(255,255,255,0.78);
            font-size: 13px;
            line-height: 1.65;
            white-space: pre-wrap;
          }

          .rw-chunks {
            display: grid;
            gap: 8px;
          }

          .rw-chunk {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 8px;
            padding: 10px 12px;
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 11px;
            background: rgba(7,24,40,0.36);
          }

          .rw-chunk-title {
            color: rgba(255,255,255,0.88);
            font-size: 12.5px;
            font-weight: 600;
            line-height: 1.4;
          }

          .rw-chunk-meta {
            margin-top: 3px;
            color: rgba(255,255,255,0.46);
            font-size: 11px;
          }

          .rw-chunk-score {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 2px;
            color: hsl(35,100%,62%);
            font-size: 11px;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
          }

          .rw-chunk-score small { color: rgba(255,255,255,0.4); font-weight: 400; }

          .rw-recommendation {
            padding: 14px 16px;
            border-radius: 12px;
            background: rgba(7,24,40,0.4);
            color: rgba(255,255,255,0.86);
            font-size: 13px;
            line-height: 1.75;
            max-height: 360px;
            overflow-y: auto;
          }

          .rw-recommendation h1, .rw-recommendation h2, .rw-recommendation h3, .rw-recommendation h4 {
            margin: 1.2em 0 .5em;
            color: rgba(255,255,255,0.94);
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-weight: 500;
            letter-spacing: -0.3px;
          }
          .rw-recommendation h1 { font-size: 18px; }
          .rw-recommendation h2 { font-size: 16px; }
          .rw-recommendation h3 { font-size: 14px; color: hsl(35,100%,62%); }
          .rw-recommendation > *:first-child { margin-top: 0; }
          .rw-recommendation p { margin: 0 0 .8em; }
          .rw-recommendation strong { color: rgba(255,255,255,0.96); font-weight: 600; }
          .rw-recommendation ul, .rw-recommendation ol { margin: .4em 0 .9em; padding-left: 1.4em; }
          .rw-recommendation li { margin: .2em 0; }
          .rw-recommendation li::marker { color: hsl(35,100%,60%); }
          .rw-recommendation a {
            color: hsl(35,100%,68%);
            text-decoration: underline;
            text-decoration-color: rgba(255,153,51,0.4);
            text-underline-offset: 3px;
            word-break: break-all;
          }
          .rw-recommendation a:hover {
            color: hsl(35,100%,78%);
            text-decoration-color: hsl(35,100%,62%);
          }
          .rw-recommendation code {
            padding: 1px 6px;
            border-radius: 5px;
            background: rgba(255,255,255,0.08);
            color: hsl(35,100%,72%);
            font-family: ui-monospace, "SF Mono", Consolas, monospace;
            font-size: 11.5px;
          }

          .rw-skeleton {
            height: 64px;
            border-radius: 16px;
            background: linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.07), rgba(255,255,255,0.04));
            background-size: 200% 100%;
            animation: rw-shimmer 1.4s ease-in-out infinite;
          }

          @keyframes rw-shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }

          .rw-error {
            padding: 14px 18px;
            border: 1px solid rgba(240,80,60,0.28);
            border-radius: 14px;
            background: rgba(240,80,60,0.08);
            color: #f07050;
            font-size: 13px;
          }

          @media (max-width: 900px) {
            .rw-header { grid-template-columns: 1fr; align-items: start; }
          }

          @media (max-width: 640px) {
            .rw-title { font-size: clamp(1.4rem, 7vw, 2rem); }
            .rw-page { gap: 14px; }
            .rw-header { padding: 20px; border-radius: 18px; }
            .rw-stats { gap: 8px; }
            .rw-stat { min-height: 94px; padding: 12px; }
            .rw-stat-top { display: block; margin-bottom: 10px; font-size: 9px; }
            .rw-stat-top .material-symbols-outlined { display: none; }
            .rw-stat-value { font-size: 30px; }
            .rw-chunk { grid-template-columns: 1fr; }
            .rw-chunk-score { flex-direction: row; align-items: center; gap: 8px; }
          }
        `}</style>
      </Head>

      <AppShell active="/riwayat" topbarTitle="Riwayat Analisis">
        <div className="rw-page">
          <section className="rw-header nn-a0">
            <div>
              <div className="rw-kicker">
                <span className="material-symbols-outlined" style={{ fontSize: 13 }}>history</span>
                Riwayat
              </div>
              <h1 className="rw-title">
                Arsip analisis <em>karier.</em>
              </h1>
              <p className="rw-copy">
                Semua rekomendasi yang pernah dijalankan tersusun di sini, mudah dibandingkan dan dibuka kembali.
              </p>
            </div>
            <Link href="/rekomendasi" className="nn-btn">
              Analisis Baru
              <span className="material-symbols-outlined mi">add</span>
            </Link>
          </section>

          <section className="rw-stats nn-a1">
            {[
              { label: 'Total Sesi',  value: stats.sessions,  icon: 'analytics', accent: '255,153,51' },
              { label: 'Posisi Unik', value: stats.positions, icon: 'work',      accent: '96,165,250' },
              { label: 'Kategori',    value: stats.clusters,  icon: 'category',  accent: '45,212,191' },
            ].map(item => (
              <div className="rw-stat" key={item.label} style={{ '--rw-accent': item.accent }}>
                <div className="rw-stat-top">
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{item.icon}</span>
                  {item.label}
                </div>
                <div className="rw-stat-value">{item.value}</div>
              </div>
            ))}
          </section>

          <div className="nn-panel nn-a2">
            <div className="nn-panel-hd">
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>timeline</span>
              Daftar Riwayat
            </div>

            {error && <div className="rw-error">{error}</div>}

            {loading ? (
              <div className="rw-list">
                <div className="rw-skeleton" />
                <div className="rw-skeleton" />
                <div className="rw-skeleton" />
              </div>
            ) : isEmpty ? (
              <div className="rw-empty">
                <div className="rw-empty-inner">
                  <div className="rw-empty-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: 28 }}>history</span>
                  </div>
                  <div>
                    <div className="rw-empty-title">Belum ada riwayat</div>
                    <p className="rw-empty-copy">
                      Jalankan rekomendasi pertama dan hasilnya akan otomatis muncul di halaman ini.
                    </p>
                  </div>
                  <Link href="/rekomendasi" className="nn-btn">
                    Mulai Rekomendasi
                    <span className="material-symbols-outlined mi">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="rw-list">
                {items.map((item, idx) => {
                  const positions = item.identified_positions || []
                  const preview = truncate(item.narrative_preview || '', 80) || 'Sesi rekomendasi'
                  const sesiNumber = totalSessions - idx  // urutan dari terbaru
                  const isOpen = expandedId === item.id
                  const detail = detailCache[item.id]
                  return (
                    <article className={`rw-item${isOpen ? ' open' : ''}`} key={item.id}>
                      <div className="rw-item-head" onClick={() => handleToggle(item.id)}>
                        <div className="rw-sesi-num">
                          <span className="rw-sesi-num-label">Sesi</span>
                          <span className="rw-sesi-num-value">#{sesiNumber}</span>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="rw-item-preview">{preview}</div>
                          {positions.length > 0 && (
                            <div className="rw-badges">
                              {positions.slice(0, 4).map((p, i) => (
                                <span key={i} className="rw-badge">{p}</span>
                              ))}
                              {positions.length > 4 && (
                                <span className="rw-badge" style={{ opacity: 0.7 }}>+{positions.length - 4}</span>
                              )}
                            </div>
                          )}
                          <div className="rw-item-meta">{formatRelative(item.created_at)}</div>
                        </div>
                        <div className="rw-item-actions">
                          <button
                            type="button"
                            className="rw-detail-btn"
                            onClick={e => { e.stopPropagation(); handleToggle(item.id) }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>{isOpen ? 'visibility_off' : 'visibility'}</span>
                            {isOpen ? 'Tutup' : 'Lihat Detail'}
                          </button>
                          <span className="material-symbols-outlined rw-item-chev">expand_more</span>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="rw-detail">
                          {detailLoading && !detail && (
                            <div className="rw-skeleton" style={{ height: 160 }} />
                          )}

                          {detail && detail._error && (
                            <div className="rw-error">{detail._error}</div>
                          )}

                          {detail && !detail._error && (
                            <>
                              <div>
                                <div className="rw-detail-block-label">
                                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>edit_note</span>
                                  Narasi Lengkap
                                </div>
                                <div className="rw-narr">
                                  {detail.narrative_input || '—'}
                                </div>
                              </div>

                              <div>
                                <div className="rw-detail-block-label">
                                  <span className="material-symbols-outlined" style={{ fontSize: 12 }}>person</span>
                                  Profil Saat Sesi
                                </div>
                                <div className={`rw-profile-block${!detail.profile_at_time ? ' empty' : ''}`}>
                                  {detail.profile_at_time || 'Belum ada profil saat sesi ini.'}
                                </div>
                              </div>

                              {(() => {
                                const detailChunks = parseChunks(detail.retrieved_chunks)
                                return detailChunks.length > 0 && (
                                <div>
                                  <div className="rw-detail-block-label">
                                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>search</span>
                                    Lowongan Direferensikan (top 3)
                                  </div>
                                  <div className="rw-chunks">
                                    {detailChunks.slice(0, 3).map((c, i) => (
                                      <div key={c.id ?? i} className="rw-chunk">
                                        <div style={{ minWidth: 0 }}>
                                          <div className="rw-chunk-title">{c.title || 'Posisi'}</div>
                                          <div className="rw-chunk-meta">
                                            {c.company || '—'}{c.location ? ` · ${c.location}` : ''}{c.salary_text ? ` · ${c.salary_text}` : ''}
                                          </div>
                                          {Array.isArray(c.skill_matches) && c.skill_matches.length > 0 && (
                                            <div className="rw-skill-matches">
                                              {c.skill_matches.map((s, j) => (
                                                <span key={j} className="rw-skill-chip">{s}</span>
                                              ))}
                                            </div>
                                          )}
                                          {c.source_url && (
                                            <a href={c.source_url} target="_blank" rel="noopener noreferrer" className="rw-chunk-link">
                                              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>open_in_new</span>
                                              Buka lowongan
                                            </a>
                                          )}
                                        </div>
                                        <div className="rw-chunk-score">
                                          {typeof c.final_score === 'number' && (
                                            <span>{c.final_score.toFixed(2)}</span>
                                          )}
                                          <small>final score</small>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                              })()}

                              {detail.recommendation && (
                                <div>
                                  <div className="rw-detail-block-label">
                                    <span className="material-symbols-outlined" style={{ fontSize: 12 }}>auto_awesome</span>
                                    Rekomendasi Lengkap
                                  </div>
                                  <div className="rw-recommendation">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        a: ({ href, children }) => (
                                          <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                                        ),
                                      }}
                                    >
                                      {detail.recommendation}
                                    </ReactMarkdown>
                                  </div>
                                </div>
                              )}

                              <div style={{ color: 'rgba(255,255,255,0.36)', fontSize: 11 }}>
                                Dibuat {formatDateLong(detail.created_at || item.created_at)}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </>
  )
}
