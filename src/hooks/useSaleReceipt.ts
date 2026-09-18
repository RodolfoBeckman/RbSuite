import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { PaymentMethod } from '../types'

export interface SaleReceiptItem {
  name: string
  quantity: number
  unitPrice: number
  subtotal: number
}

export interface SaleReceiptPayment {
  method: PaymentMethod
  amount: number
}

export interface SaleReceipt {
  folio: number
  createdAt: string
  subtotal: number
  discountTotal: number
  total: number
  businessName: string
  branchName: string
  branchAddress: string | null
  branchPhone: string | null
  items: SaleReceiptItem[]
  payments: SaleReceiptPayment[]
}

interface SaleRow {
  folio: number
  created_at: string
  subtotal: number
  discount_total: number
  total: number
  business: { name: string } | { name: string }[] | null
  branch: { name: string; address: string | null; phone: string | null } | { name: string; address: string | null; phone: string | null }[] | null
}

interface SaleItemRow {
  quantity: number
  unit_price: number
  subtotal: number
  item_type: 'product' | 'service'
  business_product: { product: { name: string } | { name: string }[] | null } | { product: { name: string } | { name: string }[] | null }[] | null
  service: { name: string } | { name: string }[] | null
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

// Un solo ticket con todo lo necesario para imprimirlo — se pide solo
// cuando se abre/imprime un recibo (no en cada carga de la lista de
// ventas), tanto justo después de cobrar como al reimprimir desde el
// historial.
export function useSaleReceipt(saleId: string | null) {
  return useQuery({
    queryKey: ['sale-receipt', saleId],
    queryFn: async (): Promise<SaleReceipt> => {
      const { data: sale, error } = await supabase
        .from('sales')
        .select(
          'folio, created_at, subtotal, discount_total, total, business:businesses(name), branch:branches(name, address, phone)',
        )
        .eq('id', saleId)
        .single<SaleRow>()

      if (error) throw error

      const { data: itemRows, error: itemsError } = await supabase
        .from('sale_items')
        .select(
          'quantity, unit_price, subtotal, item_type, business_product:business_products(product:products_catalog(name)), service:services(name)',
        )
        .eq('sale_id', saleId)
        .returns<SaleItemRow[]>()

      if (itemsError) throw itemsError

      const { data: paymentRows, error: paymentsError } = await supabase
        .from('payments')
        .select('method, amount')
        .eq('sale_id', saleId)

      if (paymentsError) throw paymentsError

      const business = one(sale.business)
      const branch = one(sale.branch)

      const items: SaleReceiptItem[] = (itemRows ?? []).map((row) => {
        const name =
          row.item_type === 'product'
            ? one(one(row.business_product)?.product ?? null)?.name
            : one(row.service)?.name
        return {
          name: name ?? 'Producto/servicio',
          quantity: Number(row.quantity),
          unitPrice: Number(row.unit_price),
          subtotal: Number(row.subtotal),
        }
      })

      const payments: SaleReceiptPayment[] = (paymentRows ?? []).map((row) => ({
        method: row.method as PaymentMethod,
        amount: Number(row.amount),
      }))

      return {
        folio: sale.folio,
        createdAt: sale.created_at,
        subtotal: Number(sale.subtotal),
        discountTotal: Number(sale.discount_total),
        total: Number(sale.total),
        businessName: business?.name ?? 'RB Suite',
        branchName: branch?.name ?? '—',
        branchAddress: branch?.address ?? null,
        branchPhone: branch?.phone ?? null,
        items,
        payments,
      }
    },
    enabled: !!saleId,
  })
}
