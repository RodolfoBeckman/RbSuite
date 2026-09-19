import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useActiveBranch } from '../hooks/useActiveBranch'
import { useCashRegisters, useCurrentCashSession } from '../hooks/useCaja'
import {
  useAdjustCustomerBalance,
  useCustomer,
  useCustomerAccountMovements,
  useRecordCustomerPayment,
  useSearchCustomers,
} from '../hooks/useCustomers'
import { useReportCustomerBalances } from '../hooks/useReports'
import type { PaymentMethod } from '../types'
import { getErrorMessage } from '../utils/getErrorMessage'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

const MOVEMENT_LABEL: Record<string, string> = {
  charge: 'Cargo',
  payment: 'Abono',
  adjustment: 'Ajuste',
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
  fiado: 'Fiado',
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path strokeLinecap="round" d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 8a3 3 0 1 1 0 6M21 20c0-2.8-1.8-5.1-4.3-5.8" />
    </svg>
  )
}

function CustomerList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const { data: balances, isLoading: loadingBalances } = useReportCustomerBalances()
  const { data: searchResults, isLoading: loadingSearch } = useSearchCustomers(search)

  const showingSearch = search.trim().length > 0
  const loading = showingSearch ? loadingSearch : loadingBalances

  return (
    <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar por nombre o teléfono…"
        className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />
      {!showingSearch && (
        <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Cuentas por cobrar</p>
      )}
      {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}

      <div className="max-h-[60vh] space-y-1 overflow-y-auto">
        {showingSearch &&
          !loadingSearch &&
          searchResults?.map((customer) => (
            <button
              key={customer.id}
              onClick={() => onSelect(customer.id)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 ${
                selectedId === customer.id
                  ? 'bg-brand-tint text-brand-dark dark:bg-brand/20 dark:text-brand-light'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
              }`}
            >
              <span>
                {customer.name}
                {customer.phone && <span className="text-gray-400"> — {customer.phone}</span>}
              </span>
              <span className="font-semibold">{currency.format(customer.balance)}</span>
            </button>
          ))}
        {!showingSearch &&
          !loadingBalances &&
          balances?.map((customer) => (
            <button
              key={customer.customerId}
              onClick={() => onSelect(customer.customerId)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150 ${
                selectedId === customer.customerId
                  ? 'bg-brand-tint text-brand-dark dark:bg-brand/20 dark:text-brand-light'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-900/50'
              }`}
            >
              <span>
                {customer.name}
                {customer.phone && <span className="text-gray-400"> — {customer.phone}</span>}
              </span>
              <span className="font-semibold text-danger">{currency.format(customer.balance)}</span>
            </button>
          ))}
        {!showingSearch && !loadingBalances && !balances?.length && (
          <p className="text-sm text-gray-400">Nadie debe nada por ahora.</p>
        )}
        {showingSearch && !loadingSearch && !searchResults?.length && (
          <p className="text-sm text-gray-400">Sin resultados.</p>
        )}
      </div>
    </div>
  )
}

