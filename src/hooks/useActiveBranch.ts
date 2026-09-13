import { useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useBranches } from './useBranches'

// Si la sucursal activa se desactiva mientras ya estaba seleccionada (ej.
// el Administrador la da de baja desde Configuración en otra pestaña),
// esto la limpia para que PosPage/CajaPage vuelvan a mostrar el
// BranchPicker en vez de seguir operando sobre una sucursal inactiva.
// Solo aplica cuando la elección era libre (membership.branchId nulo,
// Administrador/Gerente) — un Vendedor con sucursal fija nunca elige aquí.
export function useActiveBranch() {
  const { membership, activeBranchId, setActiveBranchId } = useAuth()
  const { data: branches } = useBranches()

  const canReset = membership?.branchId == null
  const isStale = !!(canReset && activeBranchId && branches && !branches.some((b) => b.id === activeBranchId))

  useEffect(() => {
    if (isStale) setActiveBranchId(null)
  }, [isStale, setActiveBranchId])

  return isStale ? null : activeBranchId
}
