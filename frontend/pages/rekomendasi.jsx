import Head from 'next/head'
import Link from 'next/link'
import { useState, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import AppShell from '../components/AppShell'
import { getCachedToken } from '../lib/tokenCache'

const MAX = 2000
const TIPS = [
  { icon:'lightbulb', title:'Tips menulis narasi yang baik', gold:true,
    body:'Ceritakan pengalaman spesifik yang membuatmu bangga atau tertantang. Jangan hanya menyebutkan peran — jelaskan apa yang kamu rasakan dan pelajari.' },
  { icon:'visibility', title:'Lihat contoh narasi',
    body:'"Saya merasa paling hidup ketika menyusun strategi kampanye BEM. Meski jurusan saya Akuntansi, saya menyadari ketertarikan saya pada komunikasi publik jauh lebih besar..."', italic:true },
]

export default function RekomendasiPage() {
  const { getToken } = useAuth()
  const [text, setText] = useState('')
  const [openTip, setOpenTip] = useState(null)
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState('')
  const [streamError, setStreamError] = useState('')

  const progress = (text.length / MAX) * 100
  const isReady = text.trim().length > 40 && !loading
  const isWarn  = text.length > MAX - 200

  async function handleAnalyze() {
    if (!isReady) return
    setLoading(true)
    setResult('')
    setStreamError('')
    try {
      // Ambil token eksplisit pakai template "nusanara" (lifetime 100.000 detik)
      const token = await getCachedToken(getToken)  // reuse cache, tidak regenerate tiap klik
      if (!token) throw new Error('Gagal mendapatkan token autentikasi.')

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ narrative: text })
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Request ke backend gagal.')
      }

      // Baca SSE stream dari backend
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // simpan baris tidak lengkap

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') { setLoading(false); return }
          try {
            const parsed = JSON.parse(data)
            if (parsed.content) setResult(prev => prev + parsed.content)
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch (e) {
      setStreamError(e.message || 'Terjadi kesalahan tak terduga.')
      console.error('[handleAnalyze error]', e)
    } finally {
      setLoading(false)
    }
  }


  return (
    <>
      <Head>
        <title>Rekomendasi — NusaNara</title>
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet" />
        <style>{`
          .rk-hd-h {
            font-family: 'Instrument Serif', serif; font-weight: 400;
            font-size: clamp(2rem,4vw,2.8rem); line-height: 1.05;
            letter-spacing: -1.2px; color: rgba(255,255,255,0.92); margin-bottom: 14px;
          }
          .rk-hd-h em { font-style: italic; color: hsl(35,100%,60%); }

          .rk-editor-wrap {
            border-radius: 18px; overflow: hidden; position: relative;
            transition: all 0.4s cubic-bezier(0.16,1,0.3,1);
          }
          .rk-editor-wrap.focused {
            box-shadow: 0 0 0 1px rgba(255,153,51,0.35), 0 0 40px rgba(255,153,51,0.07);
          }
          .rk-editor-wrap:not(.focused) {
            box-shadow: 0 0 0 1px rgba(255,255,255,0.07);
          }
          .rk-editor-glow {
            position: absolute; inset: -2px; border-radius: 20px; z-index: -1;
            pointer-events: none; transition: background 0.4s;
          }
          .rk-editor-wrap.focused .rk-editor-glow {
            background: radial-gradient(ellipse at 50% 0%, rgba(255,153,51,0.1) 0%, transparent 65%);
          }
          .rk-editor-inner {
            background: rgba(7,24,48,0.65);
            backdrop-filter: blur(12px);
            border-radius: 18px;
            display: flex; flex-direction: column;
          }
          .rk-textarea {
            width: 100%; min-height: 300px;
            background: transparent; border: none; outline: none; resize: none;
            font-family: 'Inter', sans-serif; font-size: 15px; line-height: 1.85;
            color: rgba(255,255,255,0.88); padding: 32px;
            caret-color: hsl(35,100%,60%);
          }
          .rk-textarea::placeholder { color: rgba(255,255,255,0.2); }
          .rk-editor-foot {
            display: flex; align-items: center; justify-content: space-between;
            padding: 12px 28px; border-top: 1px solid rgba(255,255,255,0.05);
            background: rgba(255,255,255,0.02);
          }
          .rk-progress-track { flex:1; max-width:140px; height:2px; background:rgba(255,255,255,0.07); border-radius:2px; overflow:hidden; }
          .rk-progress-fill { height:100%; border-radius:2px; background:linear-gradient(90deg,hsl(35,100%,60%),hsl(35,100%,72%)); transition:width .3s ease; }

          .rk-tip {
            background: rgba(7,24,48,0.55); border: 1px solid rgba(255,255,255,0.06);
            border-radius: 14px; overflow: hidden;
            transition: border-color .2s; backdrop-filter: blur(8px);
          }
          .rk-tip:hover { border-color: rgba(255,255,255,0.1); }
          .rk-tip-hd { display:flex;align-items:center;justify-content:space-between;padding:16px 20px;cursor:pointer;user-select:none; }
          .rk-tip-body { font-size:13px;color:rgba(255,255,255,0.4);line-height:1.75;padding:0 20px 18px 46px;display:none; }
          .rk-tip-body.open { display:block; }
          .rk-tip-body.italic-t { font-style:italic; }

          .rk-submit {
            width:100%; padding:18px; border-radius:14px; border:none; cursor:pointer;
            font-family:'Inter',sans-serif; font-size:15px; font-weight:600;
            display:flex; align-items:center; justify-content:center; gap:10px;
            transition: all 0.4s cubic-bezier(0.16,1,0.3,1); position:relative; overflow:hidden;
          }
          .rk-submit.idle { background:rgba(7,24,48,0.6); color:rgba(255,255,255,0.28); border:1px solid rgba(255,255,255,0.07); cursor:not-allowed; }
          .rk-submit.ready { background:hsl(35,100%,60%); color:#04111E; box-shadow:0 8px 32px rgba(255,153,51,0.22); }
          .rk-submit.ready:hover { transform:translateY(-3px); box-shadow:0 16px 44px rgba(255,153,51,0.35); filter:brightness(1.06); }
          .rk-submit .mi { font-size:18px; transition:transform .25s; }
          .rk-submit.ready:hover .mi { transform:translateX(5px); }
        `}</style>
      </Head>

      <AppShell active="/rekomendasi"
        topbarTitle="Rekomendasi"
        topbarRight={
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 14px', borderRadius:20, background:'rgba(255,153,51,0.09)', border:'1px solid rgba(255,153,51,0.18)', fontSize:10, color:'hsl(35,100%,60%)', letterSpacing:'0.08em' }}>
            <span className="material-symbols-outlined" style={{ fontSize:13 }}>auto_awesome</span>
            AI Powered
          </div>
        }>

        <div style={{ maxWidth:680, width:'100%', display:'flex', flexDirection:'column', gap:28 }}>

          {/* Header */}
          <div className="nn-a0" style={{ textAlign:'center' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'4px 14px', borderRadius:20, background:'rgba(255,153,51,0.08)', border:'1px solid rgba(255,153,51,0.15)', fontSize:10, color:'hsl(35,100%,60%)', textTransform:'uppercase', letterSpacing:'0.12em', marginBottom:18 }}>
              <span className="material-symbols-outlined" style={{ fontSize:12 }}>edit_note</span>
              Input Narasi
            </div>
            <h1 className="rk-hd-h">
              Ceritakan tentang <em>dirimu.</em>
            </h1>
            <p style={{ fontSize:14, color:'rgba(255,255,255,0.42)', lineHeight:1.75 }}>
              Semakin jujur dan detail ceritamu, semakin presisi rekomendasi karier yang akan AI temukan untukmu.
            </p>
          </div>

          {/* Textarea */}
          <div className={`rk-editor-wrap nn-a1${focused ? ' focused' : ''}`}>
            <div className="rk-editor-glow" />
            <div className="rk-editor-inner">
              <textarea
                className="rk-textarea"
                maxLength={MAX}
                placeholder="Contoh: Saya mahasiswa Informatika semester 6 yang tertarik dengan data science, namun belakangan saya merasa lebih suka mengelola tim dan proyek. Saya pernah menjadi ketua panitia..."
                value={text}
                onChange={e => setText(e.target.value)}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
              />
              <div className="rk-editor-foot">
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span className="material-symbols-outlined" style={{ fontSize:15, color:'rgba(255,255,255,0.2)' }}>edit_note</span>
                  <div className="rk-progress-track">
                    <div className="rk-progress-fill" style={{ width:`${progress}%` }} />
                  </div>
                </div>
                <div style={{ fontSize:11, color: isWarn ? '#f07050' : 'rgba(255,255,255,0.3)', fontVariantNumeric:'tabular-nums', transition:'color .3s' }}>
                  {text.length.toLocaleString()} / {MAX.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Tips */}
          <div className="nn-a2" style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {TIPS.map((tip, i) => (
              <div key={i} className="rk-tip">
                <div className="rk-tip-hd" onClick={() => setOpenTip(openTip === i ? null : i)}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <span className="material-symbols-outlined" style={{ fontSize:16, color: tip.gold ? 'hsl(35,100%,60%)' : 'rgba(255,255,255,0.4)' }}>{tip.icon}</span>
                    <span style={{ fontSize:13, color:'rgba(255,255,255,0.65)', fontWeight:500 }}>{tip.title}</span>
                  </div>
                  <span className="material-symbols-outlined" style={{ fontSize:17, color:'rgba(255,255,255,0.25)', transition:'transform .25s', transform: openTip === i ? 'rotate(180deg)' : 'none' }}>expand_more</span>
                </div>
                <div className={`rk-tip-body${openTip === i ? ' open' : ''}${tip.italic ? ' italic-t' : ''}`}>
                  {tip.body}
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          <button className={`rk-submit nn-a3${isReady ? ' ready' : ' idle'}`} disabled={!isReady} onClick={handleAnalyze}>
            <span className="material-symbols-outlined mi">{isReady ? 'auto_awesome' : 'lock'}</span>
            {isReady ? 'Dapatkan Rekomendasi AI' : 'Tulis minimal 40 karakter...'}
            {isReady && <span className="material-symbols-outlined mi">arrow_forward</span>}
          </button>
          {/* Loading indicator */}
          {loading && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 0', color:'rgba(255,255,255,0.4)', fontSize:13 }}>
              <span className="material-symbols-outlined" style={{ fontSize:16, animation:'spin 1s linear infinite' }}>progress_activity</span>
              Memproses analisis karier…
            </div>
          )}

          {/* Error */}
          {streamError && (
            <div style={{ padding:'14px 18px', borderRadius:12, background:'rgba(240,80,60,0.1)', border:'1px solid rgba(240,80,60,0.25)', fontSize:13, color:'#f07050' }}>
              ❌ {streamError}
            </div>
          )}

          {/* Streaming result */}
          {result && (
            <div style={{
              background:'rgba(7,24,48,0.65)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:18, padding:'28px 32px', backdropFilter:'blur(12px)'
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, fontSize:11, color:'hsl(35,100%,60%)', textTransform:'uppercase', letterSpacing:'0.1em' }}>
                <span className="material-symbols-outlined" style={{ fontSize:14 }}>auto_awesome</span>
                Hasil Rekomendasi AI
              </div>
              <div style={{ fontSize:14, lineHeight:1.85, color:'rgba(255,255,255,0.78)', whiteSpace:'pre-wrap' }}>
                {result}
              </div>
            </div>
          )}

        </div>

      </AppShell>
    </>
  )
}
