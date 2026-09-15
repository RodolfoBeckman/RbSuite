import { NavLink, Outlet, useLocation } from 'react-router-dom'
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

function navLinkClass(isActive: boolean) {
  return `shrink-0 whitespace-nowrap border-b-2 py-3 text-sm font-semibold transition-colors duration-150 ${
    isActive
      ? 'border-brand text-brand-dark dark:border-brand-light dark:text-brand-light'
      : 'border-transparent text-gray-500 hover:text-brand-dark dark:text-gray-400 dark:hover:text-brand-light'
  }`
}

export default function AppLayout() {
  const { membership, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const labels = useLabels()
  const { data: branding } = useBranding()
  const location = useLocation()
  useApplyBranding()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between gap-2 bg-brand px-3 py-3.5 text-white sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <img
            src={branding?.logoUrl ?? '/logo-mark.svg'}
            alt="Logo del negocio"
            className="h-8 w-8 shrink-0 rounded object-contain"
          />
          <span className="font-platform text-xl font-semibold">RB Suite</span>
          <span className="hidden truncate text-sm text-white/75 sm:inline">
            {membership?.branchId ? 'Sucursal asignada' : 'Todas las sucursales'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm sm:gap-4">
          <button
            onClick={toggleTheme}
            aria-label="Cambiar tema"
            className="rounded-full p-1.5 text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span className="hidden text-white/85 sm:inline">
            {membership ? ROLE_LABEL[membership.role] : '—'}
          </span>
          <button
            onClick={signOut}
            className="text-white/70 transition-colors duration-150 hover:text-white"
          >
            Salir
          </button>
        </div>
      </header>

      <nav className="flex gap-6 overflow-x-auto border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800">
        <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)}>
          {labels.navDashboard}
        </NavLink>
        <NavLink to="/pos" className={({ isActive }) => navLinkClass(isActive)}>
          {labels.navPos}
        </NavLink>
        <NavLink to="/caja" className={({ isActive }) => navLinkClass(isActive)}>
          {labels.navCaja}
        </NavLink>
        <NavLink to="/ventas" className={({ isActive }) => navLinkClass(isActive)}>
          {labels.navVentas}
        </NavLink>
        {(membership?.role === 'administrador' || membership?.role === 'gerente') && (
          <NavLink to="/inventario" className={({ isActive }) => navLinkClass(isActive)}>
            Inventario
          </NavLink>
        )}
        {membership?.role === 'administrador' && (
          <NavLink to="/configuracion" className={({ isActive }) => navLinkClass(isActive)}>
            Configuración
          </NavLink>
        )}
      </nav>

      <main className="p-6">
        <div key={location.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
