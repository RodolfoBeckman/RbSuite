import type { Membership, PermissionAction, RoleName } from '../types'

// Mismo default que role_default_permission() en
// 0018_granular_permissions.sql — si se cambia uno, cambiar el otro.
const ROLE_DEFAULTS: Record<PermissionAction, RoleName[]> = {
  create_products: ['administrador', 'gerente'],
  edit_products: ['administrador', 'gerente'],
  cancel_sale: ['administrador', 'gerente'],
  manage_branches: ['administrador'],
  manage_branding: ['administrador'],
  view_audit_log: ['administrador'],
}

export const PERMISSION_LABELS: { value: PermissionAction; label: string }[] = [
  { value: 'create_products', label: 'Dar de alta productos/servicios' },
  { value: 'edit_products', label: 'Editar precios e inventario' },
  { value: 'cancel_sale', label: 'Cancelar ventas' },
  { value: 'manage_branches', label: 'Administrar sucursales' },
  { value: 'manage_branding', label: 'Administrar marca y página pública' },
  { value: 'view_audit_log', label: 'Ver auditoría' },
]

// Administrador siempre puede todo — nunca se autolimita al dueño de la
// cuenta por un override mal puesto (mismo guard que el SQL).
export function hasPermission(
  membership: Pick<Membership, 'role' | 'permissionOverrides'> | null | undefined,
  action: PermissionAction,
): boolean {
  if (!membership) return false
  if (membership.role === 'administrador') return true
  const override = membership.permissionOverrides?.[action]
  if (override !== undefined) return override
  return ROLE_DEFAULTS[action].includes(membership.role)
}
