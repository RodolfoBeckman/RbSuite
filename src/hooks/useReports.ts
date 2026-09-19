import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface ReportSalesSummary {
  total: number
  salesCount: number
  avgTicket: number
}

export interface ReportSalesTrendPoint {
  day: string
  total: number
}

export interface ReportEmployeeSales {
  userId: string
  email: string
  total: number
  salesCount: number
}

export interface ReportProfitLine {
  itemName: string
  itemType: 'product' | 'service'
  quantity: number
  revenue: number
  cost: number
  profit: number
}

// yyyy-mm-dd — lo que espera un parámetro `date` de Postgres vía PostgREST.
function toDateParam(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export interface DateRange {
  from: Date
  to: Date
}

export function useReportSalesSummary(range: DateRange) {
  return useQuery({
    queryKey: ['report-sales-summary', toDateParam(range.from), toDateParam(range.to)],
    queryFn: async (): Promise<ReportSalesSummary> => {
      const { data, error } = await supabase
        .rpc('report_sales_summary', {
          p_from: toDateParam(range.from),
          p_to: toDateParam(range.to),
        })
        .single()
      if (error) throw error
      const row = data as { total: number; sales_count: number; avg_ticket: number }
      return {
        total: Number(row.total),
        salesCount: row.sales_count,
        avgTicket: Number(row.avg_ticket),
      }
    },
  })
}

export function useReportSalesTrend(range: DateRange) {
  return useQuery({
    queryKey: ['report-sales-trend', toDateParam(range.from), toDateParam(range.to)],
    queryFn: async (): Promise<ReportSalesTrendPoint[]> => {
      const { data, error } = await supabase.rpc('report_sales_trend', {
        p_from: toDateParam(range.from),
        p_to: toDateParam(range.to),
      })
      if (error) throw error
      return ((data ?? []) as { day: string; total: number }[]).map((row) => ({
        day: row.day,
        total: Number(row.total),
      }))
    },
  })
}

export function useReportSalesByEmployee(range: DateRange) {
  return useQuery({
    queryKey: ['report-sales-by-employee', toDateParam(range.from), toDateParam(range.to)],
    queryFn: async (): Promise<ReportEmployeeSales[]> => {
      const { data, error } = await supabase.rpc('report_sales_by_employee', {
        p_from: toDateParam(range.from),
        p_to: toDateParam(range.to),
      })
      if (error) throw error
      return (
        (data ?? []) as { user_id: string; email: string; total: number; sales_count: number }[]
      ).map((row) => ({
        userId: row.user_id,
        email: row.email,
        total: Number(row.total),
        salesCount: row.sales_count,
      }))
    },
  })
}

export function useReportProfitMargin(range: DateRange, employeeUserId: string | null = null) {
  return useQuery({
    queryKey: [
      'report-profit-margin',
      toDateParam(range.from),
      toDateParam(range.to),
      employeeUserId,
    ],
    queryFn: async (): Promise<ReportProfitLine[]> => {
      const { data, error } = await supabase.rpc('report_profit_margin', {
        p_from: toDateParam(range.from),
        p_to: toDateParam(range.to),
        p_employee_user_id: employeeUserId,
      })
      if (error) throw error
      return (
        (data ?? []) as {
          item_name: string
          item_type: 'product' | 'service'
          quantity: number
          revenue: number
          cost: number
          profit: number
        }[]
      ).map((row) => ({
        itemName: row.item_name,
        itemType: row.item_type,
        quantity: Number(row.quantity),
        revenue: Number(row.revenue),
        cost: Number(row.cost),
        profit: Number(row.profit),
      }))
    },
  })
}
