import { useMemo, useState } from 'react'
import BranchPicker from '../components/BranchPicker'
import CatalogGrid from '../components/pos/CatalogGrid'
import DepartmentTable from '../components/pos/DepartmentTable'
import ScanTicket from '../components/pos/ScanTicket'
import { useActiveBranch } from '../hooks/useActiveBranch'
import { useBusinessModules } from '../hooks/useBusinessModules'
import { usePosCatalog } from '../hooks/usePosCatalog'
import { usePosLayout } from '../hooks/usePosLayout'
import { useCreateSale } from '../hooks/useCreateSale'
import { useLabels } from '../hooks/useLabels'
import { useReceiptPrinter } from '../hooks/useReceiptPrinter'
import type { CartLine, CatalogItem, PaymentMethod } from '../types'
import { getErrorMessage } from '../utils/getErrorMessage'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path strokeLinecap="round" d="m21 21-4.3-4.3" />
    </svg>
  )
}

function CartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h2l2.4 12.2a2 2 0 0 0 2 1.6h7.2a2 2 0 0 0 2-1.6L20 8H6" />
      <circle cx="9" cy="20" r="1.4" />
      <circle cx="17" cy="20" r="1.4" />
    </svg>
  )
}

function CashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

function CardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" d="M3 10h18" />
    </svg>
  )
}

function TransferIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h13l-3-3m3 3-3 3M20 16H7l3 3m-3-3 3-3" />
    </svg>
  )
}

const PAYMENT_METHODS: { value: PaymentMethod; label: string; icon: typeof CashIcon }[] = [
  { value: 'cash', label: 'Efectivo', icon: CashIcon },
  { value: 'card', label: 'Tarjeta', icon: CardIcon },
  { value: 'transfer', label: 'Transferencia', icon: TransferIcon },
]

export default function PosPage() {
  const activeBranchId = useActiveBranch()
  const labels = useLabels()
  const { data: posLayout = 'catalogo' } = usePosLayout()
  const { data: modules } = useBusinessModules()
  const {
    data: catalog,
    isLoading: loadingCatalog,
    error: catalogError,
  } = usePosCatalog(activeBranchId, modules)

  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<Map<string, CartLine>>(new Map())
  const [cartOpen, setCartOpen] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )
  const [lastSaleId, setLastSaleId] = useState<string | null>(null)

  const createSale = useCreateSale()
  const { print, printable } = useReceiptPrinter()

  const filteredCatalog = useMemo(() => {
    if (!catalog) return []
    const term = search.trim().toLowerCase()
    if (!term) return catalog
    return catalog.filter((item) => item.name.toLowerCase().includes(term))
  }, [catalog, search])

  const cartLines = useMemo(() => Array.from(cart.values()), [cart])
  const total = cartLines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)
  const cartQuantities = useMemo(
    () => new Map(cartLines.map((line) => [line.item.id, line.quantity])),
    [cartLines],
  )

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
        onSuccess: ({ saleId, folio }) => {
          setFeedback({
            type: 'success',
            text: folio ? `Venta registrada — folio ${folio}` : 'Venta registrada',
          })
          setLastSaleId(saleId)
          setCart(new Map())
          setCartOpen(false)
        },
        onError: (error) => {
          setFeedback({
            type: 'error',
            text: getErrorMessage(error, 'No se pudo registrar la venta'),
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
      <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
            {labels.posTitle}
          </h2>
          {posLayout !== 'abarrotes' && (
            <div className="relative w-64">
              <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar producto o servicio…"
                className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-sm transition-colors duration-150 focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
              />
            </div>
          )}
        </div>

        {loadingCatalog && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando catálogo…</p>
        )}
        {catalogError && (
          <p className="text-sm text-danger">No se pudo cargar el catálogo. Intenta de nuevo.</p>
        )}

        {posLayout === 'ferreteria' && (
          <DepartmentTable
            items={filteredCatalog}
            loading={loadingCatalog}
            onAdd={addToCart}
            cartQuantities={cartQuantities}
          />
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
          <CatalogGrid
            items={filteredCatalog}
            loading={loadingCatalog}
            onAdd={addToCart}
            cartQuantities={cartQuantities}
          />
        )}
      </div>

      <div
        className={`fixed inset-x-0 bottom-0 z-30 flex max-h-[85vh] flex-col rounded-t-2xl border border-gray-200 bg-white p-4 shadow-2xl transition-transform duration-300 dark:border-gray-700 dark:bg-gray-800 lg:static lg:max-h-none lg:translate-y-0 lg:overflow-visible lg:rounded-xl lg:shadow-sm ${
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

        <h3 className="mb-3 hidden items-center gap-2 font-serif text-base font-semibold text-brand-dark dark:text-brand-light lg:flex">
          <CartIcon className="h-4 w-4" />
          Carrito
        </h3>

        <div className={`min-h-0 flex-1 overflow-y-auto ${cartOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="space-y-2">
            {cartLines.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CartIcon className="h-8 w-8 text-gray-300 dark:text-gray-600" />
                <p className="text-sm text-gray-400">Aún no hay productos agregados.</p>
              </div>
            )}
            {cartLines.map((line) => (
              <div
                key={line.item.id}
                className="flex animate-fade-in items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-900/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-800 dark:text-gray-200">
                    {line.item.name}
                  </p>
                  <p className="text-gray-400">{currency.format(line.item.price)} c/u</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(line.item.id, line.quantity - 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors duration-150 hover:border-brand hover:text-brand-dark dark:border-gray-600 dark:text-gray-400"
                  >
                    −
                  </button>
                  <span className="w-5 text-center font-medium">{line.quantity}</span>
                  <button
                    onClick={() => updateQuantity(line.item.id, line.quantity + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition-colors duration-150 hover:border-brand hover:text-brand-dark dark:border-gray-600 dark:text-gray-400"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-700">
            <div className="mb-3 flex items-center justify-between rounded-xl bg-brand-tint px-4 py-3 font-serif text-lg font-semibold text-brand-dark dark:bg-brand/20 dark:text-brand-light">
              <span>Total</span>
              <span>{currency.format(total)}</span>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  onClick={() => setPaymentMethod(method.value)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors duration-150 ${
                    paymentMethod === method.value
                      ? 'border-brand bg-brand-tint text-brand-dark dark:bg-brand/20 dark:text-brand-light'
                      : 'border-gray-200 text-gray-500 hover:border-brand dark:border-gray-600 dark:text-gray-400'
                  }`}
                >
                  <method.icon className="h-4 w-4" />
                  {method.label}
                </button>
              ))}
            </div>

            {feedback && (
              <div className="mb-3">
                <p className={`text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
                  {feedback.text}
                </p>
                {feedback.type === 'success' && lastSaleId && (
                  <button
                    onClick={() => print(lastSaleId)}
                    className="mt-1.5 text-sm font-semibold text-brand transition-colors duration-150 hover:text-brand-dark"
                  >
                    Imprimir ticket
                  </button>
                )}
              </div>
            )}

            <button
              onClick={handleCheckout}
              disabled={cartLines.length === 0 || createSale.isPending}
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
            >
              {createSale.isPending ? 'Cobrando…' : 'Cobrar'}
            </button>
          </div>
        </div>
      </div>
      {printable}
    </div>
  )
}
