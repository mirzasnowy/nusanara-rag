import Head from 'next/head'
import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth, useUser } from '@clerk/react'
import AppShell from '../components/AppShell'
import { getCachedToken } from '../lib/tokenCache'
import { apiUrl, getHistory, getHistoryDetail, initProfile } from '../lib/api'
import { log, warn, error as logError, isDev } from '../lib/log'

const MAX = 2000
const SSE_IDLE_TIMEOUT_MS = 30 * 60 * 1000
const HISTORY_RECOVERY_WAIT_SECONDS = 480
const HISTORY_RECOVERY_WAIT_MESSAGE = 'Server masih memproses rekomendasi anda, mohon tunggu...'
const HISTORY_UNAVAILABLE_MESSAGE = 'Rekomendasi belum tersedia, silakan cek halaman Riwayat beberapa saat lagi.'

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function getErrorMessage(e) {
  if (!e) return 'Terjadi kesalahan tak terduga.'
  const label = e.name && e.name !== 'Error' ? `${e.name}: ` : ''
  return `${label}${e.message || String(e)}`
}

function formatCountdown(seconds) {
  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

// Heading kanonik untuk format hasil 5 seksi
const SECTION_HEADINGS = [
  { key: 'profil',     label: 'Analisis Profil',      icon: 'person_search',   match: /analisis\s+profil/i },
  { key: 'keputusan',  label: 'Rekomendasi Keputusan', icon: 'verified',        match: /rekomendasi\s+keputusan|keputusan/i },
  { key: 'gap',        label: 'Skill Gap',            icon: 'trending_up',     match: /skill\s*gap/i },
  { key: 'rencana',    label: 'Rencana Pengembangan', icon: 'route',           match: /rencana\s+pengembangan|pengembangan/i },
  { key: 'pasar',      label: 'Insight Pasar',        icon: 'insights',        match: /insight\s+pasar|pasar/i },
]

function parseSections(text) {
  if (!text) return []
  // Split berdasarkan heading bold (**Heading**) atau numbering "1. Heading"
  const lines = text.split('\n')
  const blocks = []
  let current = null

  for (const line of lines) {
    const stripped = line.replace(/^\s*[#*]+\s*/, '').replace(/\*\*/g, '').replace(/^\s*\d+\.\s*/, '').trim()
    const matched = SECTION_HEADINGS.find(h => h.match.test(stripped) && stripped.length < 60)
    if (matched && (!current || current.key !== matched.key)) {
      if (current) blocks.push(current)
      current = { key: matched.key, label: matched.label, icon: matched.icon, body: '' }
    } else if (current) {
      current.body += line + '\n'
    } else {
      // Konten sebelum heading pertama → masuk ke "intro"
      if (!blocks.length || blocks[blocks.length - 1].key !== 'intro') {
        blocks.push({ key: 'intro', label: '', icon: '', body: '' })
      }
      blocks[blocks.length - 1].body += line + '\n'
    }
  }
  if (current) blocks.push(current)
  return blocks.map(b => ({ ...b, body: b.body.trim() })).filter(b => b.body)
}

const TIPS = [
  {
    icon: 'edit_note',
    title: 'Tulis natural',
    body: 'Ceritakan pengalaman, minat, skill, dan pekerjaan yang ingin kamu coba. Tidak perlu format CV.',
  },
  {
    icon: 'target',
    title: 'Beri konteks',
    body: 'Sebutkan jurusan, tools yang pernah dipakai, kegiatan organisasi, atau proyek yang dikerjakan.',
  },
  {
    icon: 'route',
    title: 'Arah yang dituju',
    body: 'Kalau masih bingung, tulis beberapa bidang yang membuatmu penasaran. Sistem akan memetakan pilihan.',
  },
]

export default function RekomendasiPage() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [text, setText] = useState('')
  const [openTips, setOpenTips] = useState([0, 1, 2])

  const toggleTip = (index) => {
    setOpenTips(prev => prev.includes(index) ? prev.filter(x => x !== index) : [...prev, index])
  }
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [progressMsg, setProgressMsg] = useState('')
  const [streamError, setStreamError] = useState('')
  const [debugInfo, setDebugInfo] = useState(null)  // { status, chunks, doneSignal, historyCount, historySaved }

  const progress = Math.min(100, (text.length / MAX) * 100)
  const isReady = text.trim().length > 40 && !loading
  const charsLeftToReady = Math.max(0, 41 - text.trim().length)

  async function verifyHistorySaved(beforeCount) {
    try {
      log('[recommend] Verifikasi: GET /api/history setelah DONE...')
      const res = await getHistory(getToken, { page: 1, limit: 1 })
      const count = res.total
      log(`[recommend] /api/history total: ${count} (sebelumnya ${beforeCount})`)
      const saved = beforeCount == null ? count > 0 : count > beforeCount
      setDebugInfo(prev => ({ ...prev, historyCount: count, historySaved: saved, historyBefore: beforeCount }))
      if (beforeCount != null && !saved) {
        warn('[recommend] ⚠️ History TIDAK bertambah — data tidak tersimpan di backend')
      }
    } catch (e) {
      logError('[recommend] Verifikasi history gagal:', e.message)
      setDebugInfo(prev => ({ ...prev, historyError: e.message }))
    }
  }

  async function waitBeforeHistoryRecovery() {
    for (let secondsLeft = HISTORY_RECOVERY_WAIT_SECONDS; secondsLeft > 0; secondsLeft -= 1) {
      setProgressMsg(`${HISTORY_RECOVERY_WAIT_MESSAGE} ${formatCountdown(secondsLeft)} (${secondsLeft} detik)`)
      setDebugInfo(prev => ({ ...prev, recoveryCountdown: secondsLeft }))
      await sleep(1000)
    }
  }

  async function loadLatestRecommendationFromHistory(beforeCount, sourceError) {
    const sourceMessage = getErrorMessage(sourceError)
    warn('[recommend] Stream/fetch terputus, menunggu sebelum ambil /api/history:', sourceMessage)
    setStreamError('')
    setDebugInfo(prev => ({
      ...prev,
      fallback: true,
      fallbackReason: sourceMessage,
      historyBefore: beforeCount,
    }))

    await waitBeforeHistoryRecovery()

    try {
      setProgressMsg('Memuat hasil rekomendasi dari riwayat...')
      const latest = await getHistory(getToken, { page: 1, limit: 1 })
      const item = latest.items?.[0]

      setDebugInfo(prev => ({
        ...prev,
        historyCount: latest.total,
        historyBefore: beforeCount,
        recoveryCountdown: 0,
      }))

      if (!item?.id) {
        setStreamError(HISTORY_UNAVAILABLE_MESSAGE)
        return false
      }

      const detail = await getHistoryDetail(getToken, item.id)
      if (!detail?.recommendation) {
        setStreamError(HISTORY_UNAVAILABLE_MESSAGE)
        return false
      }

      setResult(detail.recommendation)
      setProgressMsg('')
      setStreamError('')
      setDebugInfo(prev => ({
        ...prev,
        fallbackRecovered: true,
        historySaved: true,
        historyId: item.id,
      }))
      log('[recommend] Fallback history berhasil setelah countdown. ID:', item.id)
      return true
    } catch (historyErr) {
      const historyMessage = getErrorMessage(historyErr)
      warn('[recommend] Fallback history gagal setelah countdown:', historyMessage)
      setDebugInfo(prev => ({ ...prev, historyError: historyMessage }))
      setStreamError(HISTORY_UNAVAILABLE_MESSAGE)
      return false
    }
  }

  async function handleAnalyze() {
    if (!isReady) return
    setLoading(true)
    setResult('')
    setProgressMsg('🔍 Menyiapkan permintaan...')
    setStreamError('')
    setDebugInfo({ chunks: 0, doneSignal: false, status: null })

    // DEFENSIVE: pastikan user punya row di user_profiles sebelum recommend
    // Backend pakai ON CONFLICT DO NOTHING jadi aman dipanggil berulang
    // Mencegah FK violation pada INSERT recommendation_history
    try {
      log('[recommend] Defensive profile/init sebelum recommend...')
      await initProfile(getToken, {
        email: user?.primaryEmailAddress?.emailAddress || '',
        full_name: user?.fullName || user?.firstName || '',
      })
      log('[recommend] ✅ profile/init OK')
    } catch (e) {
      logError('[recommend] profile/init gagal:', e.status, e.message)
      setStreamError(`Profile init gagal: ${e.message}. Cek backend /api/profile/init.`)
      setLoading(false)
      setProgressMsg('')
      return
    }

    // Snapshot jumlah history sebelum request, untuk verifikasi setelah DONE
    let beforeCount = null
    try {
      const before = await getHistory(getToken, { page: 1, limit: 1 })
      beforeCount = before.total
      log(`[recommend] History sebelum request: ${beforeCount}`)
    } catch (e) {
      warn('[recommend] Gagal ambil history sebelum request:', e.message)
    }

    const controller = new AbortController()
    let streamTimeoutId = null
    const refreshStreamTimeout = () => {
      if (streamTimeoutId) clearTimeout(streamTimeoutId)
      streamTimeoutId = setTimeout(() => {
        controller.abort(new Error(`SSE idle timeout ${SSE_IDLE_TIMEOUT_MS / 60000} menit`))
      }, SSE_IDLE_TIMEOUT_MS)
    }

    try {
      const token = await getCachedToken(getToken)
      if (!token) throw new Error('Gagal mendapatkan token autentikasi.')

      const url = apiUrl('/api/recommend')
      log('[recommend] POST /api/recommend | narrative length:', text.length)

      refreshStreamTimeout()
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ narrative: text }),
        signal: controller.signal,
      })
      refreshStreamTimeout()

      log('[recommend] Response status:', res.status, res.statusText)
      setDebugInfo(prev => ({ ...prev, status: res.status }))

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        logError('[recommend] Response NOT OK:', res.status)
        throw new Error(err.detail || `Request gagal (HTTP ${res.status})`)
      }

      if (!res.body) {
        throw new Error('Response stream kosong dari server.')
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let chunkCount = 0
      let doneReceived = false
      // Pesan progress dimulai dengan emoji status (🔍 📊 🧠 ✅) — pisahkan dari token LLM
      const progressRegex = /^\s*[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u

      while (true) {
        const { done, value } = await reader.read()
        refreshStreamTimeout()
        if (done) {
          log('[recommend] Stream selesai. Chunks:', chunkCount, '| DONE:', doneReceived)
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') {
            doneReceived = true
            log('[recommend] ✅ DONE setelah', chunkCount, 'chunks')
            setProgressMsg('')
            setLoading(false)
            setDebugInfo(prev => ({ ...prev, chunks: chunkCount, doneSignal: true }))
            // Beri backend 1.5s untuk commit ke DB (adaptive profile + history update background)
            setTimeout(() => verifyHistorySaved(beforeCount), 1500)
            return
          }
          try {
            const parsed = JSON.parse(data)
            if (!parsed.content) continue
            chunkCount += 1
            if (progressRegex.test(parsed.content) && !result) {
              setProgressMsg(parsed.content.trim())
            } else {
              setProgressMsg('')
              setResult(prev => prev + parsed.content)
            }
          } catch (parseErr) {
            warn('[recommend] Chunk gagal di-parse:', parseErr.message)
          }
        }
      }

      // Stream berakhir tanpa DONE signal
      if (!doneReceived) {
        warn('[recommend] ⚠️ Stream selesai TANPA [DONE] signal')
        const recovered = await loadLatestRecommendationFromHistory(
          beforeCount,
          new Error('Stream berakhir tanpa sinyal selesai dari server.')
        )
        if (!recovered) {
          setStreamError(HISTORY_UNAVAILABLE_MESSAGE)
        }
      }
      setDebugInfo(prev => ({ ...prev, chunks: chunkCount, doneSignal: doneReceived }))
      setTimeout(() => verifyHistorySaved(beforeCount), 1500)
    } catch (e) {
      const message = getErrorMessage(e)
      logError('[recommend] Error:', message)
      setDebugInfo(prev => ({ ...prev, error: message }))
      const recovered = await loadLatestRecommendationFromHistory(beforeCount, e)
      if (!recovered) {
        setStreamError(HISTORY_UNAVAILABLE_MESSAGE)
      }
    } finally {
      if (streamTimeoutId) clearTimeout(streamTimeoutId)
      setProgressMsg('')
      setLoading(false)
    }
  }

  // Format hasil ke 5 seksi: deteksi heading dengan numbering atau bold
  const sections = useMemo(() => parseSections(result), [result])
  const historyUnavailable = streamError === HISTORY_UNAVAILABLE_MESSAGE

  return (
    <>
      <Head>
        <title>Rekomendasi - NusaNara</title>
        <style>{`
          /* ── Header ── */
          .rk-head {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 20px;
          }

          .rk-kicker {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 5px 12px;
            border: 1px solid rgba(255,153,51,0.18);
            border-radius: 999px;
            background: rgba(255,153,51,0.08);
            color: hsl(35,100%,62%);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: .14em;
            text-transform: uppercase;
            width: max-content;
          }

          .rk-title {
            margin: 0;
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: clamp(1.6rem, 3.2vw, 2.6rem);
            font-weight: 500;
            line-height: 1.02;
            letter-spacing: -1px;
            color: rgba(255,255,255,0.94);
          }

          .rk-title em {
            color: rgba(255,255,255,0.36);
            font-style: normal;
          }

          /* ── Bento ── */
          .rk-bento {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
          }

          .rk-card {
            position: relative;
            overflow: hidden;
            padding: 18px;
            border: 1px solid rgba(255,255,255,0.08);
            border-radius: 20px;
            background: rgba(7,24,40,0.4);
            backdrop-filter: blur(22px) saturate(140%);
            -webkit-backdrop-filter: blur(22px) saturate(140%);
            box-shadow:
              0 12px 36px rgba(0,0,0,0.18),
              inset 0 1px 0 rgba(255,255,255,0.06);
            transition: border-color .25s ease, transform .25s ease;
          }

          .rk-card-label {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            margin-bottom: 14px;
            color: rgba(255,255,255,0.42);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: .14em;
            text-transform: uppercase;
          }

          /* ── EDITOR ── */
          .rk-editor {
            grid-column: span 3;
            display: flex;
            flex-direction: column;
            padding: 0;
          }

          .rk-editor.focused {
            border-color: rgba(255,153,51,0.32);
            box-shadow:
              0 0 0 1px rgba(255,153,51,0.12),
              0 18px 44px rgba(0,0,0,0.22);
          }

          .rk-editor-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 13px 18px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
          }

          .rk-editor-head-label {
            display: flex;
            align-items: center;
            gap: 9px;
            color: rgba(255,255,255,0.78);
            font-size: 12px;
            font-weight: 600;
          }

          .rk-count {
            font-size: 11px;
            font-variant-numeric: tabular-nums;
            color: ${MAX - text.length < 160 ? '#f07050' : 'rgba(255,255,255,0.45)'};
          }

          .rk-textarea {
            flex: 1;
            width: 100%;
            min-height: 220px;
            display: block;
            resize: none;
            border: 0;
            outline: 0;
            background: transparent;
            color: rgba(255,255,255,0.94);
            caret-color: hsl(35,100%,60%);
            font-family: var(--nn-font-sans, 'Inter', sans-serif);
            font-size: 13.5px;
            line-height: 1.75;
            padding: 18px;
          }

          .rk-textarea::placeholder {
            color: rgba(255,255,255,0.32);
          }

          .rk-progress {
            height: 3px;
            background: rgba(255,255,255,0.04);
          }

          .rk-progress > span {
            display: block;
            width: ${progress}%;
            height: 100%;
            background: linear-gradient(90deg, hsl(35,100%,60%), hsl(35,100%,72%));
            transition: width .25s ease;
          }

          /* ── SUBMIT card ── */
          .rk-submit-card {
            grid-column: span 1;
            display: flex;
            flex-direction: column;
            gap: 14px;
            padding: 18px;
            background:
              radial-gradient(ellipse 80% 60% at 100% 0%, rgba(255,153,51,0.16), transparent 65%),
              rgba(7,24,40,0.45);
            border: 1px solid rgba(255,153,51,0.16);
          }

          .rk-submit-meta {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .rk-submit-meta-row {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 7px 10px;
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 9px;
            background: rgba(255,255,255,0.025);
            color: rgba(255,255,255,0.45);
            font-size: 11px;
          }

          .rk-submit-meta-row .material-symbols-outlined {
            font-size: 13px;
            color: hsl(35,100%,62%);
            opacity: .75;
          }

          .rk-submit {
            width: 100%;
            min-height: 48px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 9px;
            border: 0;
            border-radius: 12px;
            font-family: var(--nn-font-sans, 'Inter', sans-serif);
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: transform .25s, box-shadow .25s, filter .25s;
          }

          .rk-submit.ready {
            background: hsl(35,100%,60%);
            color: #04111E;
            box-shadow: 0 12px 32px rgba(255,153,51,0.32), inset 0 1px 0 rgba(255,255,255,0.25);
          }

          .rk-submit.ready:hover {
            transform: translateY(-2px);
            box-shadow: 0 16px 40px rgba(255,153,51,0.42), inset 0 1px 0 rgba(255,255,255,0.3);
            filter: brightness(1.05);
          }

          .rk-submit.idle {
            background: rgba(255,255,255,0.04);
            border: 1px solid rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.32);
            cursor: not-allowed;
          }

          .rk-submit-title {
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: 18px;
            font-weight: 500;
            line-height: 1.15;
            letter-spacing: -0.3px;
            color: rgba(255,255,255,0.94);
          }

          .rk-submit-sub {
            margin-top: 5px;
            font-size: 11.5px;
            line-height: 1.55;
            color: rgba(255,255,255,0.45);
          }

          /* ── TIPS ── */
          .rk-tips {
            grid-column: span 4;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            align-items: start;
            gap: 14px;
            padding: 0;
            background: transparent;
            border: 0;
            box-shadow: none;
            backdrop-filter: none;
          }

          .rk-tip {
            position: relative;
            overflow: hidden;
            padding: 15px 16px;
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 16px;
            background: rgba(7,24,40,0.32);
            backdrop-filter: blur(18px) saturate(130%);
            -webkit-backdrop-filter: blur(18px) saturate(130%);
            cursor: pointer;
            transition: border-color .25s, transform .25s, background .25s;
          }

          .rk-tip:hover {
            border-color: rgba(255,153,51,0.22);
            background: rgba(255,153,51,0.04);
            transform: translateY(-2px);
          }

          .rk-tip.open {
            border-color: rgba(255,153,51,0.32);
            background: rgba(255,153,51,0.06);
          }

          .rk-tip-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .rk-tip-icon {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 9px;
            background: rgba(255,153,51,0.1);
            color: hsl(35,100%,62%);
          }

          .rk-tip-title {
            flex: 1;
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: 15px;
            font-weight: 500;
            color: rgba(255,255,255,0.92);
            letter-spacing: -0.2px;
          }

          .rk-tip-chev {
            color: rgba(255,255,255,0.35);
            transition: transform .2s;
          }

          .rk-tip.open .rk-tip-chev {
            transform: rotate(180deg);
            color: hsl(35,100%,62%);
          }

          .rk-tip-body {
            max-height: 0;
            overflow: hidden;
            color: rgba(255,255,255,0.55);
            font-size: 12px;
            line-height: 1.65;
            transition: max-height .3s ease, margin-top .3s ease;
          }

          .rk-tip.open .rk-tip-body {
            max-height: 160px;
            margin-top: 10px;
          }

          /* ── Progress ── */
          .rk-progress-banner {
            grid-column: span 4;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 18px;
            border: 1px solid rgba(255,153,51,0.22);
            border-radius: 14px;
            background:
              linear-gradient(90deg, rgba(255,153,51,0.05), rgba(255,153,51,0.02)),
              rgba(7,24,40,0.4);
            color: hsl(35,100%,75%);
            font-size: 13px;
            font-weight: 500;
          }

          .rk-progress-banner .spinner {
            width: 14px;
            height: 14px;
            border-radius: 999px;
            border: 2px solid rgba(255,153,51,0.25);
            border-top-color: hsl(35,100%,62%);
            animation: rk-spin 0.8s linear infinite;
            flex-shrink: 0;
          }

          @keyframes rk-spin {
            to { transform: rotate(360deg); }
          }

          /* ── Result/Error ── */
          .rk-result {
            grid-column: span 4;
            padding: 0;
          }

          .rk-result-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 16px 22px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
          }

          .rk-result-head-label {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: hsl(35,100%,62%);
            font-size: 11px;
            font-weight: 600;
            letter-spacing: .14em;
            text-transform: uppercase;
          }

          .rk-result-sections {
            display: grid;
            gap: 14px;
            padding: 20px 22px 22px;
          }

          .rk-section {
            border: 1px solid rgba(255,255,255,0.06);
            border-radius: 14px;
            background: rgba(7,24,40,0.28);
            overflow: hidden;
          }

          .rk-section-head {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 16px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
            color: hsl(35,100%,62%);
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: 16px;
            font-weight: 500;
            letter-spacing: -0.2px;
          }

          .rk-section-head .material-symbols-outlined {
            font-size: 18px;
          }

          .rk-section-body {
            padding: 14px 16px;
            color: rgba(255,255,255,0.85);
            font-size: 13.5px;
            line-height: 1.8;
          }

          .rk-section.intro .rk-section-body {
            padding: 6px 4px 0;
          }

          .rk-result-body {
            color: rgba(255,255,255,0.92);
            font-size: 14px;
            line-height: 1.85;
          }

          /* ── Markdown styling ── */
          .rk-md {
            color: rgba(255,255,255,0.86);
            font-size: 13.5px;
            line-height: 1.78;
          }

          .rk-md h1, .rk-md h2, .rk-md h3, .rk-md h4 {
            margin: 1.4em 0 .55em;
            color: rgba(255,255,255,0.94);
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-weight: 500;
            letter-spacing: -0.3px;
          }
          .rk-md h1 { font-size: 22px; }
          .rk-md h2 { font-size: 19px; }
          .rk-md h3 { font-size: 16px; color: hsl(35,100%,62%); }
          .rk-md h4 { font-size: 14px; color: rgba(255,255,255,0.78); }
          .rk-md > *:first-child { margin-top: 0; }

          .rk-md p { margin: 0 0 .85em; }
          .rk-md strong { color: rgba(255,255,255,0.98); font-weight: 600; }
          .rk-md em { color: rgba(255,255,255,0.78); font-style: italic; }

          .rk-md ul, .rk-md ol { margin: .4em 0 1em; padding-left: 1.4em; }
          .rk-md li { margin: .25em 0; }
          .rk-md li::marker { color: hsl(35,100%,60%); }

          .rk-md a {
            color: hsl(35,100%,68%);
            text-decoration: underline;
            text-decoration-color: rgba(255,153,51,0.4);
            text-underline-offset: 3px;
            word-break: break-word;
            overflow-wrap: anywhere;
            transition: color .15s, text-decoration-color .15s;
          }
          .rk-md a:hover {
            color: hsl(35,100%,78%);
            text-decoration-color: hsl(35,100%,62%);
          }

          .rk-md code {
            padding: 1px 6px;
            border-radius: 5px;
            background: rgba(255,255,255,0.08);
            color: hsl(35,100%,72%);
            font-family: ui-monospace, "SF Mono", Consolas, monospace;
            font-size: 12px;
          }

          .rk-md pre {
            margin: .8em 0;
            padding: 12px 14px;
            border-radius: 10px;
            background: rgba(0,0,0,0.32);
            overflow-x: auto;
          }
          .rk-md pre code { background: transparent; padding: 0; color: rgba(255,255,255,0.88); }

          .rk-md blockquote {
            margin: .8em 0;
            padding: 6px 14px;
            border-left: 3px solid rgba(255,153,51,0.5);
            background: rgba(255,153,51,0.04);
            color: rgba(255,255,255,0.78);
          }

          .rk-md hr {
            margin: 1.2em 0;
            border: 0;
            border-top: 1px solid rgba(255,255,255,0.08);
          }

          /* ── Debug panel ── */
          .rk-debug {
            grid-column: span 4;
            padding: 12px 16px;
            border: 1px dashed rgba(96,165,250,0.32);
            border-radius: 12px;
            background: rgba(96,165,250,0.05);
            color: rgba(255,255,255,0.7);
            font-family: ui-monospace, "SF Mono", Consolas, monospace;
            font-size: 11.5px;
            line-height: 1.7;
          }
          .rk-debug-title {
            margin-bottom: 6px;
            color: rgba(96,165,250,0.92);
            font-weight: 700;
            letter-spacing: .08em;
            text-transform: uppercase;
          }
          .rk-debug .ok { color: #6ee7b7; }
          .rk-debug .warn { color: #fbbf24; }
          .rk-debug .err { color: #f07050; }

          .rk-error {
            grid-column: span 4;
            padding: 14px 18px;
            border: 1px solid rgba(240,80,60,0.28);
            border-radius: 14px;
            background: rgba(240,80,60,0.08);
            color: #f07050;
            font-size: 13px;
            line-height: 1.6;
          }

          /* ── Responsive ── */
          @media (max-width: 980px) {
            .rk-bento {
              grid-template-columns: repeat(2, 1fr);
            }
            .rk-editor { grid-column: span 2; }
            .rk-submit-card { grid-column: span 2; }
            .rk-tips { grid-column: span 2; }
            .rk-progress-banner,
            .rk-debug,
            .rk-result,
            .rk-error { grid-column: span 2; }
          }

          @media (max-width: 620px) {
            .rk-title { font-size: clamp(1.4rem, 7vw, 2rem); }
            .rk-bento {
              grid-template-columns: 1fr;
            }
            .rk-editor,
            .rk-submit-card,
            .rk-tips,
            .rk-progress-banner,
            .rk-debug,
            .rk-result,
            .rk-error {
              grid-column: span 1;
            }
            .rk-tips { grid-template-columns: 1fr; }
            .rk-textarea { min-height: 200px; }

            /* Streaming/output state — kompak untuk mobile */
            .rk-progress-banner {
              padding: 12px 14px;
              font-size: 12.5px;
              border-radius: 12px;
              gap: 10px;
            }
            .rk-debug {
              padding: 10px 12px;
              font-size: 10.5px;
              border-radius: 10px;
              line-height: 1.6;
              word-break: break-word;
            }
            .rk-error {
              padding: 12px 14px;
              border-radius: 12px;
              font-size: 12.5px;
            }
            .rk-result { border-radius: 16px; }
            .rk-result-head { padding: 13px 15px; }
            .rk-result-head-label {
              font-size: 10.5px;
              letter-spacing: .12em;
            }
            .rk-result-sections {
              gap: 10px;
              padding: 14px 14px 16px;
            }
            .rk-section { border-radius: 12px; }
            .rk-section-head {
              padding: 10px 13px;
              font-size: 15px;
              gap: 8px;
            }
            .rk-section-head .material-symbols-outlined { font-size: 16px; }
            .rk-section-body {
              padding: 12px 13px;
              font-size: 13px;
              line-height: 1.7;
            }
            .rk-md { font-size: 13px; }
            .rk-md h1 { font-size: 19px; }
            .rk-md h2 { font-size: 17px; }
            .rk-md h3 { font-size: 15px; }
            .rk-md h4 { font-size: 13.5px; }
            .rk-md ul, .rk-md ol { padding-left: 1.2em; }
            .rk-md pre { font-size: 11.5px; padding: 10px 12px; }
            .rk-md code { font-size: 11.5px; }
          }

          @media (max-width: 400px) {
            .rk-result-head { padding: 12px 13px; }
            .rk-result-sections { padding: 12px 12px 14px; }
            .rk-section-head { padding: 9px 12px; font-size: 14px; }
            .rk-section-head .material-symbols-outlined { font-size: 15px; }
            .rk-section-body { padding: 11px 12px; font-size: 12.5px; }
            .rk-md h1 { font-size: 18px; }
            .rk-md h2 { font-size: 16px; }
            .rk-md h3 { font-size: 14.5px; }
            .rk-progress-banner { font-size: 12px; padding: 11px 13px; }
            .rk-debug { font-size: 10px; padding: 9px 11px; }
          }
        `}</style>
      </Head>

      <AppShell
        active="/rekomendasi"
        topbarTitle="Rekomendasi"
        topbarRight={
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 999, background: 'rgba(255,153,51,0.09)', border: '1px solid rgba(255,153,51,0.18)', color: 'hsl(35,100%,62%)', fontSize: 10, fontWeight: 700, letterSpacing: '.1em' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>auto_awesome</span>
            AI POWERED
          </div>
        }
      >
        <div className="rk-head nn-a0">
          <div className="rk-kicker">
            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit_note</span>
            Input Narasi
          </div>
          <h1 className="rk-title">
            Ceritakan tentang <em>dirimu.</em>
          </h1>
        </div>

        <div className="rk-bento nn-a1">

          {/* EDITOR — large card */}
          <section className={`rk-card rk-editor${focused ? ' focused' : ''}`}>
            <div className="rk-editor-head">
              <div className="rk-editor-head-label">
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>notes</span>
                Narasi Karier
              </div>
              <div className="rk-count">{text.length.toLocaleString()} / {MAX.toLocaleString()}</div>
            </div>
            <textarea
              className="rk-textarea"
              maxLength={MAX}
              placeholder="Contoh: Saya mahasiswa Informatika semester 6. Pernah mengerjakan proyek web, tertarik dengan data, juga suka mengatur kerja tim..."
              value={text}
              onChange={event => setText(event.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
            />
            <div className="rk-progress"><span /></div>
          </section>

          {/* SUBMIT card */}
          <section className="rk-card rk-submit-card">
            <div>
              <div className="rk-card-label" style={{ color: 'hsl(35,100%,62%)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 12 }}>rocket_launch</span>
                Analisis
              </div>
              <div className="rk-submit-title">Siap dianalisis?</div>
              <div className="rk-submit-sub">
                {isReady
                  ? 'Narasi sudah cukup untuk diproses.'
                  : `${charsLeftToReady} karakter lagi agar bisa diproses.`}
              </div>
            </div>

            <div className="rk-submit-meta">
              <div className="rk-submit-meta-row">
                <span className="material-symbols-outlined">database</span>
                720+ lowongan dalam basis data
              </div>
              <div className="rk-submit-meta-row">
                <span className="material-symbols-outlined">psychology</span>
                Model Llama 3.1 · RAG
              </div>
              <div className="rk-submit-meta-row">
                <span className="material-symbols-outlined">verified</span>
                3 rekomendasi teratas
              </div>
            </div>

            <button className={`rk-submit${isReady ? ' ready' : ' idle'}`} type="button" disabled={!isReady} onClick={handleAnalyze}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{loading ? 'progress_activity' : isReady ? 'auto_awesome' : 'lock'}</span>
              {loading ? 'Memproses...' : isReady ? 'Dapatkan Rekomendasi' : 'Belum siap'}
            </button>
          </section>

          {/* TIPS row */}
          <div className="rk-tips">
            {TIPS.map((tip, index) => (
              <div
                key={tip.title}
                className={`rk-tip${openTips.includes(index) ? ' open' : ''}`}
                onClick={() => toggleTip(index)}
              >
                <div className="rk-tip-head">
                  <div className="rk-tip-icon">
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{tip.icon}</span>
                  </div>
                  <div className="rk-tip-title">{tip.title}</div>
                  <span className="material-symbols-outlined rk-tip-chev" style={{ fontSize: 17 }}>expand_more</span>
                </div>
                <div className="rk-tip-body">{tip.body}</div>
              </div>
            ))}
          </div>

          {/* PROGRESS */}
          {loading && progressMsg && (
            <div className="rk-progress-banner">
              <span className="spinner" />
              <span>{progressMsg}</span>
            </div>
          )}

          {/* ERROR (prominent banner di UI) */}
          {streamError && (
            <div className="rk-error" role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, marginTop: 1 }}>{historyUnavailable ? 'schedule' : 'error'}</span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>{historyUnavailable ? 'Rekomendasi belum tersedia' : 'Error saat menjalankan rekomendasi'}</div>
                <div style={{ opacity: .9 }}>{streamError}</div>
                {!historyUnavailable && (
                  <div style={{ marginTop: 6, fontSize: 11, opacity: .6 }}>Buka DevTools console untuk log lebih detail.</div>
                )}
              </div>
            </div>
          )}

          {/* DEBUG panel — DEV ONLY, dead-code eliminated di production build */}
          {isDev && debugInfo && (
            <div className="rk-debug">
              <div className="rk-debug-title">Debug Stream</div>
              <div>
                status: <span className={debugInfo.status === 200 ? 'ok' : debugInfo.status ? 'err' : ''}>{debugInfo.status ?? '—'}</span>
                {' · '}chunks: <span>{debugInfo.chunks ?? 0}</span>
                {' · '}DONE: <span className={debugInfo.doneSignal ? 'ok' : 'warn'}>{debugInfo.doneSignal ? '✓ diterima' : '✗ belum'}</span>
              </div>
              {debugInfo.historyBefore !== undefined && (
                <div>
                  history: <span>{debugInfo.historyBefore} → {debugInfo.historyCount ?? '...'}</span>
                  {debugInfo.historySaved !== undefined && (
                    <span className={debugInfo.historySaved ? 'ok' : 'err'}>
                      {' '}{debugInfo.historySaved ? '✓ tersimpan' : '✗ TIDAK tersimpan di backend'}
                    </span>
                  )}
                </div>
              )}
              {debugInfo.historyError && <div className="err">history error: {debugInfo.historyError}</div>}
              {debugInfo.error && <div className="err">error: {debugInfo.error}</div>}
            </div>
          )}

          {/* RESULT */}
          {result && (
            <section className="rk-card rk-result nn-a2">
              <div className="rk-result-head">
                <span className="rk-result-head-label">
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>auto_awesome</span>
                  Hasil Rekomendasi
                </span>
                {loading && <span className="spinner" style={{ width: 12, height: 12, borderRadius: 999, border: '2px solid rgba(255,153,51,0.25)', borderTopColor: 'hsl(35,100%,62%)', animation: 'rk-spin 0.8s linear infinite' }} />}
              </div>
              <div className="rk-result-sections">
                {sections.length > 0 ? (
                  sections.map((sec, i) => (
                    <div key={i} className={`rk-section${sec.key === 'intro' ? ' intro' : ''}`}>
                      {sec.label && (
                        <div className="rk-section-head">
                          <span className="material-symbols-outlined">{sec.icon}</span>
                          {sec.label}
                        </div>
                      )}
                      <div className="rk-section-body rk-md">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({ href, children }) => (
                              <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                            ),
                          }}
                        >
                          {sec.body}
                        </ReactMarkdown>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rk-result-body rk-md" style={{ padding: '0 4px' }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => (
                          <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
                        ),
                      }}
                    >
                      {result}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </section>
          )}

        </div>
      </AppShell>
    </>
  )
}
