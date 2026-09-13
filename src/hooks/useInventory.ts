import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

export interface CatalogItem {
  id: string
  name: string
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) return value[0] ?? null
  return value ?? null
}

export function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    queryFn: async (): Promise<CatalogItem[]> => {
      const { data, error } = await supabase.from('brands').select('id, name').order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateBrand() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string): Promise<CatalogItem> => {
      const { data, error } = await supabase
        .from('brands')
        .insert({ name })
        .select('id, name')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['brands'] }),
  })
}

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    queryFn: async (): Promise<CatalogItem[]> => {
      const { data, error } = await supabase.from('units').select('id, name').order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string): Promise<CatalogItem> => {
      const { data, error } = await supabase
        .from('units')
        .insert({ name })
        .select('id, name')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['units'] }),
  })
}

export function useProductFamilies() {
  return useQuery({
    queryKey: ['product-families'],
    queryFn: async (): Promise<CatalogItem[]> => {
      const { data, error } = await supabase
        .from('product_families')
        .select('id, name')
        .order('name')
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCreateProductFamily() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (name: string): Promise<CatalogItem> => {
      const { data, error } = await supabase
        .from('product_families')
        .insert({ name })
        .select('id, name')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['product-families'] }),
  })
}

export function useCategories() {
  const { membership } = useAuth()

  return useQuery({
    queryKey: ['categories', membership?.businessId],
    queryFn: async (): Promise<CatalogItem[]> => {
      const { data, error } = await supabase.from('categories').select('id, name').order('name')
      if (error) throw error
      return data ?? []
    },
    enabled: !!membership?.businessId,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()
  const { membership } = useAuth()

  return useMutation({
    mutationFn: async (name: string): Promise<CatalogItem> => {
      const { data, error } = await supabase
        .from('categories')
        .insert({ business_id: membership!.businessId, name })
        .select('id, name')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['categories', membership?.businessId] }),
  })
}

export interface CatalogProductMatch {
  id: string
  name: string
  barcode: string | null
  brandName: string | null
  unitName: string
  familyName: string | null
  owned: boolean
}

interface CatalogSearchRow {
  id: string
  name: string
  barcode: string | null
  brand: CatalogItem | CatalogItem[] | null
  unit: CatalogItem | CatalogItem[] | null
  family: CatalogItem | CatalogItem[] | null
}

// Búsqueda en el catálogo compartido (no filtrado por negocio) para poder
// reutilizar un producto que otro negocio ya dio de alta, en vez de
// duplicar la captura.
export function useSearchCatalogProducts(term: string) {
  const { membership } = useAuth()

  return useQuery({
    queryKey: ['catalog-search', term],
    queryFn: async (): Promise<CatalogProductMatch[]> => {
      const cleaned = term.trim().replace(/[,()]/g, '')
      const { data, error } = await supabase
        .from('products_catalog')
        .select('id, name, barcode, brand:brands(id, name), unit:units(id, name), family:product_families(id, name)')
        .or(`name.ilike.%${cleaned}%,barcode.ilike.%${cleaned}%`)
        .limit(10)
        .returns<CatalogSearchRow[]>()
      if (error) throw error

      const { data: owned, error: ownedError } = await supabase
        .from('business_products')
        .select('product_id')
      if (ownedError) throw ownedError
      const ownedIds = new Set((owned ?? []).map((row) => row.product_id as string))

      return (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        barcode: row.barcode,
        brandName: one(row.brand)?.name ?? null,
        unitName: one(row.unit)?.name ?? '—',
        familyName: one(row.family)?.name ?? null,
        owned: ownedIds.has(row.id),
      }))
    },
    enabled: !!membership?.businessId && term.trim().length >= 2,
  })
}

export interface BusinessProduct {
  id: string
  productId: string
  name: string
  barcode: string | null
  brandId: string | null
  brandName: string | null
  unitId: string
  unitName: string
  familyId: string | null
  familyName: string | null
  categoryId: string | null
  categoryName: string | null
  salePrice: number
  purchasePrice: number | null
  minimumStock: number
  active: boolean
  stock: number
}

