import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useBranding } from '../hooks/useBranding'
import { useLabels } from '../hooks/useLabels'
import { useTheme } from '../theme/ThemeContext'
import { useApplyBranding } from '../theme/useApplyBranding'

const ROLE_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

export default function AppLayout() {
  const { membership, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const labels = useLabels()
  const { data: branding } = useBranding()
  useApplyBranding()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between bg-brand px-6 py-3.5 text-white">
        <div className="flex items-center gap-2.5">
          <img
            src={branding?.logoUrl ?? '/logo-mark.svg'}
            alt="Logo del negocio"
            className="h-8 w-8 rounded object-contain"
          />
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
        <NavLink
          to="/ventas"
          className={({ isActive }) =>
            `border-b-2 py-3 text-sm font-semibold ${
              isActive
                ? 'border-brand text-brand-dark dark:border-brand-light dark:text-brand-light'
                : 'border-transparent text-gray-500 dark:text-gray-400'
            }`
          }
        >
          {labels.navVentas}
        </NavLink>
        {(membership?.role === 'administrador' || membership?.role === 'gerente') && (
          <NavLink
            to="/inventario"
            className={({ isActive }) =>
              `border-b-2 py-3 text-sm font-semibold ${
                isActive
                  ? 'border-brand text-brand-dark dark:border-brand-light dark:text-brand-light'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              }`
            }
          >
            Inventario
          </NavLink>
        )}
        {membership?.role === 'administrador' && (
          <NavLink
            to="/configuracion"
            className={({ isActive }) =>
              `border-b-2 py-3 text-sm font-semibold ${
                isActive
                  ? 'border-brand text-brand-dark dark:border-brand-light dark:text-brand-light'
                  : 'border-transparent text-gray-500 dark:text-gray-400'
              }`
            }
          >
            Configuración
          </NavLink>
        )}
      </nav>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
