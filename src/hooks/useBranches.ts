import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { Branch } from '../types'

// RLS ya limita esto a las sucursales del negocio actual (y, si el usuario
// tiene branch_id fijo, a esa única sucursal vía current_branch_ids()).
export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async (): Promise<Branch[]> => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, business_id, name')
        .eq('active', true)
        .order('name')

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id,
        businessId: row.business_id,
        name: row.name,
      }))
    },
  })
}

export interface BranchDetail extends Branch {
  address: string | null
  timezone: string
  active: boolean
}

// Para la pantalla de administración: incluye sucursales inactivas y todos
// los campos editables (el picker del POS/dashboard usa useBranches, que
// solo trae las activas).
export function useManageBranches() {
  const { membership } = useAuth()

  return useQuery({
    queryKey: ['branches-manage', membership?.businessId],
    queryFn: async (): Promise<BranchDetail[]> => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, business_id, name, address, timezone, active')
        .order('name')

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id,
        businessId: row.business_id,
        name: row.name,
        address: row.address,
        timezone: row.timezone,
        active: row.active,
      }))
    },
    enabled: !!membership?.businessId,
  })
}

function useInvalidateBranches() {
  const queryClient = useQueryClient()
  const { membership } = useAuth()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['branches'] })
    queryClient.invalidateQueries({ queryKey: ['branches-manage', membership?.businessId] })
  }
}

export function useCreateBranch() {
  const { membership } = useAuth()
  const invalidate = useInvalidateBranches()

  return useMutation({
    mutationFn: async (input: { name: string; address: string; timezone: string }) => {
      const { error } = await supabase.from('branches').insert({
        business_id: membership!.businessId,
        name: input.name,
        address: input.address || null,
        timezone: input.timezone,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useUpdateBranch() {
  const invalidate = useInvalidateBranches()

  return useMutation({
    mutationFn: async (input: {
      id: string
      name: string
      address: string
      timezone: string
      active: boolean
    }) => {
      const { error } = await supabase
        .from('branches')
        .update({
          name: input.name,
          address: input.address || null,
          timezone: input.timezone,
          active: input.active,
        })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
