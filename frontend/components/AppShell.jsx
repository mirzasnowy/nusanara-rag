import Link from 'next/link'

const AVATAR_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuASWbYZQ3YBCgqY2_JHCdONborxOnZWXQ8Vx-Ygx5FzCVYPMgitwmaiZ-Yeqp6XkQHAupwrQTgcxv8xzVRPyJ7E0D7Q4m0cdzg8n0NZSfRQ2fNicfT3BdBMiwmOep91_gdBh4CmY4Q4gmK2zRuKxYiaXpnEtYC-ax8beOSBvhiiVsPNovO-EffecRz-BdikecfIfG74v6ShRf4Kdr2ntP5L32-FsLZrc-xbwVaxik3kCZcs5-w2tYvW8wr3k4Y7Fkz1hlTYWrb-UwcY'

const NAV_ITEMS = [
  { href: '/dashboard',    icon: 'grid_view',     label: 'Dashboard'    },
  { href: '/rekomendasi',  icon: 'auto_awesome',  label: 'Rekomendasi'  },
  { href: '/riwayat',      icon: 'history',       label: 'Riwayat'      },
  { href: '/profil',       icon: 'person_outline', label: 'Profil'      },
]

export default function AppShell({ active, topbarTitle, topbarRight, children }) {
  return (
    <div className="nn-shell">

      {/* ── SIDEBAR RAIL ── */}
      <nav className="nn-sidebar">
        <div className="nn-logo">N</div>

        <div className="nn-nav">
          {NAV_ITEMS.map(item => (
            <Link key={item.label} href={item.href}
              className={`nn-nav-link${item.href === active ? ' nn-active' : ''}`}>
              <span className="material-symbols-outlined nn-nav-icon"
                style={item.href === active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              <span className="nn-nav-label">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="nn-sidebar-foot">
          <Link href="/auth" className="nn-nav-link">
            <span className="material-symbols-outlined nn-nav-icon">logout</span>
            <span className="nn-nav-label">Keluar</span>
          </Link>
          <div className="nn-avatar-row">
            <div className="nn-avatar">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_URL} alt="Avatar" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
            <div className="nn-avatar-info">
              <div className="nn-avatar-name">Mahasiswa UNSIKA</div>
              <div className="nn-avatar-role">Career Explorer</div>
            </div>
          </div>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main className="nn-main">
        <header className="nn-topbar">
          <div>
            <div className="nn-topbar-title">{topbarTitle}</div>
          </div>
          <div className="nn-topbar-right">
            {topbarRight || (
              <>
                <button className="nn-icon-btn">
                  <span className="material-symbols-outlined" style={{ fontSize:18 }}>notifications</span>
                </button>
                <button className="nn-icon-btn">
                  <span className="material-symbols-outlined" style={{ fontSize:18 }}>settings</span>
                </button>
              </>
            )}
          </div>
        </header>
        <div className="nn-canvas">
          {children}
        </div>
      </main>

      <style>{`
        /* ── DESIGN TOKENS (navy, matches index + auth) ── */
        :root {
          --nn-bg:       #04111E;
          --nn-surface:  #071828;
          --nn-surface2: rgba(255,255,255,0.04);
          --nn-border:   rgba(255,255,255,0.07);
          --nn-border2:  rgba(255,255,255,0.04);
          --nn-accent:   hsl(35,100%,60%);
          --nn-accent2:  hsl(35,100%,72%);
          --nn-text:     rgba(255,255,255,0.92);
          --nn-muted:    rgba(255,255,255,0.45);
          --nn-faint:    rgba(255,255,255,0.2);
          --nn-glass:    rgba(255,255,255,0.03);
          --nn-font-serif: 'Instrument Serif', serif;
          --nn-font-sans:  'Inter', sans-serif;
        }

        .nn-shell {
          font-family: var(--nn-font-sans);
          background: var(--nn-bg);
          color: var(--nn-text);
          min-height: 100vh;
          display: flex;
          overflow: hidden;
        }

        /* ── SIDEBAR ── */
        .nn-sidebar {
          width: 68px;
          min-height: 100vh;
          background: #050F1C;
          border-right: 1px solid var(--nn-border2);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 0;
          position: fixed;
          left: 0; top: 0;
          z-index: 50;
          transition: width 0.35s cubic-bezier(0.16,1,0.3,1);
          overflow: hidden;
        }
        .nn-sidebar:hover { width: 220px; }

        .nn-logo {
          width: 38px; height: 38px;
          border-radius: 11px;
          background: linear-gradient(135deg, hsl(35,100%,60%) 0%, hsl(25,100%,48%) 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: var(--nn-font-serif);
          font-size: 18px; color: #04111E; font-weight: 400;
          flex-shrink: 0;
          margin-bottom: 32px;
          box-shadow: 0 4px 20px rgba(255,153,51,0.25);
        }

        .nn-nav {
          width: 100%; flex: 1;
          display: flex; flex-direction: column; gap: 2px;
          padding: 0 10px;
        }

        .nn-nav-link {
          display: flex; align-items: center; gap: 13px;
          padding: 10px 14px; border-radius: 10px;
          color: var(--nn-muted);
          font-size: 13px; font-weight: 500;
          white-space: nowrap; text-decoration: none;
          transition: all 0.2s ease;
          position: relative; overflow: hidden;
        }
        .nn-nav-link:hover { color: var(--nn-text); background: rgba(255,255,255,0.05); }
        .nn-nav-link.nn-active {
          color: var(--nn-accent);
          background: rgba(255,153,51,0.08);
        }
        .nn-nav-link.nn-active::before {
          content: '';
          position: absolute; left: 0; top: 50%;
          transform: translateY(-50%);
          width: 2px; height: 18px;
          background: var(--nn-accent);
          border-radius: 0 2px 2px 0;
        }

        .nn-nav-icon { font-size: 20px; flex-shrink: 0; }
        .nn-nav-label { opacity: 0; transition: opacity 0.2s; flex-shrink: 0; }
        .nn-sidebar:hover .nn-nav-label { opacity: 1; }

        .nn-sidebar-foot {
          padding: 0 10px; width: 100%;
        }
        .nn-avatar-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; margin-top: 10px;
        }
        .nn-avatar {
          width: 34px; height: 34px;
          border-radius: 50%; flex-shrink: 0;
          border: 1.5px solid rgba(255,153,51,0.35);
          overflow: hidden;
        }
        .nn-avatar-info { opacity: 0; transition: opacity 0.2s; }
        .nn-sidebar:hover .nn-avatar-info { opacity: 1; }
        .nn-avatar-name { font-size: 12px; font-weight: 600; color: var(--nn-text); white-space: nowrap; }
        .nn-avatar-role { font-size: 10px; color: var(--nn-muted); }

        /* ── MAIN ── */
        .nn-main {
          margin-left: 68px;
          flex: 1;
          min-width: 0;
          min-height: 100vh;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
        }

        .nn-topbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 40px;
          border-bottom: 1px solid var(--nn-border2);
          background: rgba(4,17,30,0.85);
          backdrop-filter: blur(24px);
          position: sticky; top: 0; z-index: 30;
        }
        .nn-topbar-title {
          font-family: var(--nn-font-serif);
          font-size: 22px; font-weight: 400;
          color: var(--nn-text); letter-spacing: -0.3px;
        }
        .nn-topbar-right { display: flex; gap: 8px; }

        .nn-icon-btn {
          width: 34px; height: 34px; border-radius: 8px;
          background: transparent;
          border: 1px solid var(--nn-border);
          color: var(--nn-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s;
        }
        .nn-icon-btn:hover { background: rgba(255,255,255,0.05); color: var(--nn-text); }

        .nn-canvas {
          padding: 36px 40px;
          display: flex; flex-direction: column;
          align-items: center;
          gap: 24px;
          max-width: 1100px; width: 100%;
          margin: 0 auto;
        }
        .nn-canvas > * {
          width: 100%;
        }

        /* ── SHARED CARD ── */
        .nn-card {
          background: var(--nn-glass);
          border: 1px solid var(--nn-border);
          border-radius: 18px;
          backdrop-filter: blur(12px);
          transition: border-color 0.3s, transform 0.3s;
        }
        .nn-card:hover {
          border-color: rgba(255,153,51,0.2);
          transform: translateY(-2px);
        }

        /* ── PANEL ── */
        .nn-panel {
          background: rgba(7,24,40,0.7);
          border: 1px solid var(--nn-border);
          border-radius: 18px;
          padding: 28px;
          backdrop-filter: blur(12px);
        }
        .nn-panel-hd {
          font-size: 10px; text-transform: uppercase;
          letter-spacing: 0.13em; color: var(--nn-muted);
          margin-bottom: 22px;
          display: flex; align-items: center; gap: 8px;
        }
        .nn-panel-hd::after {
          content: ''; flex: 1; height: 1px;
          background: var(--nn-border2);
        }

        /* ── BUTTON PRIMARY ── */
        .nn-btn {
          display: inline-flex; align-items: center; gap: 9px;
          background: var(--nn-accent); color: #04111E;
          padding: 13px 28px; border-radius: 10px;
          font-size: 13px; font-weight: 600;
          border: none; cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16,1,0.3,1);
          font-family: var(--nn-font-sans);
          text-decoration: none;
        }
        .nn-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(255,153,51,0.28);
          filter: brightness(1.05);
        }
        .nn-btn .mi { font-size: 16px; transition: transform 0.25s; }
        .nn-btn:hover .mi { transform: translateX(4px); }

        /* ── ANIMATIONS ── */
        @keyframes nn-fadeUp {
          from { opacity:0; transform: translateY(18px); }
          to   { opacity:1; transform: translateY(0); }
        }
        .nn-a0 { animation: nn-fadeUp 0.55s ease both 0.00s; }
        .nn-a1 { animation: nn-fadeUp 0.55s ease both 0.08s; }
        .nn-a2 { animation: nn-fadeUp 0.55s ease both 0.16s; }
        .nn-a3 { animation: nn-fadeUp 0.55s ease both 0.24s; }
        .nn-a4 { animation: nn-fadeUp 0.55s ease both 0.32s; }
      `}</style>
    </div>
  )
}
