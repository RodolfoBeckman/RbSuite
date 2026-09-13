import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useLabels } from '../hooks/useLabels'
import { useTheme } from '../theme/ThemeContext'

const ROLE_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

export default function AppLayout() {
  const { membership, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const labels = useLabels()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between bg-brand px-6 py-3.5 text-white">
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif text-xl font-semibold">RB Suite</span>
          <span className="text-sm text-white/75">
            {membership?.branchId ? 'Sucursal asignada' : 'Todas las sucursales'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span className="text-white/85">
            {membership ? ROLE_LABEL[membership.role] : '—'}
          </span>
          <button onClick={signOut} className="text-white/70 hover:text-white">
            Salir
          </button>
        </div>
      </header>

      <nav className="flex gap-6 border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `border-b-2 py-3 text-sm font-semibold ${
              isActive
                ? 'border-brand text-brand-dark dark:border-brand-light dark:text-brand-light'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`
          }
        >
          {labels.navDashboard}
        </NavLink>
        <NavLink
          to="/pos"
          className={({ isActive }) =>
            `border-b-2 py-3 text-sm font-semibold ${
              isActive
                ? 'border-brand text-brand-dark dark:border-brand-light dark:text-brand-light'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`
          }
        >
          {labels.navPos}
        </NavLink>
        <NavLink
          to="/caja"
          className={({ isActive }) =>
            `border-b-2 py-3 text-sm font-semibold ${
              isActive
                ? 'border-brand text-brand-dark dark:border-brand-light dark:text-brand-light'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`
          }
        >
          {labels.navCaja}
        </NavLink>
      </nav>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
