import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PaymentMethod } from '../types'

export interface BranchPaymentMethod {
  id: string
  method: PaymentMethod
  isEnabled: boolean
}

// Solo los métodos activos — para el selector del POS.
export function useEnabledPaymentMethods(branchId: string | null) {
  return useQuery({
    queryKey: ['branch-payment-methods-enabled', branchId],
    queryFn: async (): Promise<PaymentMethod[]> => {
      const { data, error } = await supabase
        .from('branch_payment_methods')
        .select('payment_method')
        .eq('branch_id', branchId)
        .eq('is_enabled', true)

      if (error) throw error
      return (data ?? []).map((row) => row.payment_method as PaymentMethod)
    },
    enabled: !!branchId,
  })
}

// Todos los métodos (activos e inactivos) — para la pantalla de
// Configuración donde se prenden/apagan por sucursal.
export function useManageBranchPaymentMethods(branchId: string | null) {
  return useQuery({
    queryKey: ['branch-payment-methods-manage', branchId],
    queryFn: async (): Promise<BranchPaymentMethod[]> => {
      const { data, error } = await supabase
        .from('branch_payment_methods')
        .select('id, payment_method, is_enabled')
        .eq('branch_id', branchId)
        .order('payment_method')

      if (error) throw error
      return (data ?? []).map((row) => ({
        id: row.id,
        method: row.payment_method as PaymentMethod,
        isEnabled: row.is_enabled,
      }))
    },
    enabled: !!branchId,
  })
}

export function useUpdateBranchPaymentMethod() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; branchId: string; isEnabled: boolean }) => {
      const { error } = await supabase
        .from('branch_payment_methods')
        .update({ is_enabled: input.isEnabled, updated_at: new Date().toISOString() })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['branch-payment-methods-manage', variables.branchId] })
      queryClient.invalidateQueries({ queryKey: ['branch-payment-methods-enabled', variables.branchId] })
    },
  })
}
