import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Membership } from '../types'

interface AuthContextValue {
  session: Session | null
  membership: Membership | null
  loading: boolean
  activeBranchId: string | null
  setActiveBranchId: (branchId: string | null) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [membership, setMembership] = useState<Membership | null>(null)
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) {
      setMembership(null)
      setActiveBranchId(null)
      return
    }

    // La membresía real (negocio, sucursal, rol) siempre se resuelve del
    // lado del servidor con esta función, nunca se recibe desde el cliente.
    // La función get_my_membership() vive en la migración de Supabase.
    supabase.rpc('get_my_membership').then(({ data, error }) => {
      if (error) {
        console.error('No se pudo cargar la membresía del usuario', error)
        return
      }
      const row = Array.isArray(data) ? data[0] : data
      if (row) {
        const resolved: Membership = {
          businessId: row.business_id,
          branchId: row.branch_id,
          role: row.role,
          permissionOverrides: row.permission_overrides ?? {},
        }
        setMembership(resolved)
        setActiveBranchId(resolved.branchId)
      }
    })
    // Supabase reemplaza el objeto `session` en cada evento de
    // onAuthStateChange, incluido el refresco silencioso de token al
    // recuperar el foco de la pestaña — sin esto, ese refresco resetea
    // activeBranchId (y con él, cualquier pantalla que dependa de tener
    // una sucursal elegida) aunque el usuario siga siendo el mismo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id])

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider
      value={{ session, membership, loading, activeBranchId, setActiveBranchId, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
