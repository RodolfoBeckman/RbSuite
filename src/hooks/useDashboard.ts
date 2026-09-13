import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type {
  BranchSales,
  DashboardSummary,
  LowStockItem,
  PaymentMethodTotal,
  SalesTrendPoint,
  TopItem,
} from '../types'

interface SummaryRow {
  total: number
  sales_count: number
  open_cash_sessions: number
}

interface BranchSalesRow {
  branch_id: string
  branch_name: string
  total: number
}

interface SalesTrendRow {
  day: string
  total: number
}

interface PaymentMethodRow {
  method: PaymentMethodTotal['method']
  total: number
}

interface TopItemRow {
  name: string
  item_type: TopItem['itemType']
  quantity: number
  total: number
}

interface LowStockRow {
  business_product_id: string
  name: string
  branch_id: string
  branch_name: string
  stock: number
  minimum_stock: number
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async (): Promise<DashboardSummary> => {
      const { data, error } = await supabase.rpc('dashboard_today_summary').single()
      if (error) throw error
      const row = data as unknown as SummaryRow
      return {
        total: Number(row.total),
        salesCount: row.sales_count,
        openCashSessions: row.open_cash_sessions,
      }
    },
  })
}

export function useSalesByBranch() {
  return useQuery({
    queryKey: ['dashboard-sales-by-branch'],
    queryFn: async (): Promise<BranchSales[]> => {
      const { data, error } = await supabase.rpc('dashboard_sales_by_branch')
      if (error) throw error
      return ((data ?? []) as BranchSalesRow[]).map((row) => ({
        branchId: row.branch_id,
        branchName: row.branch_name,
        total: Number(row.total),
      }))
    },
  })
}

export function useSalesTrend(days = 7) {
  return useQuery({
    queryKey: ['dashboard-sales-trend', days],
    queryFn: async (): Promise<SalesTrendPoint[]> => {
      const { data, error } = await supabase.rpc('dashboard_sales_trend', { p_days: days })
      if (error) throw error
      return ((data ?? []) as SalesTrendRow[]).map((row) => ({
        day: row.day,
        total: Number(row.total),
      }))
    },
  })
}

export function usePaymentMethodTotals(days = 7) {
  return useQuery({
    queryKey: ['dashboard-payment-methods', days],
    queryFn: async (): Promise<PaymentMethodTotal[]> => {
      const { data, error } = await supabase.rpc('dashboard_payment_methods', { p_days: days })
      if (error) throw error
      return ((data ?? []) as PaymentMethodRow[]).map((row) => ({
        method: row.method,
        total: Number(row.total),
      }))
    },
  })
}

export function useTopItems(days = 30, limit = 5) {
  return useQuery({
    queryKey: ['dashboard-top-items', days, limit],
    queryFn: async (): Promise<TopItem[]> => {
      const { data, error } = await supabase.rpc('dashboard_top_items', {
        p_days: days,
        p_limit: limit,
      })
      if (error) throw error
      return ((data ?? []) as TopItemRow[]).map((row) => ({
        name: row.name,
        itemType: row.item_type,
        quantity: Number(row.quantity),
        total: Number(row.total),
      }))
    },
  })
}

export function useLowStock() {
  return useQuery({
    queryKey: ['dashboard-low-stock'],
    queryFn: async (): Promise<LowStockItem[]> => {
      const { data, error } = await supabase.rpc('dashboard_low_stock')
      if (error) throw error
      return ((data ?? []) as LowStockRow[]).map((row) => ({
        businessProductId: row.business_product_id,
        name: row.name,
        branchId: row.branch_id,
        branchName: row.branch_name,
        stock: Number(row.stock),
        minimumStock: Number(row.minimum_stock),
      }))
    },
  })
}
