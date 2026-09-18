import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { useBusinessModules, type BusinessModules } from '../hooks/useBusinessModules'
import type { RoleName } from '../types'

interface Props {
  allowedRoles?: RoleName[]
  requiredModule?: keyof BusinessModules
}

export function ProtectedRoute({ allowedRoles, requiredModule }: Props) {
  const { session, membership, loading } = useAuth()
  const { data: modules } = useBusinessModules()

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Cargando…</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && membership && !allowedRoles.includes(membership.role)) {
    return <Navigate to="/" replace />
  }

  if (requiredModule && modules && !modules[requiredModule]) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
