import Link from 'next/link'
import { SignOutButton, useUser } from '@clerk/react'

const NAV_ITEMS = [
  { href: '/dashboard', icon: 'grid_view', label: 'Dashboard' },
  { href: '/rekomendasi', icon: 'auto_awesome', label: 'Rekomendasi' },
  { href: '/riwayat', icon: 'history', label: 'Riwayat' },
  { href: '/profil', icon: 'person_outline', label: 'Profil' },
]

export default function AppShell({ active, topbarTitle, topbarRight, children }) {
  const { user } = useUser()
  const displayName = user?.firstName || user?.fullName || 'Pengguna'
  const avatarUrl = user?.imageUrl || null

  return (
    <div className="nn-shell">
      <nav className="nn-sidebar">
        <div className="nn-logo">N</div>

        <div className="nn-nav">
          {NAV_ITEMS.map(item => (
            <Link key={item.href} href={item.href} className={`nn-nav-link${item.href === active ? ' nn-active' : ''}`}>
              <span className="material-symbols-outlined nn-nav-icon" style={item.href === active ? { fontVariationSettings: "'FILL' 1" } : {}}>
                {item.icon}
              </span>
              <span className="nn-nav-label">{item.label}</span>
            </Link>
          ))}
        </div>

        <div className="nn-sidebar-foot">
          <SignOutButton redirectUrl="/auth">
            <button type="button" className="nn-nav-link nn-nav-link-btn">
              <span className="material-symbols-outlined nn-nav-icon">logout</span>
              <span className="nn-nav-label">Keluar</span>
            </button>
          </SignOutButton>
          <div className="nn-avatar-row">
            <div className="nn-avatar">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,153,51,0.15)', color: 'hsl(35,100%,60%)', fontSize: 14, fontWeight: 600, fontFamily: 'var(--nn-font-serif)' }}>
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="nn-avatar-info">
              <div className="nn-avatar-name">{displayName}</div>
              <div className="nn-avatar-role">Career Explorer</div>
            </div>
          </div>
        </div>
      </nav>

      <nav className="nn-mobile-nav" aria-label="Navigasi utama">
        {NAV_ITEMS.filter(item => item.href !== '/profil').map(item => (
          <Link key={item.href} href={item.href} className={`nn-mobile-link${item.href === active ? ' nn-active' : ''}`}>
            <span className="material-symbols-outlined" style={item.href === active ? { fontVariationSettings: "'FILL' 1" } : {}}>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <main className="nn-main">
        <header className="nn-topbar">
          <div className="nn-topbar-title">{topbarTitle}</div>
          <div className="nn-topbar-right">
            {topbarRight || (
              <>
                <button className="nn-icon-btn" type="button" aria-label="Notifikasi">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>notifications</span>
                </button>
                <button className="nn-icon-btn" type="button" aria-label="Pengaturan">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>settings</span>
                </button>
              </>
            )}
            <span className="nn-mobile-logout-wrap">
              <SignOutButton redirectUrl="/auth">
                <button className="nn-icon-btn nn-mobile-logout" type="button" aria-label="Keluar">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
                </button>
              </SignOutButton>
            </span>
          </div>
        </header>

        <div className="nn-canvas">{children}</div>
      </main>

      <style>{`
        :root {
          --nn-bg: #04111E;
          --nn-surface: #071828;
          --nn-border: rgba(255,255,255,0.07);
          --nn-border-soft: rgba(255,255,255,0.04);
          --nn-accent: hsl(35,100%,60%);
          --nn-accent-soft: rgba(255,153,51,0.1);
          --nn-text: rgba(255,255,255,0.92);
          --nn-muted: rgba(255,255,255,0.56);
          --nn-faint: rgba(255,255,255,0.3);
          --nn-glass: rgba(255,255,255,0.035);
          --nn-liquid-bg: rgba(7,24,40,0.38);
          --nn-liquid-bg-soft: rgba(7,24,40,0.26);
          --nn-liquid-border: rgba(255,255,255,0.12);
          --nn-font-serif: 'Instrument Serif', ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
          --nn-font-sans: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .nn-shell {
          min-height: 100vh;
          display: flex;
          background:
            radial-gradient(circle at 18% 0%, rgba(255,153,51,0.055), transparent 28%),
            radial-gradient(circle at 96% 12%, rgba(255,255,255,0.035), transparent 24%),
            var(--nn-bg);
          color: var(--nn-text);
          font-family: var(--nn-font-sans);
          font-weight: 400;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .nn-sidebar {
          position: fixed;
          left: 0;
          top: 0;
          z-index: 50;
          width: 72px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 22px 0;
          overflow: hidden;
          border-right: 1px solid var(--nn-border-soft);
          background: rgba(5,15,28,0.96);
          transition: width 0.32s cubic-bezier(0.16,1,0.3,1);
        }

        .nn-sidebar:hover {
          width: 220px;
        }

        .nn-logo {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-bottom: 30px;
          border-radius: 11px;
          background: linear-gradient(135deg, hsl(35,100%,60%), hsl(25,100%,48%));
          color: #04111E;
          font-family: var(--nn-font-serif);
          font-size: 18px;
          box-shadow: 0 4px 20px rgba(255,153,51,0.24);
        }

        .nn-nav {
          width: 100%;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 3px;
          padding: 0 10px;
        }

        .nn-nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 13px;
          min-height: 42px;
          padding: 10px 14px;
          overflow: hidden;
          border-radius: 11px;
          color: var(--nn-muted);
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.2s ease, background 0.2s ease;
        }

        .nn-nav-link-btn {
          width: 100%;
          border: 0;
          background: transparent;
          font-family: inherit;
          cursor: pointer;
          text-align: left;
        }

        .nn-nav-link:hover {
          color: var(--nn-text);
          background: rgba(255,255,255,0.05);
        }

        .nn-nav-link.nn-active {
          color: var(--nn-accent);
          background: var(--nn-accent-soft);
        }

        .nn-nav-link.nn-active::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          width: 2px;
          height: 18px;
          border-radius: 0 2px 2px 0;
          background: var(--nn-accent);
          transform: translateY(-50%);
        }

        .nn-nav-icon {
          flex-shrink: 0;
          font-size: 20px;
        }

        .nn-nav-label {
          opacity: 0;
          transition: opacity 0.18s ease;
        }

        .nn-sidebar:hover .nn-nav-label,
        .nn-sidebar:hover .nn-avatar-info {
          opacity: 1;
        }

        .nn-sidebar-foot {
          width: 100%;
          padding: 0 10px;
        }

        .nn-avatar-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          margin-top: 8px;
        }

        .nn-avatar {
          width: 34px;
          height: 34px;
          flex-shrink: 0;
          overflow: hidden;
          border: 1.5px solid rgba(255,153,51,0.35);
          border-radius: 999px;
        }

        .nn-avatar-info {
          opacity: 0;
          transition: opacity 0.18s ease;
        }

        .nn-avatar-name {
          color: var(--nn-text);
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
        }

        .nn-avatar-role {
          color: var(--nn-muted);
          font-size: 10px;
          white-space: nowrap;
        }

        .nn-mobile-nav {
          display: none;
        }

        .nn-mobile-logout-wrap {
          display: none;
        }

        .nn-main {
          min-width: 0;
          min-height: 100vh;
          flex: 1;
          display: flex;
          flex-direction: column;
          margin-left: 72px;
        }

        .nn-topbar {
          position: sticky;
          top: 0;
          z-index: 30;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 18px 32px;
          border-bottom: 1px solid var(--nn-border-soft);
          background: rgba(4,17,30,0.86);
          backdrop-filter: blur(24px);
        }

        .nn-topbar-title {
          color: var(--nn-text);
          font-family: var(--nn-font-sans);
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.1px;
          line-height: 1.3;
        }

        .nn-topbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nn-icon-btn {
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid var(--nn-border);
          border-radius: 9px;
          background: transparent;
          color: var(--nn-muted);
          cursor: pointer;
          transition: background 0.2s ease, color 0.2s ease;
        }

        .nn-icon-btn:hover {
          background: rgba(255,255,255,0.05);
          color: var(--nn-text);
        }

        .nn-canvas {
          width: 100%;
          max-width: 1180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 24px;
          margin: 0 auto;
          padding: 28px 32px 44px;
        }

        .nn-canvas > * {
          width: 100%;
        }

        .nn-card,
        .nn-panel {
          position: relative;
          overflow: hidden;
          border: 1px solid var(--nn-liquid-border);
          background: var(--nn-liquid-bg);
          backdrop-filter: blur(26px) saturate(128%);
          -webkit-backdrop-filter: blur(26px) saturate(128%);
          box-shadow:
            0 18px 48px rgba(0,0,0,0.18),
            inset 0 1px 0 rgba(255,255,255,0.10),
            inset 0 -1px 0 rgba(0,0,0,0.18);
        }

        .nn-card::before,
        .nn-panel::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background:
            linear-gradient(135deg, rgba(255,255,255,0.075), transparent 34%, rgba(255,255,255,0.025) 72%, transparent);
          pointer-events: none;
        }

        .nn-card > *,
        .nn-panel > * {
          position: relative;
          z-index: 1;
        }

        .nn-card {
          border-radius: 16px;
          transition: border-color 0.25s ease, transform 0.25s ease;
        }

        .nn-card:hover {
          border-color: rgba(255,153,51,0.2);
          transform: translateY(-2px);
        }

        .nn-panel {
          border-radius: 16px;
          padding: 24px;
        }

        .nn-panel-hd {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 18px;
          color: var(--nn-muted);
          font-size: 10px;
          letter-spacing: 0.13em;
          text-transform: uppercase;
        }

        .nn-panel-hd::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--nn-border-soft);
        }

        .nn-btn {
          min-height: 42px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 0;
          border-radius: 10px;
          background: var(--nn-accent);
          color: #04111E;
          cursor: pointer;
          font-family: var(--nn-font-sans);
          font-size: 13px;
          font-weight: 600;
          padding: 12px 20px;
          text-decoration: none;
          transition: transform 0.25s ease, box-shadow 0.25s ease, filter 0.25s ease;
        }

        .nn-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(255,153,51,0.28);
          filter: brightness(1.05);
        }

        .nn-btn .mi {
          font-size: 16px;
          transition: transform 0.2s ease;
        }

        .nn-btn:hover .mi {
          transform: translateX(3px);
        }

        @keyframes nn-fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .nn-a0 { animation: nn-fadeUp 0.5s ease both 0s; }
        .nn-a1 { animation: nn-fadeUp 0.5s ease both 0.07s; }
        .nn-a2 { animation: nn-fadeUp 0.5s ease both 0.14s; }
        .nn-a3 { animation: nn-fadeUp 0.5s ease both 0.21s; }
        .nn-a4 { animation: nn-fadeUp 0.5s ease both 0.28s; }

        @media (max-width: 900px) {
          .nn-shell {
            display: block;
            padding-bottom: 76px;
          }

          .nn-sidebar {
            display: none;
          }

          .nn-mobile-nav {
            position: fixed;
            left: 12px;
            right: 12px;
            bottom: 12px;
            z-index: 80;
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px;
            padding: 7px;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 18px;
            background: rgba(5,15,28,0.92);
            backdrop-filter: blur(24px);
            box-shadow: 0 18px 45px rgba(0,0,0,0.35);
          }

          .nn-mobile-link {
            min-width: 0;
            height: 52px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            border-radius: 13px;
            color: rgba(255,255,255,0.46);
            font-size: 10px;
            font-weight: 600;
            text-decoration: none;
          }

          .nn-mobile-link .material-symbols-outlined {
            font-size: 20px;
          }

          .nn-mobile-link.nn-active {
            background: rgba(255,153,51,0.12);
            color: var(--nn-accent);
          }

          .nn-mobile-logout-wrap {
            display: inline-flex;
          }

          .nn-mobile-logout {
            border-color: rgba(255,153,51,0.16);
            background: rgba(255,153,51,0.08);
            color: var(--nn-accent);
          }

          .nn-main {
            margin-left: 0;
          }

          .nn-topbar {
            padding: 14px 18px;
          }

          .nn-topbar-title {
            font-size: 13px;
          }

          .nn-canvas {
            max-width: 720px;
            padding: 22px 16px 24px;
            gap: 18px;
          }

          .nn-panel {
            padding: 18px;
            border-radius: 14px;
          }
        }

        @media (max-width: 520px) {
          .nn-topbar {
            align-items: flex-start;
          }

          .nn-canvas {
            padding-left: 12px;
            padding-right: 12px;
          }
        }
      `}</style>
    </div>
  )
}
