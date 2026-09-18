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
}: {
  items: CatalogItem[]
  loading: boolean
  onAdd: (item: CatalogItem) => void
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
    <div className="divide-y divide-gray-100 dark:divide-gray-700">
      {groups.map(([dept, deptItems]) => (
        <div key={dept}>
          <p className="sticky top-0 z-10 bg-gray-50 px-1 py-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:bg-gray-800">
            {dept}
          </p>
          <table className="w-full text-sm">
            <tbody>
              {deptItems.map((item) => (
                <tr
                  key={`${item.itemType}-${item.id}`}
                  onClick={() => {
                    if (item.itemType === 'product' && (item.stock ?? 0) <= 0) return
                    onAdd(item)
                  }}
                  className={`cursor-pointer border-b border-gray-50 transition-colors duration-100 hover:bg-brand-tint dark:border-gray-800 dark:hover:bg-brand/20 ${
                    item.itemType === 'product' && (item.stock ?? 0) <= 0
                      ? 'cursor-not-allowed opacity-40'
                      : ''
                  }`}
                >
                  <td className="py-2 pl-1 font-medium text-gray-800 dark:text-gray-100">
                    {item.name}
                  </td>
                  <td className="py-2 pr-2 text-right text-xs text-gray-400">
                    {item.itemType === 'product' ? `Stock: ${item.stock}` : ''}
                  </td>
                  <td className="py-2 pr-1 text-right font-semibold text-brand-dark dark:text-brand-light">
                    {currency.format(item.price)}
                  </td>
                </tr>
              ))}
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
