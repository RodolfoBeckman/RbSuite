import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

export interface BusinessProduct {
  id: string
  name: string
  brand: string | null
  category: string | null
  unit: string
  salePrice: number
  purchasePrice: number | null
  minimumStock: number
  active: boolean
  stock: number
}

interface BusinessProductRow {
  id: string
  sale_price: number
  purchase_price: number | null
  minimum_stock: number
  active: boolean
  product:
    | { name: string; brand: string | null; category: string | null; unit: string }
    | { name: string; brand: string | null; category: string | null; unit: string }[]
    | null
}

export function useBusinessProducts(branchId: string | null) {
  const { membership } = useAuth()

  return useQuery({
    queryKey: ['business-products', membership?.businessId, branchId],
    queryFn: async (): Promise<BusinessProduct[]> => {
      const { data: rows, error } = await supabase
        .from('business_products')
        .select(
          'id, sale_price, purchase_price, minimum_stock, active, product:products_catalog(name, brand, category, unit)',
        )
        .order('created_at', { ascending: false })
        .returns<BusinessProductRow[]>()
      if (error) throw error

      const { data: stockRows, error: stockError } = await supabase
        .from('inventory_stock')
        .select('business_product_id, quantity')
        .eq('branch_id', branchId!)
      if (stockError) throw stockError

      const stockByProduct = new Map<string, number>(
        (stockRows ?? []).map((row) => [row.business_product_id as string, Number(row.quantity)]),
      )

      return (rows ?? []).map((row) => {
        const product = Array.isArray(row.product) ? row.product[0] : row.product
        return {
          id: row.id,
          name: product?.name ?? 'Producto sin nombre',
          brand: product?.brand ?? null,
          category: product?.category ?? null,
          unit: product?.unit ?? 'pieza',
          salePrice: Number(row.sale_price),
          purchasePrice: row.purchase_price != null ? Number(row.purchase_price) : null,
          minimumStock: Number(row.minimum_stock),
          active: row.active,
          stock: stockByProduct.get(row.id) ?? 0,
        }
      })
    },
    enabled: !!membership?.businessId && !!branchId,
  })
}

function useInvalidateProducts() {
  const queryClient = useQueryClient()
  const { membership } = useAuth()
  return () =>
    queryClient.invalidateQueries({ queryKey: ['business-products', membership?.businessId] })
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts()

  return useMutation({
    mutationFn: async (input: {
      barcode: string
      name: string
      brand: string
      category: string
      unit: string
      salePrice: number
      purchasePrice: number | null
      minimumStock: number
      branchId: string | null
      initialStock: number
    }) => {
      const { error } = await supabase.rpc('create_business_product', {
        p_barcode: input.barcode,
        p_name: input.name,
        p_brand: input.brand,
        p_category: input.category,
        p_unit: input.unit,
        p_sale_price: input.salePrice,
        p_purchase_price: input.purchasePrice,
        p_minimum_stock: input.minimumStock,
        p_branch_id: input.branchId,
        p_initial_stock: input.initialStock,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useUpdateProduct() {
  const invalidate = useInvalidateProducts()

  return useMutation({
    mutationFn: async (input: {
      id: string
      salePrice: number
      purchasePrice: number | null
      minimumStock: number
      active: boolean
    }) => {
      const { error } = await supabase
        .from('business_products')
        .update({
          sale_price: input.salePrice,
          purchase_price: input.purchasePrice,
          minimum_stock: input.minimumStock,
          active: input.active,
        })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

// Todo ajuste (compra, merma, conteo físico) se registra como un solo
// movimiento tipo 'adjustment' con cantidad con signo — no hay botones
// separados de "entrada"/"salida", el ledger no distingue el motivo más
// que por el texto que se guarda en `reason`.
export function useAdjustStock() {
  const invalidate = useInvalidateProducts()
  const { membership } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      businessProductId: string
      branchId: string
      quantity: number
      reason: string
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Sesión inválida')

      const { error } = await supabase.from('inventory_movements').insert({
        business_id: membership!.businessId,
        branch_id: input.branchId,
        business_product_id: input.businessProductId,
        type: 'adjustment',
        quantity: input.quantity,
        reason: input.reason || null,
        created_by_user_id: user.id,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export interface ServiceItem {
  id: string
  name: string
  price: number
  durationMinutes: number | null
  active: boolean
}

export function useServicesAdmin() {
  const { membership } = useAuth()

  return useQuery({
    queryKey: ['services-admin', membership?.businessId],
    queryFn: async (): Promise<ServiceItem[]> => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, duration_minutes, active')
        .order('name')
      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        price: Number(row.price),
        durationMinutes: row.duration_minutes,
        active: row.active,
      }))
    },
    enabled: !!membership?.businessId,
  })
}

function useInvalidateServices() {
  const queryClient = useQueryClient()
  const { membership } = useAuth()
  return () => queryClient.invalidateQueries({ queryKey: ['services-admin', membership?.businessId] })
}

export function useCreateService() {
  const invalidate = useInvalidateServices()
  const { membership } = useAuth()

  return useMutation({
    mutationFn: async (input: { name: string; price: number; durationMinutes: number | null }) => {
      const { error } = await supabase.from('services').insert({
        business_id: membership!.businessId,
        name: input.name,
        price: input.price,
        duration_minutes: input.durationMinutes,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useUpdateService() {
  const invalidate = useInvalidateServices()

  return useMutation({
    mutationFn: async (input: {
      id: string
      name: string
      price: number
      durationMinutes: number | null
      active: boolean
    }) => {
      const { error } = await supabase
        .from('services')
        .update({
          name: input.name,
          price: input.price,
          duration_minutes: input.durationMinutes,
          active: input.active,
        })
        .eq('id', input.id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
