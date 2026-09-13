import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Sale } from '../types'

interface SaleRow {
  id: string
  folio: number
  created_at: string
  total: number
  status: Sale['status']
  branches: { name: string } | { name: string }[] | null
}

export function useSalesHistory(days = 7) {
  return useQuery({
    queryKey: ['sales-history', days],
    queryFn: async (): Promise<Sale[]> => {
      const since = new Date()
      since.setDate(since.getDate() - (days - 1))
      since.setHours(0, 0, 0, 0)

      const { data, error } = await supabase
        .from('sales')
        .select('id, folio, created_at, total, status, branches(name)')
        .gte('created_at', since.toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      return ((data ?? []) as SaleRow[]).map((row) => {
        const branch = Array.isArray(row.branches) ? row.branches[0] : row.branches
        return {
          id: row.id,
          folio: row.folio,
          createdAt: row.created_at,
          total: Number(row.total),
          status: row.status,
          branchName: branch?.name ?? '—',
        }
      })
    },
  })
}

export function useCancelSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (saleId: string) => {
      const { error } = await supabase.rpc('cancel_sale', { p_sale_id: saleId })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-history'] })
      queryClient.invalidateQueries({ queryKey: ['pos-catalog'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-low-stock'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-sales-trend'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-sales-by-branch'] })
    },
  })
}
