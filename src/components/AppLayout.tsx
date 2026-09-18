import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useBranding } from '../hooks/useBranding'
import { useBusinessModules } from '../hooks/useBusinessModules'
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

function drawerLinkClass(isActive: boolean) {
  return `rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors duration-150 ${
    isActive
      ? 'bg-brand-tint text-brand-dark dark:bg-white/10 dark:text-brand-light'
      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
  }`
}

export default function AppLayout() {
  const { membership, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const labels = useLabels()
  const { data: branding } = useBranding()
  const { data: modules } = useBusinessModules()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  useApplyBranding()

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return
    document.body.style.overflow = 'hidden'
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  const navItems = [
    { to: '/', end: true, label: labels.navDashboard },
    { to: '/pos', end: false, label: labels.navPos },
    ...(modules?.caja !== false ? [{ to: '/caja', end: false, label: labels.navCaja }] : []),
    { to: '/ventas', end: false, label: labels.navVentas },
    ...(modules?.inventario !== false && (membership?.role === 'administrador' || membership?.role === 'gerente')
      ? [{ to: '/inventario', end: false, label: 'Inventario' }]
      : []),
    ...(membership?.role === 'administrador' || membership?.role === 'gerente'
      ? [{ to: '/configuracion', end: false, label: 'Configuración' }]
      : []),
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="flex items-center justify-between gap-2 bg-brand px-3 py-3.5 text-white sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menú de navegación"
            className="-ml-1 rounded-full p-1.5 text-white/70 transition-colors duration-150 hover:bg-white/10 hover:text-white sm:hidden"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
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

      <nav className="hidden gap-6 overflow-x-auto border-b border-gray-200 bg-white px-6 dark:border-gray-700 dark:bg-gray-800 sm:flex">
        {navItems.map(({ to, end, label }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => navLinkClass(isActive)}>
            {label}
          </NavLink>
        ))}
      </nav>

      <div
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 sm:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 max-w-[80%] flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out dark:bg-gray-800 sm:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3.5 dark:border-gray-700">
          <span className="font-platform text-lg font-semibold text-brand-dark dark:text-brand-light">
            RB Suite
          </span>
          <button
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
            className="rounded-full p-1.5 text-gray-500 transition-colors duration-150 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map(({ to, end, label }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => drawerLinkClass(isActive)}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="p-6">
        <div key={location.pathname} className="animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