interface BusinessProductJoinRow {
  id: string
  sale_price: number
  purchase_price: number | null
  minimum_stock: number
  active: boolean
  category: CatalogItem | CatalogItem[] | null
  product:
    | {
        id: string
        name: string
        barcode: string | null
        brand: CatalogItem | CatalogItem[] | null
        unit: CatalogItem | CatalogItem[] | null
        family: CatalogItem | CatalogItem[] | null
      }
    | Array<{
        id: string
        name: string
        barcode: string | null
        brand: CatalogItem | CatalogItem[] | null
        unit: CatalogItem | CatalogItem[] | null
        family: CatalogItem | CatalogItem[] | null
      }>
    | null
}

export function useBusinessProducts(
  branchId: string | null,
  options: { page: number; pageSize: number; search: string },
) {
  const { membership } = useAuth()
  const { page, pageSize, search } = options

  return useQuery({
    queryKey: ['business-products', membership?.businessId, branchId, page, pageSize, search],
    queryFn: async (): Promise<{ items: BusinessProduct[]; total: number }> => {
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      let query = supabase
        .from('business_products')
        .select(
          `id, sale_price, purchase_price, minimum_stock, active,
           category:categories(id, name),
           product:products_catalog!inner(
             id, name, barcode,
             brand:brands(id, name),
             unit:units(id, name),
             family:product_families(id, name)
           )`,
          { count: 'exact' },
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      const term = search.trim().replace(/[,()]/g, '')
      if (term) {
        query = query.or(`name.ilike.%${term}%,barcode.ilike.%${term}%`, { foreignTable: 'product' })
      }

      const { data: rows, error, count } = await query.returns<BusinessProductJoinRow[]>()
      if (error) throw error

      const ids = (rows ?? []).map((row) => row.id)
      const stockByProduct = new Map<string, number>()
      if (branchId && ids.length > 0) {
        const { data: stockRows, error: stockError } = await supabase
          .from('inventory_stock')
          .select('business_product_id, quantity')
          .eq('branch_id', branchId)
          .in('business_product_id', ids)
        if (stockError) throw stockError
        for (const row of stockRows ?? []) {
          stockByProduct.set(row.business_product_id as string, Number(row.quantity))
        }
      }

      const items = (rows ?? []).map((row) => {
        const product = one(row.product)
        const brand = one(product?.brand)
        const unit = one(product?.unit)
        const family = one(product?.family)
        const category = one(row.category)
        return {
          id: row.id,
          productId: product?.id ?? '',
          name: product?.name ?? 'Producto sin nombre',
          barcode: product?.barcode ?? null,
          brandId: brand?.id ?? null,
          brandName: brand?.name ?? null,
          unitId: unit?.id ?? '',
          unitName: unit?.name ?? '—',
          familyId: family?.id ?? null,
          familyName: family?.name ?? null,
          categoryId: category?.id ?? null,
          categoryName: category?.name ?? null,
          salePrice: Number(row.sale_price),
          purchasePrice: row.purchase_price != null ? Number(row.purchase_price) : null,
          minimumStock: Number(row.minimum_stock),
          active: row.active,
          stock: stockByProduct.get(row.id) ?? 0,
        }
      })

      return { items, total: count ?? items.length }
    },
    enabled: !!membership?.businessId && !!branchId,
  })
}

function useInvalidateProducts() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['business-products'] })
}

export function useCreateProduct() {
  const invalidate = useInvalidateProducts()

  return useMutation({
    mutationFn: async (input: {
      productId: string | null
      barcode: string
      name: string
      brandId: string | null
      unitId: string | null
      familyId: string | null
      categoryId: string | null
      salePrice: number
      purchasePrice: number | null
      minimumStock: number
      branchId: string | null
      initialStock: number
    }) => {
      const { error } = await supabase.rpc('create_business_product', {
        p_product_id: input.productId,
        p_barcode: input.barcode,
        p_name: input.name,
        p_brand_id: input.brandId,
        p_unit_id: input.unitId,
        p_family_id: input.familyId,
        p_category_id: input.categoryId,
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
      categoryId: string | null
      salePrice: number
      purchasePrice: number | null
      minimumStock: number
      active: boolean
    }) => {
      const { error } = await supabase
        .from('business_products')
        .update({
          category_id: input.categoryId,
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
