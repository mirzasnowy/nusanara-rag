import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { SignInButton, SignUpButton, useAuth } from '@clerk/react'

const VIDEO_SRC = 'https://res.cloudinary.com/dzyfjpnjg/video/upload/f_auto,q_auto/v1777679367/0219e81c-80bb-4395-a88a-030f78c129cc.mp4_rzl0ls.mp4'

export default function AuthPage() {
  const router = useRouter()
  const [mode, setMode] = useState('signin')
  const { isSignedIn } = useAuth()
  const isSignup = mode === 'signup'

  useEffect(() => {
    if (isSignedIn) router.replace('/dashboard')
  }, [isSignedIn, router])

  return (
    <>
      <Head>
        <title>{isSignup ? 'Daftar - NusaNara' : 'Masuk - NusaNara'}</title>
      </Head>

      <style jsx global>{`
        .auth-page {
          min-height: 100vh;
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: #030c1c;
          overflow: hidden;
        }

        /* ── Left: Video column ─────────────────────────── */
        .auth-media {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
        }

        .auth-media video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .auth-media::after {
          content: '';
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, transparent 55%, rgba(3,12,28,.85) 100%),
            linear-gradient(0deg, rgba(3,12,28,.55) 0%, transparent 50%);
        }

        .auth-brand {
          position: relative;
          z-index: 2;
          padding: 3.5rem;
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .brand-link {
          display: inline-flex;
          align-items: center;
          gap: .4rem;
          color: rgba(255,255,255,.4);
          text-decoration: none;
          font-size: .68rem;
          letter-spacing: .14em;
          text-transform: uppercase;
          transition: color .2s;
          width: max-content;
        }
        .brand-link:hover { color: rgba(255,255,255,.8); }

        .brand-title {
          margin-top: auto;
          font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
          font-size: clamp(2.6rem, 4.5vw, 4.4rem);
          line-height: .96;
          font-weight: 400;
          letter-spacing: -2px;
          color: #fff;
          text-shadow: 0 2px 24px rgba(0,0,0,.4);
        }
        .brand-title em {
          color: rgba(255,255,255,.38);
          font-style: normal;
        }

        .brand-copy {
          margin-top: 1.25rem;
          margin-bottom: 3rem;
          color: rgba(255,255,255,.38);
          font-size: .82rem;
          line-height: 1.75;
          max-width: 24rem;
        }

        /* ── Right: liquid glass panel ──────────────────── */
        .auth-panel {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          padding: 2.5rem 2rem;
          background:
            radial-gradient(ellipse 70% 50% at 75% 15%, rgba(96,165,250,.09) 0%, transparent 65%),
            radial-gradient(ellipse 60% 60% at 15% 80%, rgba(30,64,175,.1) 0%, transparent 65%),
            rgba(6, 13, 28, 0.35);
          backdrop-filter: blur(56px) saturate(180%);
          -webkit-backdrop-filter: blur(56px) saturate(180%);
          border-left: 1px solid rgba(255,255,255,.08);
        }

        /* ── Glass card ─────────────────────────────────── */
        .auth-card {
          width: min(100%, 340px);
          background:
            radial-gradient(ellipse 65% 55% at 8% 22%,  rgba(147,197,253,.22) 0%, transparent 60%),
            radial-gradient(ellipse 48% 62% at 90% 6%,  rgba(186,230,255,.16) 0%, transparent 58%),
            radial-gradient(ellipse 72% 52% at 58% 98%, rgba(59,130,246,.24) 0%, transparent 62%),
            radial-gradient(ellipse 52% 48% at 88% 68%, rgba(96,165,250,.14) 0%, transparent 55%),
            radial-gradient(ellipse 55% 60% at 30% 58%, rgba(30,64,175,.18) 0%, transparent 60%),
            rgba(8, 18, 42, 0.72);
          backdrop-filter: blur(40px) saturate(180%);
          -webkit-backdrop-filter: blur(40px) saturate(180%);
          border: 1px solid rgba(147,197,253,.22);
          border-radius: 32px;
          padding: 2.4rem 2rem;
          box-shadow:
            inset 0 2px 0 rgba(186,230,255,.2),
            inset 1px 0 0 rgba(147,197,253,.1),
            0 32px 64px rgba(0,0,0,.5),
            0 8px 16px rgba(0,0,0,.25);
        }

        /* ── Brand row ──────────────────────────────────── */
        .auth-brand-row {
          display: flex;
          align-items: center;
          gap: .55rem;
          margin-bottom: 1.75rem;
        }

        .auth-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: linear-gradient(135deg, #fff 0%, hsl(35, 100%, 62%) 100%);
          box-shadow: 0 0 10px rgba(255, 153, 51, .5), 0 0 0 3px rgba(255, 153, 51, .08);
        }

        .auth-wordmark {
          font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
          font-size: .65rem;
          letter-spacing: .2em;
          text-transform: uppercase;
          color: rgba(255,255,255,.5);
        }

        /* ── Heading + subtitle ─────────────────────────── */
        .auth-head { margin-bottom: 1.75rem; }

        .auth-heading {
          margin: 0 0 .55rem;
          font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
          font-size: clamp(1.9rem, 3vw, 2.3rem);
          line-height: 1.06;
          font-weight: 400;
          letter-spacing: -.8px;
          color: rgba(255,255,255,.94);
        }
        .auth-heading span { color: rgba(255,255,255,.3); }

        .auth-sub {
          font-size: .78rem;
          color: rgba(255,255,255,.42);
          line-height: 1.55;
          letter-spacing: .005em;
        }

        /* ── Toggle ─────────────────────────────────────── */
        .auth-toggle {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: .2rem;
          padding: .2rem;
          margin-bottom: 1rem;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 14px;
          background: rgba(0,0,0,.18);
        }

        .auth-toggle button {
          height: 2.35rem;
          border: 1px solid transparent;
          border-radius: 11px;
          background: transparent;
          color: rgba(255,255,255,.32);
          font: 500 .78rem ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
          cursor: pointer;
          transition: all .18s;
          letter-spacing: .03em;
        }

        .auth-toggle button:not(.active):hover {
          background: rgba(255,255,255,.06);
          color: rgba(255,255,255,.62);
        }

        .auth-toggle button.active {
          background: rgba(255,255,255,.12);
          border-color: rgba(255,255,255,.15);
          color: rgba(255,255,255,.9);
          box-shadow: inset 0 1px 0 rgba(255,255,255,.15);
        }

        /* ── CTA ────────────────────────────────────────── */
        .auth-cta {
          width: 100%;
          margin-bottom: 1.75rem;
        }

        .auth-cta button {
          width: 100%;
          height: 3rem;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: .5rem;
          border: none;
          border-radius: 14px;
          background: rgba(255,255,255,.95);
          color: #06111f;
          font: 600 .85rem ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
          cursor: pointer;
          letter-spacing: .02em;
          box-shadow: 0 4px 16px rgba(0,0,0,.25), inset 0 1px 0 #fff;
          transition: background .18s, transform .2s, box-shadow .2s;
        }

        .auth-cta button svg {
          width: 14px;
          height: 14px;
          transition: transform .25s cubic-bezier(.34,1.56,.64,1);
        }

        .auth-cta button:hover {
          background: #fff;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,0,0,.3), inset 0 1px 0 #fff;
        }

        .auth-cta button:hover svg { transform: translateX(3px); }

        .auth-cta button:active {
          transform: translateY(0);
          box-shadow: 0 2px 8px rgba(0,0,0,.2);
        }

        /* ── Trust icon ─────────────────────────────────── */
        .auth-trust {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }

        .auth-trust svg {
          width: 12px;
          height: 12px;
          color: hsl(35, 100%, 62%);
          opacity: .7;
        }

        /* ── Divider ────────────────────────────────────── */
        .auth-divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.1), transparent);
          margin-bottom: 1.1rem;
        }

        /* ── Footer ─────────────────────────────────────── */
        .auth-foot {
          text-align: center;
        }

        .auth-foot a {
          font-size: .68rem;
          color: rgba(255,255,255,.25);
          text-decoration: none;
          letter-spacing: .06em;
          transition: color .2s;
        }
        .auth-foot a:hover { color: rgba(255,255,255,.55); }

        /* ── Responsive ─────────────────────────────────── */
        @media (max-width: 860px) {
          .auth-page { grid-template-columns: 1fr; }
          .auth-media { display: none; }
          .auth-panel { border-left: none; }
        }
      `}</style>

      <div className="auth-page">

        <section className="auth-media" aria-hidden="true">
          <video autoPlay loop muted playsInline>
            <source src={VIDEO_SRC} type="video/mp4" />
          </video>
          <div className="auth-brand">
            <Link href="/" className="brand-link">← Beranda</Link>
            <h1 className="brand-title">
              Temukan Jalur<br />
              <em>Kariermu.</em>
            </h1>
            <p className="brand-copy">
              Simpan rekomendasi, riwayat analisis, dan eksplorasi karier dalam satu akun.
            </p>
          </div>
        </section>

        <main className="auth-panel">
          <section className="auth-card">

            <div className="auth-head">
              <h2 className="auth-heading">
                {isSignup ? 'Buat akun.' : 'Selamat datang.'}
              </h2>
              <p className="auth-sub">
                {isSignup
                  ? 'Daftar untuk mulai eksplorasi rekomendasi karier.'
                  : 'Masuk untuk lanjut ke dashboard kamu.'}
              </p>
            </div>

            <div className="auth-toggle" role="tablist">
              <button
                type="button"
                className={!isSignup ? 'active' : ''}
                onClick={() => setMode('signin')}
                role="tab"
                aria-selected={!isSignup}
              >
                Masuk
              </button>
              <button
                type="button"
                className={isSignup ? 'active' : ''}
                onClick={() => setMode('signup')}
                role="tab"
                aria-selected={isSignup}
              >
                Daftar
              </button>
            </div>

            <div className="auth-cta">
              {isSignup ? (
                <SignUpButton mode="modal" forceRedirectUrl="/dashboard">
                  <button type="button">
                    <span>Daftar</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </SignUpButton>
              ) : (
                <SignInButton mode="modal" forceRedirectUrl="/dashboard">
                  <button type="button">
                    <span>Masuk</span>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </button>
                </SignInButton>
              )}
            </div>


            <div className="auth-foot">
              <Link href="/">← Kembali ke beranda</Link>
            </div>

          </section>
        </main>

      </div>
    </>
  )
}
