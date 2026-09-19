import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/AuthContext'
import { supabase } from '../lib/supabase'
import type { PaymentMethod } from '../types'

export interface Customer {
  id: string
  name: string
  phone: string | null
  notes: string | null
  creditLimit: number | null
  balance: number
  isActive: boolean
}

function mapCustomer(row: {
  id: string
  name: string
  phone: string | null
  notes: string | null
  credit_limit: number | null
  balance: number
  is_active: boolean
}): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    notes: row.notes,
    creditLimit: row.credit_limit != null ? Number(row.credit_limit) : null,
    balance: Number(row.balance),
    isActive: row.is_active,
  }
}

// Búsqueda por nombre o teléfono para el buscador de cliente del POS al
// elegir fiado — no trae todo el catálogo de una vez.
export function useSearchCustomers(term: string) {
  const trimmed = term.trim()
  return useQuery({
    queryKey: ['customers-search', trimmed],
    queryFn: async (): Promise<Customer[]> => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, notes, credit_limit, balance, is_active')
        .eq('is_active', true)
        .or(`name.ilike.%${trimmed}%,phone.ilike.%${trimmed}%`)
        .order('name')
        .limit(10)

      if (error) throw error
      return (data ?? []).map(mapCustomer)
    },
    enabled: trimmed.length > 0,
  })
}

export function useCustomer(customerId: string | null) {
  return useQuery({
    queryKey: ['customer', customerId],
    queryFn: async (): Promise<Customer> => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, phone, notes, credit_limit, balance, is_active')
        .eq('id', customerId)
        .single()

      if (error) throw error
      return mapCustomer(data)
    },
    enabled: !!customerId,
  })
}

export function useCreateCustomer() {
  const queryClient = useQueryClient()
  const { membership } = useAuth()

  return useMutation({
    mutationFn: async (input: { name: string; phone?: string }): Promise<Customer> => {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          business_id: membership!.businessId,
          name: input.name,
          phone: input.phone || null,
        })
        .select('id, name, phone, notes, credit_limit, balance, is_active')
        .single()

      if (error) throw error
      return mapCustomer(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-search'] })
      queryClient.invalidateQueries({ queryKey: ['customers-receivables'] })
    },
  })
}

export interface CustomerAccountMovement {
  id: string
  type: 'charge' | 'payment' | 'adjustment'
  amount: number
  paymentMethod: PaymentMethod | null
  saleFolio: number | null
  branchName: string
  reason: string | null
  createdAt: string
}

interface MovementRow {
  id: string
  type: 'charge' | 'payment' | 'adjustment'
  amount: number
  payment_method: PaymentMethod | null
  reason: string | null
  created_at: string
  sale: { folio: number } | { folio: number }[] | null
  branch: { name: string } | { name: string }[] | null
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

// Estado de cuenta: historial completo de cargos/abonos/ajustes de un
// cliente, para resolver disputas ("yo ya había pagado esto").
export function useCustomerAccountMovements(customerId: string | null) {
  return useQuery({
    queryKey: ['customer-account-movements', customerId],
    queryFn: async (): Promise<CustomerAccountMovement[]> => {
      const { data, error } = await supabase
        .from('customer_account_movements')
        .select(
          'id, type, amount, payment_method, reason, created_at, sale:sales(folio), branch:branches(name)',
        )
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .returns<MovementRow[]>()

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id,
        type: row.type,
        amount: Number(row.amount),
        paymentMethod: row.payment_method,
        saleFolio: one(row.sale)?.folio ?? null,
        branchName: one(row.branch)?.name ?? '—',
        reason: row.reason,
        createdAt: row.created_at,
      }))
    },
    enabled: !!customerId,
  })
}

export function useRecordCustomerPayment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      customerId: string
      branchId: string
      amount: number
      paymentMethod: Exclude<PaymentMethod, 'fiado'>
      cashSessionId?: string | null
    }) => {
      const { data, error } = await supabase.rpc('record_customer_payment', {
        p_customer_id: input.customerId,
        p_branch_id: input.branchId,
        p_amount: input.amount,
        p_payment_method: input.paymentMethod,
        p_cash_session_id: input.cashSessionId ?? null,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] })
      queryClient.invalidateQueries({ queryKey: ['customer-account-movements', variables.customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers-receivables'] })
      queryClient.invalidateQueries({ queryKey: ['cash-movements'] })
    },
  })
}

export function useAdjustCustomerBalance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { customerId: string; amount: number; reason: string }) => {
      const { data, error } = await supabase.rpc('adjust_customer_balance', {
        p_customer_id: input.customerId,
        p_amount: input.amount,
        p_reason: input.reason,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customerId] })
      queryClient.invalidateQueries({ queryKey: ['customer-account-movements', variables.customerId] })
      queryClient.invalidateQueries({ queryKey: ['customers-receivables'] })
    },
  })
}
