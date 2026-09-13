import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const ROLE_LABEL: Record<string, string> = {
  administrador: 'Administrador',
  gerente: 'Gerente',
  vendedor: 'Vendedor',
}

export default function AppLayout() {
  const { membership, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between bg-brand px-6 py-3.5 text-white">
        <div className="flex items-baseline gap-2.5">
          <span className="font-serif text-xl font-semibold">RB Suite</span>
          <span className="text-sm text-white/75">
            {membership?.branchId ? 'Sucursal asignada' : 'Todas las sucursales'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white/85">
            {membership ? ROLE_LABEL[membership.role] : '—'}
          </span>
          <button onClick={signOut} className="text-white/70 hover:text-white">
            Salir
          </button>
        </div>
      </header>

      <nav className="flex gap-6 border-b border-gray-200 bg-white px-6">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `border-b-2 py-3 text-sm font-semibold ${
              isActive ? 'border-brand text-brand-dark' : 'border-transparent text-gray-500'
            }`
          }
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/pos"
          className={({ isActive }) =>
            `border-b-2 py-3 text-sm font-semibold ${
              isActive ? 'border-brand text-brand-dark' : 'border-transparent text-gray-500'
            }`
          }
        >
          Punto de venta
        </NavLink>
        <NavLink
          to="/caja"
          className={({ isActive }) =>
            `border-b-2 py-3 text-sm font-semibold ${
              isActive ? 'border-brand text-brand-dark' : 'border-transparent text-gray-500'
            }`
          }
        >
          Caja
        </NavLink>
      </nav>

      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
