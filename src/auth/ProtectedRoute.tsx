import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext'
import type { RoleName } from '../types'

interface Props {
  allowedRoles?: RoleName[]
}

export function ProtectedRoute({ allowedRoles }: Props) {
  const { session, membership, loading } = useAuth()

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Cargando…</div>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && membership && !allowedRoles.includes(membership.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
