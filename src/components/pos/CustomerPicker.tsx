import { useEffect, useRef, useState } from 'react'
import Modal from '../Modal'
import { useCreateCustomer, useSearchCustomers, type Customer } from '../../hooks/useCustomers'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

// Buscador de cliente (nombre/teléfono) para la venta a fiado, con alta
// rápida sin salir del flujo de venta — igual espíritu que
// ComboCreateSelect (marca/categoría/unidad), pero con su propio modal en
// vez de una fila inline, porque un cliente necesita más de un campo
// (nombre + teléfono).
export default function CustomerPicker({
  value,
  onChange,
}: {
  value: Customer | null
  onChange: (customer: Customer | null) => void
}) {
  const [query, setQuery] = useState(value?.name ?? '')
  const [open, setOpen] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' })
  const containerRef = useRef<HTMLDivElement>(null)

  const { data: results, isLoading } = useSearchCustomers(query)
  const createCustomer = useCreateCustomer()

  useEffect(() => {
    setQuery(value?.name ?? '')
  }, [value?.id, value?.name])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery(value?.name ?? '')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [value])

  function openCreateModal() {
    setNewCustomer({ name: query.trim(), phone: '' })
    setShowCreate(true)
    setOpen(false)
  }

  function handleCreate() {
    if (!newCustomer.name.trim()) return
    createCustomer.mutate(
      { name: newCustomer.name.trim(), phone: newCustomer.phone.trim() },
      {
        onSuccess: (customer) => {
          onChange(customer)
          setQuery(customer.name)
          setShowCreate(false)
        },
      },
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">Cliente</label>
      <input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          if (value) onChange(null)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar por nombre o teléfono…"
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />
      {value && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Saldo actual: {currency.format(value.balance)}
          {value.creditLimit != null && ` de ${currency.format(value.creditLimit)} límite`}
        </p>
      )}

      {open && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
          {isLoading && <p className="px-3 py-2 text-sm text-gray-400">Buscando…</p>}
          {!isLoading &&
            results?.map((customer) => (
              <button
                key={customer.id}
                type="button"
                onClick={() => {
                  onChange(customer)
                  setQuery(customer.name)
                  setOpen(false)
                }}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-tint dark:text-gray-100 dark:hover:bg-brand/20"
              >
                {customer.name}
                {customer.phone && <span className="text-gray-400"> — {customer.phone}</span>}
              </button>
            ))}
          {!isLoading && query.trim().length > 0 && !results?.length && (
            <p className="px-3 py-2 text-sm text-gray-400">Sin resultados</p>
          )}
          {query.trim().length > 0 && (
            <button
              type="button"
              onClick={openCreateModal}
              className="block w-full border-t border-gray-100 px-3 py-2 text-left text-sm font-medium text-brand-dark hover:bg-brand-tint dark:border-gray-700 dark:text-brand-light dark:hover:bg-brand/20"
            >
              + Nuevo cliente
            </button>
          )}
        </div>
      )}

      {showCreate && (
        <Modal
          title="Nuevo cliente"
          onClose={() => setShowCreate(false)}
          isDirty={!!newCustomer.name || !!newCustomer.phone}
        >
          <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">Nombre</label>
          <input
            autoFocus
            value={newCustomer.name}
            onChange={(event) => setNewCustomer((p) => ({ ...p, name: event.target.value }))}
            className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
            Teléfono (opcional)
          </label>
          <input
            value={newCustomer.phone}
            onChange={(event) => setNewCustomer((p) => ({ ...p, phone: event.target.value }))}
            className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <button
            onClick={handleCreate}
            disabled={!newCustomer.name.trim() || createCustomer.isPending}
            className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
          >
            {createCustomer.isPending ? 'Creando…' : 'Crear cliente'}
          </button>
        </Modal>
      )}
    </div>
  )
}
