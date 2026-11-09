import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bookmark,
  Folder,
  House,
  Library,
  ListChecks,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react'
import SearchBar from './SearchBar.jsx'
import { useCatalog } from '../lib/catalog.jsx'
import { useTheme } from '../lib/theme.js'
import { areaMeta } from '../lib/areas.jsx'
import { areaPath, cx } from '../lib/utils.js'

const browseLinks = [
  { to: '/', label: 'Home', icon: House, end: true },
  { to: '/library', label: 'Library', icon: Library },
  { to: '/modules', label: 'Modules', icon: Folder },
  { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
  { to: '/progress', label: 'My progress', icon: ListChecks },
]

export default function Layout() {
  const { areas, loading } = useCatalog()
  const { theme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname, location.search])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    const onKey = (e) => {
      if (e.key === 'Escape' && open) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="app-shell">
      <aside className={cx('sidebar', open && 'open')} onClick={() => setOpen(false)}>
        <div className="sidebar-inner">
          <NavLink to="/" className="brand" onClick={() => setOpen(false)}>
            <span className="brand-mark" aria-hidden="true">RV</span>
            <span className="brand-text">
              <span className="brand-name" style={{ display: 'block' }}>Reviewer Vault</span>
              <span className="brand-sub" style={{ display: 'block' }}>Unofficial study library</span>
            </span>
          </NavLink>

          <nav className="nav-section" aria-label="Browse">
            <div className="nav-label">Browse</div>
            <div className="nav-list">
              {browseLinks.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => cx('nav-link', isActive && 'active')}
                >
                  <Icon size={17} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          <nav className="nav-section" aria-label="Subject areas">
            <div className="nav-label">Areas</div>
            <div className="nav-list">
              {loading &&
                !areas.length &&
                [0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="nav-link" style={{ opacity: 0.4 }}>
                    <span className="nav-dot" style={{ background: 'var(--border-strong)' }} />
                    <span>Loading…</span>
                  </div>
                ))}
              {areas.map((area) => {
                const info = areaMeta(area.name)
                return (
                  <NavLink
                    key={area.name}
                    to={areaPath(area.name)}
                    className={({ isActive }) => cx('nav-link', isActive && 'active')}
                  >
                    <span className="nav-dot" style={{ background: info.color }} />
                    <span>{area.name}</span>
                    <span className="nav-count">{area.count}</span>
                  </NavLink>
                )
              })}
            </div>
          </nav>

          <div className="sidebar-footer">
            <div style={{ marginTop: 6 }}>
              Good luck, takers! You've got this. 💪
            </div>
          </div>
        </div>
      </aside>

      {open && <div className="mobile-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />}

      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-inner">
            <button
              type="button"
              className="btn btn-icon menu-btn"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>

            <SearchBar />

            <span className="spacer" />

            <button
              type="button"
              className="btn btn-icon"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
            >
              {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
