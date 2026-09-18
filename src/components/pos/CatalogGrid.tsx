import type { CatalogItem } from '../../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

// Layout "catalogo" (default): tarjetas visuales, pensado para catálogos
// chicos con mezcla de productos y servicios (ej. salones, boutiques).
export default function CatalogGrid({
  items,
  loading,
  onAdd,
}: {
  items: CatalogItem[]
  loading: boolean
  onAdd: (item: CatalogItem) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => (
        <button
          key={`${item.itemType}-${item.id}`}
          onClick={() => onAdd(item)}
          disabled={item.itemType === 'product' && (item.stock ?? 0) <= 0}
          className="flex flex-col items-start gap-1 rounded-lg border border-gray-200 p-3 text-left transition hover:border-brand hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:hover:bg-brand/20"
        >
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
          <span className="text-sm font-semibold text-brand-dark dark:text-brand-light">
            {currency.format(item.price)}
          </span>
          {item.itemType === 'product' && (
            <span className="text-xs text-gray-400">Stock: {item.stock}</span>
          )}
        </button>
      ))}
      {!loading && items.length === 0 && (
        <p className="col-span-full text-sm text-gray-400">Sin resultados.</p>
      )}
    </div>
  )
}