function RecordPaymentForm({ customerId }: { customerId: string }) {
  const activeBranchId = useActiveBranch()
  const { data: registers } = useCashRegisters(activeBranchId)
  const register = registers?.[0] ?? null
  const { data: session } = useCurrentCashSession(register?.id ?? null)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<Exclude<PaymentMethod, 'fiado'>>('cash')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const recordPayment = useRecordCustomerPayment()

  function handleSubmit() {
    const value = Number(amount)
    if (!activeBranchId || Number.isNaN(value) || value <= 0) {
      setFeedback({ type: 'error', text: 'Ingresa un monto válido' })
      return
    }
    if (method === 'cash' && !session) {
      setFeedback({ type: 'error', text: 'Abre la caja de esta sucursal antes de registrar un abono en efectivo' })
      return
    }
    setFeedback(null)
    recordPayment.mutate(
      {
        customerId,
        branchId: activeBranchId,
        amount: value,
        paymentMethod: method,
        cashSessionId: session?.id ?? null,
      },
      {
        onSuccess: () => {
          setFeedback({ type: 'success', text: 'Abono registrado' })
          setAmount('')
        },
        onError: (error) =>
          setFeedback({ type: 'error', text: getErrorMessage(error, 'No se pudo registrar el abono') }),
      },
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Registrar abono</h4>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Monto"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <select
          value={method}
          onChange={(event) => setMethod(event.target.value as Exclude<PaymentMethod, 'fiado'>)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="transfer">Transferencia</option>
        </select>
      </div>
      <button
        onClick={handleSubmit}
        disabled={recordPayment.isPending}
        className="w-full rounded-lg bg-brand py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:opacity-50"
      >
        {recordPayment.isPending ? 'Guardando…' : 'Registrar abono'}
      </button>
      {feedback && (
        <p className={`mt-2 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
          {feedback.text}
        </p>
      )}
    </div>
  )
}

function AdjustBalanceForm({ customerId }: { customerId: string }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const adjustBalance = useAdjustCustomerBalance()

  function handleSubmit() {
    const value = Number(amount)
    if (Number.isNaN(value) || value === 0) {
      setFeedback({ type: 'error', text: 'Ingresa un monto distinto de cero' })
      return
    }
    if (!reason.trim()) {
      setFeedback({ type: 'error', text: 'El motivo es obligatorio' })
      return
    }
    setFeedback(null)
    adjustBalance.mutate(
      { customerId, amount: value, reason: reason.trim() },
      {
        onSuccess: () => {
          setFeedback({ type: 'success', text: 'Saldo ajustado' })
          setAmount('')
          setReason('')
        },
        onError: (error) =>
          setFeedback({ type: 'error', text: getErrorMessage(error, 'No se pudo ajustar el saldo') }),
      },
    )
  }

  return (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-gray-800">
      <h4 className="mb-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
        Ajustar / condonar saldo
      </h4>
      <p className="mb-3 text-xs text-gray-400">
        Usa un monto negativo para condonar deuda (ej. -200), positivo para corregir un cargo de menos.
      </p>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="Monto (+/-)"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Motivo (obligatorio)"
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={adjustBalance.isPending}
        className="w-full rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 transition-colors duration-150 hover:border-brand hover:text-brand-dark disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
      >
        {adjustBalance.isPending ? 'Guardando…' : 'Ajustar saldo'}
      </button>
      {feedback && (
        <p className={`mt-2 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
          {feedback.text}
        </p>
      )}
    </div>
  )
}

function CustomerDetail({ customerId }: { customerId: string }) {
  const { membership } = useAuth()
  const canAdjust = membership?.role === 'administrador' || membership?.role === 'gerente'
  const { data: customer, isLoading: loadingCustomer } = useCustomer(customerId)
  const { data: movements, isLoading: loadingMovements } = useCustomerAccountMovements(customerId)

  if (loadingCustomer) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>
  }
  if (!customer) return null

  return (
    <div className="space-y-4">
      <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
          {customer.name}
        </h3>
        {customer.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>}
        <p className="mt-2 text-2xl font-bold text-danger">{currency.format(customer.balance)}</p>
        {customer.creditLimit != null && (
          <p className="text-xs text-gray-400">Límite de crédito: {currency.format(customer.creditLimit)}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RecordPaymentForm customerId={customerId} />
        {canAdjust && <AdjustBalanceForm customerId={customerId} />}
      </div>

      <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <h4 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Estado de cuenta
        </h4>
        {loadingMovements && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}
        {!loadingMovements && !movements?.length && (
          <p className="text-sm text-gray-400">Sin movimientos todavía.</p>
        )}
        <div className="max-h-96 space-y-1 overflow-y-auto text-sm">
          {movements?.map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between border-b border-gray-100 py-2 dark:border-gray-700"
            >
              <div>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {MOVEMENT_LABEL[movement.type]}
                  {movement.saleFolio && ` — folio ${movement.saleFolio}`}
                  {movement.paymentMethod && ` (${PAYMENT_LABEL[movement.paymentMethod]})`}
                </p>
                <p className="text-xs text-gray-400">
                  {dateTime.format(new Date(movement.createdAt))} · {movement.branchName}
                  {movement.reason && ` · ${movement.reason}`}
                </p>
              </div>
              <span className={movement.amount >= 0 ? 'font-semibold text-danger' : 'font-semibold text-success'}>
                {movement.amount >= 0 ? '+' : ''}
                {currency.format(movement.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
      <div>
        <div className="mb-4 flex items-center gap-2">
          <UsersIcon className="h-5 w-5 text-brand" />
          <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
            Clientes
          </h2>
        </div>
        <CustomerList selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      <div>
        {selectedId ? (
          <CustomerDetail customerId={selectedId} />
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400 dark:border-gray-600">
            Elige un cliente de la lista para ver su estado de cuenta.
          </div>
        )}
      </div>
    </div>
  )
}
