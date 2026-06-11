import { NavLink, Outlet } from 'react-router-dom'
import { useTheme } from '../lib/theme'

const tabs = [
  { to: '/', label: 'Today', end: true },
  { to: '/dashboard', label: 'Stats' },
  { to: '/metrics', label: 'Metrics' },
  { to: '/challenges', label: 'Rivals' },
  { to: '/profile', label: 'Profile' },
]

export default function Layout() {
  const { theme, toggle } = useTheme()

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-border bg-surface/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold tracking-tight">
            Sweat<span className="text-accent">Rivals</span>
          </span>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-bg"
          >
            {theme === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-surface">
        <div className="mx-auto flex max-w-3xl">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `flex-1 py-3 text-center text-sm font-medium ${
                  isActive ? 'text-accent' : 'text-muted hover:text-fg'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
