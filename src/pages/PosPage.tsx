import { useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useBranches } from '../hooks/useBranches'
import { usePosCatalog } from '../hooks/usePosCatalog'
import type { CartLine, CatalogItem } from '../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

export default function PosPage() {
  const { activeBranchId, setActiveBranchId } = useAuth()
  const { data: branches, isLoading: loadingBranches } = useBranches()
  const {
    data: catalog,
    isLoading: loadingCatalog,
    error: catalogError,
  } = usePosCatalog(activeBranchId)

  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map())

  const filteredCatalog = useMemo(() => {
    if (!catalog) return []
    const term = search.trim().toLowerCase()
    if (!term) return catalog
    return catalog.filter((item) => item.name.toLowerCase().includes(term))
  }, [catalog, search])

  const cartLines = useMemo(() => Array.from(cart.values()), [cart])
  const total = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)

  function addToCart(item: CatalogItem) {
    setCart((prev) => {
      const next = new Map(prev)
      const existing = next.get(item.id)
      next.set(item.id, { item, quantity: (existing?.quantity ?? 0) + 1 })
      return next
    })
  }

  function updateQuantity(itemId: string, quantity: number) {
    setCart((prev) => {
      const next = new Map(prev)
      if (quantity <= 0) {
        next.delete(itemId)
        return next
      }
      const existing = next.get(itemId)
      if (existing) next.set(itemId, { ...existing, quantity })
      return next
    })
  }

  // Vendedor ya trae branch_id fijo desde su membership. Administrador y
  // Gerente pueden ver todas las sucursales (branch_id null), así que aquí
  // eligen desde cuál sucursal están vendiendo antes de usar el POS.
  if (!activeBranchId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-3 font-serif text-lg font-semibold text-brand-dark">
          Elige una sucursal para vender
        </h2>
        {loadingBranches ? (
          <p className="text-sm text-gray-500">Cargando sucursales…</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {branches?.map((branch) => (
              <button
                key={branch.id}
                onClick={() => setActiveBranchId(branch.id)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand hover:text-brand-dark"
              >
                {branch.name}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-brand-dark">Punto de venta</h2>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar producto o servicio…"
            className="w-64 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-brand focus:outline-none"
          />
        </div>

        {loadingCatalog && <p className="text-sm text-gray-500">Cargando catálogo…</p>}
        {catalogError && (
          <p className="text-sm text-danger">No se pudo cargar el catálogo. Intenta de nuevo.</p>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {filteredCatalog.map((item) => (
            <button
              key={`${item.itemType}-${item.id}`}
              onClick={() => addToCart(item)}
              disabled={item.itemType === 'product' && (item.stock ?? 0) <= 0}
              className="flex flex-col items-start gap-1 rounded-lg border border-gray-200 p-3 text-left transition hover:border-brand hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="text-sm font-medium text-gray-900">{item.name}</span>
              <span className="text-sm font-semibold text-brand-dark">
                {currency.format(item.price)}
              </span>
              {item.itemType === 'product' && (
                <span className="text-xs text-gray-400">Stock: {item.stock}</span>
              )}
            </button>
          ))}
          {!loadingCatalog && filteredCatalog.length === 0 && (
            <p className="col-span-full text-sm text-gray-400">Sin resultados.</p>
          )}
        </div>
      </div>

      <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-4">
        <h3 className="mb-3 font-serif text-base font-semibold text-brand-dark">Carrito</h3>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {cartLines.length === 0 && (
            <p className="text-sm text-gray-400">Aún no hay productos agregados.</p>
          )}
          {cartLines.map((line) => (
            <div key={line.item.id} className="flex items-center justify-between gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-800">{line.item.name}</p>
                <p className="text-gray-400">{currency.format(line.item.price)} c/u</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => updateQuantity(line.item.id, line.quantity - 1)}
                  className="h-6 w-6 rounded border border-gray-200 text-gray-500 hover:border-brand"
                >
                  −
                </button>
                <span className="w-6 text-center">{line.quantity}</span>
                <button
                  onClick={() => updateQuantity(line.item.id, line.quantity + 1)}
                  className="h-6 w-6 rounded border border-gray-200 text-gray-500 hover:border-brand"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <div className="mb-3 flex items-center justify-between font-serif text-lg font-semibold text-brand-dark">
            <span>Total</span>
            <span>{currency.format(total)}</span>
          </div>
          <button
            disabled
            title="El cobro se habilita en la Etapa 3, cuando create_sale quede implementada"
            className="w-full cursor-not-allowed rounded-lg bg-brand py-2.5 text-sm font-semibold text-white opacity-50"
          >
            Cobrar (próximamente)
          </button>
        </div>
      </div>
    </div>
  )
}
