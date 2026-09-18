import { useEffect, useRef } from 'react'
import type { CatalogItem } from '../../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

// Layout "abarrotes": el flujo es escanear/teclear un código de barras y
// presionar Enter (como un lector físico) en vez de buscar visualmente —
// el total queda en grande junto al campo para confirmar de un vistazo
// mientras se sigue escaneando.
export default function ScanTicket({
  items,
  search,
  setSearch,
  onAdd,
  total,
}: {
  items: CatalogItem[]
  search: string
  setSearch: (value: string) => void
  onAdd: (item: CatalogItem) => void
  total: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleAdd(item: CatalogItem) {
    if (item.itemType === 'product' && (item.stock ?? 0) <= 0) return
    onAdd(item)
    setSearch('')
    inputRef.current?.focus()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    const term = search.trim()
    if (!term) return
    const exactBarcode = items.find((item) => item.barcode === term)
    const match = exactBarcode ?? items[0]
    if (match) handleAdd(match)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escanea o escribe un código/nombre y presiona Enter…"
        className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />

      <p className="my-5 text-center font-serif text-5xl font-bold text-brand-dark dark:text-brand-light">
        {currency.format(total)}
      </p>

      {search.trim().length > 0 && (
        <div className="space-y-1.5">
          {items.slice(0, 8).map((item) => (
            <button
              key={`${item.itemType}-${item.id}`}
              onClick={() => handleAdd(item)}
              disabled={item.itemType === 'product' && (item.stock ?? 0) <= 0}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm transition-colors duration-100 hover:border-brand hover:bg-brand-tint disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-600 dark:hover:bg-brand/20"
            >
              <span className="text-gray-800 dark:text-gray-100">{item.name}</span>
              <span className="whitespace-nowrap font-semibold text-brand-dark dark:text-brand-light">
                {currency.format(item.price)}
              </span>
            </button>
          ))}
          {items.length === 0 && (
            <p className="text-center text-sm text-gray-400">Sin coincidencias.</p>
          )}
        </div>
      )}
    </div>
  )
}
