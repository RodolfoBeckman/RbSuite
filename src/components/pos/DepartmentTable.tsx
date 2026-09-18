import { useMemo } from 'react'
import type { CatalogItem } from '../../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

// Layout "ferreteria": muchos SKUs organizados por departamento
// (categories, ya por-negocio), en una tabla densa en vez de tarjetas —
// prioriza ver más renglones de un vistazo sobre el detalle visual.
export default function DepartmentTable({
  items,
  loading,
  onAdd,
  cartQuantities,
}: {
  items: CatalogItem[]
  loading: boolean
  onAdd: (item: CatalogItem) => void
  cartQuantities: Map<string, number>
}) {
  const groups = useMemo(() => {
    const byDept = new Map<string, CatalogItem[]>()
    for (const item of items) {
      const dept = item.categoryName ?? 'Sin categoría'
      const list = byDept.get(dept) ?? []
      list.push(item)
      byDept.set(dept, list)
    }
    return Array.from(byDept.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  return (
    <div className="space-y-4">
      {groups.map(([dept, deptItems]) => (
        <div
          key={dept}
          className="animate-fade-in overflow-hidden rounded-xl border border-gray-200 shadow-sm dark:border-gray-700"
        >
          <p className="bg-brand-tint px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-dark dark:bg-brand/20 dark:text-brand-light">
            {dept}
          </p>
          <table className="w-full text-sm">
            <tbody>
              {deptItems.map((item) => {
                const inCart = cartQuantities.get(item.id) ?? 0
                const disabled = item.itemType === 'product' && (item.stock ?? 0) <= 0
                return (
                  <tr
                    key={`${item.itemType}-${item.id}`}
                    onClick={() => {
                      if (disabled) return
                      onAdd(item)
                    }}
                    className={`cursor-pointer border-t border-gray-100 bg-white transition-colors duration-100 hover:bg-brand-tint/60 dark:border-gray-800 dark:bg-gray-800 dark:hover:bg-brand/20 ${
                      disabled ? 'cursor-not-allowed opacity-40' : ''
                    }`}
                  >
                    <td className="py-2.5 pl-3 font-medium text-gray-800 dark:text-gray-100">
                      <span className="flex items-center gap-2">
                        {item.name}
                        {inCart > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">
                            {inCart}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 pr-2 text-right text-xs text-gray-400">
                      {item.itemType === 'product' ? `Stock: ${item.stock}` : ''}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-semibold text-brand-dark dark:text-brand-light">
                      {currency.format(item.price)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ))}
      {!loading && groups.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">Sin resultados.</p>
      )}
    </div>
  )
}
