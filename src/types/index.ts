// Los tres roles fijos del MVP (ver decisión de producto: sin pantalla de
// permisos granulares todavía, eso queda para la fase P1).
export type RoleName = 'administrador' | 'gerente' | 'vendedor'

export interface Membership {
  businessId: string
  // branchId null = el usuario ve todas las sucursales del negocio
  // (Gerente/Administrador). Un branchId específico restringe a esa
  // sucursal (Vendedor).
  branchId: string | null
  role: RoleName
}

export interface Business {
  id: string
  slug: string
  name: string
}

export interface Branch {
  id: string
  businessId: string
  name: string
}

// Item del catálogo del POS: puede ser un producto (con stock por sucursal)
// o un servicio (sin stock). El id es el de business_products o services
// según corresponda — nunca el de products_catalog.
export interface CatalogItem {
  itemType: 'product' | 'service'
  id: string
  name: string
  price: number
  stock: number | null
}

export interface CartLine {
  item: CatalogItem
  quantity: number
}

export type PaymentMethod = 'cash' | 'card' | 'transfer'

export type CashSessionStatus = 'open' | 'closed'
export type CashMovementType = 'sale' | 'cash_in' | 'cash_out' | 'adjustment'

export interface CashRegister {
  id: string
  branchId: string
  name: string
}

export interface CashSession {
  id: string
  cashRegisterId: string
  openingAmount: number
  openedAt: string
  status: CashSessionStatus
}

export interface CashMovement {
  id: string
  type: CashMovementType
  amount: number
  reason: string | null
  createdAt: string
}

export interface DashboardSummary {
  total: number
  salesCount: number
  openCashSessions: number
}

export interface BranchSales {
  branchId: string
  branchName: string
  total: number
}

export interface SalesTrendPoint {
  day: string
  total: number
}

export interface PaymentMethodTotal {
  method: PaymentMethod
  total: number
}

export interface TopItem {
  name: string
  itemType: 'product' | 'service'
  quantity: number
  total: number
}

export interface LowStockItem {
  businessProductId: string
  name: string
  branchId: string
  branchName: string
  stock: number
  minimumStock: number
}
