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
