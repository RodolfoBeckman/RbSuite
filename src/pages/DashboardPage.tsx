import { useAuth } from '../auth/AuthContext'

export default function DashboardPage() {
  const { membership } = useAuth()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-2 font-serif text-lg font-semibold text-brand-dark">
        Dashboard — {membership?.role ?? 'sin rol asignado'}
      </h2>
      <p className="text-sm text-gray-500">
        Aquí se conectan las métricas reales (ventas del día, stock bajo, cajas abiertas)
        que ya definimos en el prototipo visual, según el rol de la sesión actual.
      </p>
    </div>
  )
}
