import Head from 'next/head'
import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'

export default function ProfilPage() {
  const [visible, setVisible] = useState(false)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 200)
    const hide = setTimeout(() => {
      setExiting(true)
      setTimeout(() => setVisible(false), 400)
    }, 4200)
    return () => { clearTimeout(show); clearTimeout(hide) }
  }, [])

  return (
    <>
      <Head>
        <title>Profil — NusaNara</title>
        <style>{`
          .pf-cs-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 420px;
            text-align: center;
            gap: 20px;
            padding: 40px 20px;
          }

          .pf-cs-icon {
            width: 72px;
            height: 72px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 22px;
            border: 1px solid rgba(255,153,51,0.2);
            background: rgba(255,153,51,0.07);
            color: hsl(35,100%,60%);
            margin-bottom: 4px;
          }

          .pf-cs-title {
            font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
            font-size: clamp(1.9rem, 4vw, 2.8rem);
            font-weight: 400;
            color: rgba(255,255,255,0.9);
            letter-spacing: -0.8px;
            line-height: 1.1;
            margin: 0;
          }

          .pf-cs-title span {
            color: rgba(255,255,255,0.28);
          }

          .pf-cs-sub {
            font-size: 13px;
            color: rgba(255,255,255,0.38);
            line-height: 1.7;
            max-width: 340px;
          }

          .pf-cs-badge {
            display: inline-flex;
            align-items: center;
            gap: 7px;
            padding: 6px 14px;
            border-radius: 999px;
            border: 1px solid rgba(255,153,51,0.2);
            background: rgba(255,153,51,0.07);
            color: hsl(35,100%,60%);
            font-size: 10px;
            font-weight: 600;
            letter-spacing: .12em;
            text-transform: uppercase;
          }

          .pf-cs-dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: hsl(35,100%,60%);
            box-shadow: 0 0 8px rgba(255,153,51,0.6);
            animation: pf-pulse 2s ease infinite;
          }

          @keyframes pf-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }

          /* ── Snackbar toast ── */
          .pf-toast {
            position: fixed;
            top: 28px;
            left: 50%;
            transform: translateX(-50%) translateY(0);
            z-index: 999;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px 20px;
            background: rgba(7, 24, 48, 0.94);
            border: 1px solid rgba(255,255,255,0.12);
            border-radius: 14px;
            backdrop-filter: blur(24px);
            -webkit-backdrop-filter: blur(24px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08);
            color: rgba(255,255,255,0.88);
            font-size: 13px;
            white-space: nowrap;
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
            transition: opacity 0.35s ease, transform 0.35s ease;
            pointer-events: none;
          }

          .pf-toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }

          .pf-toast.hide {
            opacity: 0;
            transform: translateX(-50%) translateY(-10px);
          }

          .pf-toast-icon {
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            background: rgba(255,153,51,0.12);
            color: hsl(35,100%,60%);
            flex-shrink: 0;
          }
        `}</style>
      </Head>

      <AppShell active="/profil" topbarTitle="Profil">
        <div className="pf-cs-wrap nn-a0">
          <div className="pf-cs-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 32 }}>construction</span>
          </div>

          <div className="pf-cs-badge">
            <div className="pf-cs-dot" />
            Segera Hadir
          </div>

          <h1 className="pf-cs-title">
            Fitur dalam<br /><span>pengembangan.</span>
          </h1>

          <p className="pf-cs-sub">
            Halaman profil sedang kami bangun. Kamu akan bisa mengelola informasi, skill, dan preferensi karier di sini.
          </p>
        </div>
      </AppShell>

      {visible && (
        <div className={`pf-toast ${exiting ? 'hide' : 'show'}`}>
          <div className="pf-toast-icon">
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>schedule</span>
          </div>
          Halaman ini sedang dalam pengembangan
        </div>
      )}
    </>
  )
}
