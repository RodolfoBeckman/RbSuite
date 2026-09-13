import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CashMovement, CashMovementType, CashRegister, CashSession } from '../types'

export function useCashRegisters(branchId: string | null) {
  return useQuery({
    queryKey: ['cash-registers', branchId],
    queryFn: async (): Promise<CashRegister[]> => {
      const { data, error } = await supabase
        .from('cash_registers')
        .select('id, branch_id, name')
        .eq('branch_id', branchId)
        .eq('active', true)
        .order('name')

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id,
        branchId: row.branch_id,
        name: row.name,
      }))
    },
    enabled: !!branchId,
  })
}

export function useCreateCashRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ branchId, name }: { branchId: string; name: string }) => {
      const { data, error } = await supabase
        .from('cash_registers')
        .insert({ branch_id: branchId, name })
        .select('id, branch_id, name')
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-registers', variables.branchId] })
    },
  })
}

export function useCurrentCashSession(cashRegisterId: string | null) {
  return useQuery({
    queryKey: ['cash-session', cashRegisterId],
    queryFn: async (): Promise<CashSession | null> => {
      const { data, error } = await supabase
        .from('cash_sessions')
        .select('id, cash_register_id, opening_amount, opened_at, status')
        .eq('cash_register_id', cashRegisterId)
        .eq('status', 'open')
        .maybeSingle()

      if (error) throw error
      if (!data) return null

      return {
        id: data.id,
        cashRegisterId: data.cash_register_id,
        openingAmount: Number(data.opening_amount),
        openedAt: data.opened_at,
        status: data.status,
      }
    },
    enabled: !!cashRegisterId,
  })
}

export function useCashMovements(sessionId: string | null) {
  return useQuery({
    queryKey: ['cash-movements', sessionId],
    queryFn: async (): Promise<CashMovement[]> => {
      const { data, error } = await supabase
        .from('cash_movements')
        .select('id, type, amount, reason, created_at')
        .eq('cash_session_id', sessionId)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount),
        reason: row.reason,
        createdAt: row.created_at,
      }))
    },
    enabled: !!sessionId,
  })
}

export function useOpenCashSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      cashRegisterId,
      openingAmount,
    }: {
      cashRegisterId: string
      openingAmount: number
    }) => {
      const { data, error } = await supabase.rpc('open_cash_session', {
        p_cash_register_id: cashRegisterId,
        p_opening_amount: openingAmount,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-session', variables.cashRegisterId] })
    },
  })
}

export function useCloseCashSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sessionId,
      countedAmount,
    }: {
      sessionId: string
      cashRegisterId: string
      countedAmount: number
    }) => {
      const { data, error } = await supabase
        .rpc('close_cash_session', {
          p_session_id: sessionId,
          p_counted_amount: countedAmount,
        })
        .single()

      if (error) throw error
      return data as { expected_amount: number; difference: number }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-session', variables.cashRegisterId] })
      queryClient.invalidateQueries({ queryKey: ['cash-movements', variables.sessionId] })
    },
  })
}

export function useRegisterCashMovement() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      sessionId,
      type,
      amount,
      reason,
    }: {
      sessionId: string
      type: Exclude<CashMovementType, 'sale'>
      amount: number
      reason?: string
    }) => {
      const { data, error } = await supabase.rpc('register_cash_movement', {
        p_session_id: sessionId,
        p_type: type,
        p_amount: amount,
        p_reason: reason ?? null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cash-movements', variables.sessionId] })
    },
  })
}
