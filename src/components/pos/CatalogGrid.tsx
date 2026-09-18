import type { CatalogItem } from '../../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

// Layout "catalogo" (default): tarjetas visuales, pensado para catálogos
// chicos con mezcla de productos y servicios (ej. salones, boutiques).
export default function CatalogGrid({
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
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((item) => {
        const inCart = cartQuantities.get(item.id) ?? 0
        return (
          <button
            key={`${item.itemType}-${item.id}`}
            onClick={() => onAdd(item)}
            disabled={item.itemType === 'product' && (item.stock ?? 0) <= 0}
            className="relative flex flex-col items-start gap-1 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-brand hover:bg-brand-tint hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-sm dark:border-gray-600 dark:bg-gray-900/40 dark:hover:bg-brand/20"
          >
            {inCart > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white shadow-sm">
                {inCart}
              </span>
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{item.name}</span>
            <span className="text-sm font-semibold text-brand-dark dark:text-brand-light">
              {currency.format(item.price)}
            </span>
            {item.itemType === 'product' && (
              <span className="text-xs text-gray-400">Stock: {item.stock}</span>
            )}
          </button>
        )
      })}
      {!loading && items.length === 0 && (
        <p className="col-span-full text-sm text-gray-400">Sin resultados.</p>
      )}
    </div>
  )
}
