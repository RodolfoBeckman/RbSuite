import { useMemo, useState } from 'react'
import BranchPicker from '../components/BranchPicker'
import CatalogGrid from '../components/pos/CatalogGrid'
import DepartmentTable from '../components/pos/DepartmentTable'
import ScanTicket from '../components/pos/ScanTicket'
import { useActiveBranch } from '../hooks/useActiveBranch'
import { usePosCatalog } from '../hooks/usePosCatalog'
import { usePosLayout } from '../hooks/usePosLayout'
import { useCreateSale } from '../hooks/useCreateSale'
import { useLabels } from '../hooks/useLabels'
import type { CartLine, CatalogItem, PaymentMethod } from '../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'card', label: 'Tarjeta' },
  { value: 'transfer', label: 'Transferencia' },
]

export default function PosPage() {
  const activeBranchId = useActiveBranch()
  const labels = useLabels()
  const { data: posLayout = 'catalogo' } = usePosLayout()
  const {
    data: catalog,
    isLoading: loadingCatalog,
    error: catalogError,
  } = usePosCatalog(activeBranchId)

  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map())
  const [cartOpen, setCartOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  const createSale = useCreateSale()

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

  function handleCheckout() {
    if (!activeBranchId || cartLines.length === 0) return
    setFeedback(null)
    createSale.mutate(
      { branchId: activeBranchId, cartLines, paymentMethod, total },
      {
        onSuccess: ({ folio }) => {
          setFeedback({
            type: 'success',
            text: folio ? `Venta registrada — folio ${folio}` : 'Venta registrada',
          })
          setCart(new Map())
          setCartOpen(false)
        },
        onError: (error) => {
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo registrar la venta',
          })
        },
      },
    )
  }

  if (!activeBranchId) {
    return <BranchPicker title="Elige una sucursal para vender" />
  }

  return (
    <div className="grid grid-cols-1 gap-4 pb-16 lg:grid-cols-[1fr_360px] lg:pb-0">
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
            {labels.posTitle}
          </h2>
          {posLayout !== 'abarrotes' && (
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar producto o servicio…"
              className="w-64 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          )}
        </div>

        {loadingCatalog && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando catálogo…</p>
        )}
        {catalogError && (
          <p className="text-sm text-danger">No se pudo cargar el catálogo. Intenta de nuevo.</p>
        )}

        {posLayout === 'ferreteria' && (
          <DepartmentTable items={filteredCatalog} loading={loadingCatalog} onAdd={addToCart} />
        )}
        {posLayout === 'abarrotes' && (
          <ScanTicket
            items={filteredCatalog}
            search={search}
            setSearch={setSearch}
            onAdd={addToCart}
            total={total}
          />
        )}
        {posLayout === 'catalogo' && (
          <CatalogGrid items={filteredCatalog} loading={loadingCatalog} onAdd={addToCart} />
        )}
      </div>

      <div
        className={`fixed inset-x-0 bottom-0 z-30 flex max-h-[85vh] flex-col rounded-t-2xl border border-gray-200 bg-white p-4 shadow-2xl transition-transform duration-300 dark:border-gray-700 dark:bg-gray-800 lg:static lg:max-h-none lg:translate-y-0 lg:overflow-visible lg:rounded-xl lg:shadow-none ${
          cartOpen ? 'translate-y-0' : 'translate-y-[calc(100%-3.25rem)]'
        }`}
      >
        <button
          onClick={() => setCartOpen((open) => !open)}
          className="relative flex shrink-0 items-center justify-between gap-2 pb-2 lg:hidden"
        >
          <span className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span className="mt-2 text-sm font-semibold text-brand-dark dark:text-brand-light">
            {cartLines.length > 0
              ? `${cartLines.length} · ${currency.format(total)}`
              : 'Carrito vacío'}
          </span>
          <span className="mt-2 text-xs text-gray-400">{cartOpen ? 'Ocultar ▾' : 'Ver ▴'}</span>
        </button>

        <h3 className="mb-3 hidden font-serif text-base font-semibold text-brand-dark dark:text-brand-light lg:block">
          Carrito
        </h3>

        <div className={`min-h-0 flex-1 overflow-y-auto ${cartOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="space-y-2">
            {cartLines.length === 0 && (
              <p className="text-sm text-gray-400">Aún no hay productos agregados.</p>
            )}
            {cartLines.map((line) => (
              <div key={line.item.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-800 dark:text-gray-200">
                    {line.item.name}
                  </p>
                  <p className="text-gray-400">{currency.format(line.item.price)} c/u</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => updateQuantity(line.item.id, line.quantity - 1)}
                    className="h-6 w-6 rounded border border-gray-200 text-gray-500 hover:border-brand dark:border-gray-600 dark:text-gray-400"
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{line.quantity}</span>
                  <button
                    onClick={() => updateQuantity(line.item.id, line.quantity + 1)}
                    className="h-6 w-6 rounded border border-gray-200 text-gray-500 hover:border-brand dark:border-gray-600 dark:text-gray-400"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
            <div className="mb-3 flex items-center justify-between font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
              <span>Total</span>
              <span>{currency.format(total)}</span>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                    paymentMethod === method.value
                      ? 'border-brand bg-brand-tint text-brand-dark dark:bg-brand/20 dark:text-brand-light'
                      : 'border-gray-200 text-gray-500 hover:border-brand dark:border-gray-600 dark:text-gray-400'
                  }`}
                >
                  {method.label}
                </button>
              ))}
            </div>

            {feedback && (
              <p
                className={`mb-3 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}
              >
                {feedback.text}
              </p>
            )}

            <button
              onClick={handleCheckout}
              disabled={cartLines.length === 0 || createSale.isPending}
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
            >
              {createSale.isPending ? 'Cobrando…' : 'Cobrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
