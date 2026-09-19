import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { CartLine, PaymentMethod } from '../types'

interface CreateSaleArgs {
  branchId: string
  cartLines: CartLine[]
  paymentMethod: PaymentMethod
  total: number
  customerId?: string | null
}

interface CreateSaleResult {
  saleId: string
  folio: number | null
}

export function useCreateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      branchId,
      cartLines,
      paymentMethod,
      total,
      customerId,
    }: CreateSaleArgs): Promise<CreateSaleResult> => {
      const payload = {
        branch_id: branchId,
        customer_id: customerId ?? null,
        items: cartLines.map((line) => ({
          item_type: line.item.itemType,
          business_product_id: line.item.itemType === 'product' ? line.item.id : null,
          service_id: line.item.itemType === 'service' ? line.item.id : null,
          quantity: line.quantity,
          unit_price: line.item.price,
          discount_amount: 0,
        })),
        payments: [{ method: paymentMethod, amount: total }],
      }

      const { data: saleId, error } = await supabase.rpc('create_sale', { payload })
      if (error) throw error

      const { data: sale } = await supabase
        .from('sales')
        .select('folio')
        .eq('id', saleId)
        .single()

      return { saleId: saleId as string, folio: sale?.folio ?? null }
    },
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pos-catalog', variables.branchId] })
    },
  })
}
