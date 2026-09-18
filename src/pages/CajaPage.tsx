import { useMemo, useState } from 'react'
import BranchPicker from '../components/BranchPicker'
import { useActiveBranch } from '../hooks/useActiveBranch'
import {
  useCashMovements,
  useCashRegisters,
  useCloseCashSession,
  useCreateCashRegister,
  useCurrentCashSession,
  useOpenCashSession,
  useRegisterCashMovement,
} from '../hooks/useCaja'
import type { CashMovementType } from '../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

const MOVEMENT_LABEL: Record<string, string> = {
  sale: 'Venta',
  cash_in: 'Entrada',
  cash_out: 'Retiro',
  adjustment: 'Ajuste',
}

function CashBoxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path strokeLinecap="round" d="M8 7V5a4 4 0 0 1 8 0v2" />
      <circle cx="12" cy="13.5" r="2" />
    </svg>
  )
}

function ArrowUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0-6 6m6-6 6 6" />
    </svg>
  )
}

function ArrowDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0 6-6m-6 6-6-6" />
    </svg>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path strokeLinecap="round" d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

export default function CajaPage() {
  const activeBranchId = useActiveBranch()
  const { data: registers, isLoading: loadingRegisters } = useCashRegisters(activeBranchId)
  const createRegister = useCreateCashRegister()

  // MVP: una caja por sucursal. Si en el futuro se necesitan varias, aquí
  // se agregaría un selector en vez de tomar la primera.
  const register = registers?.[0] ?? null

  const { data: session, isLoading: loadingSession } = useCurrentCashSession(register?.id ?? null)
  const { data: movements } = useCashMovements(session?.id ?? null)

  const openSession = useOpenCashSession()
  const closeSession = useCloseCashSession()
  const registerMovement = useRegisterCashMovement()

  const [openingAmount, setOpeningAmount] = useState('')
  const [countedAmount, setCountedAmount] = useState('')
  const [movementAmount, setMovementAmount] = useState('')
  const [movementType, setMovementType] = useState<Exclude<CashMovementType, 'sale'>>('cash_out')
  const [movementReason, setMovementReason] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )
  const [closeResult, setCloseResult] = useState<{ expected: number; difference: number } | null>(
    null,
  )

  const runningTotal = useMemo(() => {
    if (!session) return 0
    const movementsSum = (movements ?? []).reduce((sum, m) => sum + m.amount, 0)
    return session.openingAmount + movementsSum
  }, [session, movements])

  if (!activeBranchId) {
    return <BranchPicker title="Elige una sucursal para abrir caja" />
  }

  if (loadingRegisters) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>
  }

  if (!register) {
    return (
      <div className="animate-fade-in flex flex-col items-center gap-3 rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <CashBoxIcon className="h-10 w-10 text-brand" />
        <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
          Esta sucursal aún no tiene una caja registrada
        </h2>
        <button
          onClick={() =>
            createRegister.mutate({ branchId: activeBranchId, name: 'Caja principal' })
          }
          disabled={createRegister.isPending}
          className="mt-1 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:opacity-50"
        >
          {createRegister.isPending ? 'Creando…' : 'Crear caja principal'}
        </button>
      </div>
    )
  }

  if (loadingSession) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando caja…</p>
  }

  if (!session) {
    return (
      <div className="animate-fade-in mx-auto max-w-sm rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center gap-2">
          <CashBoxIcon className="h-5 w-5 text-brand" />
          <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
            Abrir caja — {register.name}
          </h2>
        </div>

        {closeResult && (
          <div className="mb-4 rounded-lg bg-brand-tint p-3 text-sm text-brand-dark dark:bg-brand/20 dark:text-brand-light">
            <p>Última sesión — esperado: {currency.format(closeResult.expected)}</p>
            <p className={closeResult.difference === 0 ? '' : closeResult.difference > 0 ? 'text-success' : 'text-danger'}>
              Diferencia: {currency.format(closeResult.difference)}
            </p>
          </div>
        )}

        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
          Fondo inicial
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={openingAmount}
          onChange={(event) => setOpeningAmount(event.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors duration-150 focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />

        {feedback && (
          <p
            className={`mb-3 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}
          >
            {feedback.text}
          </p>
        )}

        <button
          onClick={() => {
            const amount = Number(openingAmount)
            if (Number.isNaN(amount) || amount < 0) {
              setFeedback({ type: 'error', text: 'Ingresa un fondo inicial válido' })
              return
            }
            setFeedback(null)
            openSession.mutate(
              { cashRegisterId: register.id, openingAmount: amount },
              {
                onSuccess: () => setOpeningAmount(''),
                onError: (error) =>
                  setFeedback({
                    type: 'error',
                    text: error instanceof Error ? error.message : 'No se pudo abrir la caja',
                  }),
              },
            )
          }}
          disabled={openSession.isPending}
          className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
        >
          {openSession.isPending ? 'Abriendo…' : 'Abrir caja'}
        </button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-1 flex items-center gap-2">
          <CashBoxIcon className="h-5 w-5 text-brand" />
          <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
            {register.name}
          </h2>
        </div>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Abierta {new Date(session.openedAt).toLocaleString('es-MX')}
        </p>

        <div className="mb-5 rounded-2xl bg-brand-tint px-4 py-4 text-center dark:bg-brand/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-dark/70 dark:text-brand-light/70">
            Efectivo esperado ahora
          </p>
          <p className="font-serif text-3xl font-bold text-brand-dark dark:text-brand-light">
            {currency.format(runningTotal)}
          </p>
        </div>

        <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Movimiento manual
        </h3>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <button
            onClick={() => setMovementType('cash_in')}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors duration-150 ${
              movementType === 'cash_in'
                ? 'border-success bg-success/10 text-success'
                : 'border-gray-200 text-gray-500 hover:border-success/50 dark:border-gray-600 dark:text-gray-400'
            }`}
          >
            <ArrowUpIcon className="h-4 w-4" />
            Entrada
          </button>
          <button
            onClick={() => setMovementType('cash_out')}
            className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors duration-150 ${
              movementType === 'cash_out'
                ? 'border-danger bg-danger/10 text-danger'
                : 'border-gray-200 text-gray-500 hover:border-danger/50 dark:border-gray-600 dark:text-gray-400'
            }`}
          >
            <ArrowDownIcon className="h-4 w-4" />
            Retiro
          </button>
        </div>
        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Monto"
          value={movementAmount}
          onChange={(event) => setMovementAmount(event.target.value)}
          className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors duration-150 focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <input
          type="text"
          placeholder="Motivo (opcional)"
          value={movementReason}
          onChange={(event) => setMovementReason(event.target.value)}
          className="mb-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors duration-150 focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <button
          onClick={() => {
            const amount = Number(movementAmount)
            if (Number.isNaN(amount) || amount <= 0) {
              setFeedback({ type: 'error', text: 'Ingresa un monto válido' })
              return
            }
            setFeedback(null)
            registerMovement.mutate(
              {
                sessionId: session.id,
                type: movementType,
                amount,
                reason: movementReason || undefined,
              },
              {
                onSuccess: () => {
                  setMovementAmount('')
                  setMovementReason('')
                },
                onError: (error) =>
                  setFeedback({
                    type: 'error',
                    text: error instanceof Error ? error.message : 'No se pudo registrar el movimiento',
                  }),
              },
            )
          }}
          disabled={registerMovement.isPending}
          className="w-full rounded-lg border border-gray-300 py-2 text-sm font-semibold text-gray-700 transition-colors duration-150 hover:border-brand hover:text-brand-dark disabled:opacity-50 dark:border-gray-600 dark:text-gray-200"
        >
          {registerMovement.isPending ? 'Guardando…' : 'Registrar movimiento'}
        </button>

        {feedback && (
          <p
            className={`mt-3 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}
          >
            {feedback.text}
          </p>
        )}
      </div>

      <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-3 flex items-center gap-2">
          <LockIcon className="h-5 w-5 text-brand" />
          <h3 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
            Cerrar caja
          </h3>
        </div>
        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
          Efectivo contado
        </label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={countedAmount}
          onChange={(event) => setCountedAmount(event.target.value)}
          className="mb-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-colors duration-150 focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />

        {countedAmount !== '' && !Number.isNaN(Number(countedAmount)) && (
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Diferencia estimada:{' '}
            <span
              className={
                Number(countedAmount) - runningTotal === 0
                  ? 'text-gray-700 dark:text-gray-300'
                  : Number(countedAmount) - runningTotal > 0
                    ? 'text-success'
                    : 'text-danger'
              }
            >
              {currency.format(Number(countedAmount) - runningTotal)}
            </span>
          </p>
        )}

        <button
          onClick={() => {
            const amount = Number(countedAmount)
            if (Number.isNaN(amount) || amount < 0) {
              setFeedback({ type: 'error', text: 'Ingresa el efectivo contado' })
              return
            }
            setFeedback(null)
            closeSession.mutate(
              { sessionId: session.id, cashRegisterId: register.id, countedAmount: amount },
              {
                onSuccess: (result) => {
                  setCloseResult({
                    expected: result.expected_amount,
                    difference: result.difference,
                  })
                  setCountedAmount('')
                },
                onError: (error) =>
                  setFeedback({
                    type: 'error',
                    text: error instanceof Error ? error.message : 'No se pudo cerrar la caja',
                  }),
              },
            )
          }}
          disabled={closeSession.isPending}
          className="w-full rounded-lg bg-brand-dark py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
        >
          {closeSession.isPending ? 'Cerrando…' : 'Cerrar caja'}
        </button>

        <h4 className="mb-2 mt-6 text-sm font-semibold text-gray-700 dark:text-gray-300">
          Movimientos de la sesión
        </h4>
        <div className="max-h-64 space-y-1 overflow-y-auto text-sm">
          {(movements ?? []).map((movement) => (
            <div
              key={movement.id}
              className="flex items-center justify-between rounded-lg border-b border-gray-100 px-1 py-1.5 transition-colors duration-100 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-900/50"
            >
              <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                {movement.amount >= 0 ? (
                  <ArrowUpIcon className="h-3.5 w-3.5 text-success" />
                ) : (
                  <ArrowDownIcon className="h-3.5 w-3.5 text-danger" />
                )}
                {MOVEMENT_LABEL[movement.type] ?? movement.type}
              </span>
              <span className={movement.amount >= 0 ? 'text-success' : 'text-danger'}>
                {currency.format(movement.amount)}
              </span>
            </div>
          ))}
          {(!movements || movements.length === 0) && (
            <p className="text-gray-400">Sin movimientos todavía.</p>
          )}
        </div>
      </div>
    </div>
  )
}
