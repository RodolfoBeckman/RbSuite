import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { hasPermission } from '../auth/permissions'
import { useCancelSale, useSalesHistory } from '../hooks/useSales'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const dateTime = new Intl.DateTimeFormat('es-MX', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

export default function SalesHistoryPage() {
  const { membership } = useAuth()
  const canCancel = hasPermission(membership, 'cancel_sale')

  const { data: sales, isLoading, error } = useSalesHistory(7)
  const cancelSale = useCancelSale()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleCancel(saleId: string, folio: number) {
    if (!window.confirm(`¿Cancelar la venta folio ${folio}? Esto repone el inventario vendido.`)) {
      return
    }
    setFeedback(null)
    cancelSale.mutate(saleId, {
      onSuccess: () => setFeedback({ type: 'success', text: `Venta folio ${folio} cancelada` }),
      onError: (err) =>
        setFeedback({
          type: 'error',
          text: err instanceof Error ? err.message : 'No se pudo cancelar la venta',
        }),
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
        Ventas — últimos 7 días
      </h2>

      {feedback && (
        <p
          className={`mb-3 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}
        >
          {feedback.text}
        </p>
      )}

      {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}
      {error && (
        <p className="text-sm text-danger">No se pudo cargar el historial. Intenta de nuevo.</p>
      )}

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {(sales ?? []).map((sale) => (
          <div key={sale.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-gray-800 dark:text-gray-200">
                Folio {sale.folio} — {sale.branchName}
              </p>
              <p className="text-gray-400">{dateTime.format(new Date(sale.createdAt))}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {currency.format(sale.total)}
              </span>
              {sale.status === 'cancelled' ? (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-semibold text-danger">
                  Cancelada
                </span>
              ) : canCancel ? (
                <button
                  onClick={() => handleCancel(sale.id, sale.folio)}
                  disabled={cancelSale.isPending}
                  className="rounded-lg border border-danger px-2.5 py-1 text-xs font-semibold text-danger transition-colors duration-150 hover:bg-danger/10 disabled:opacity-50"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
          </div>
        ))}
        {!isLoading && (!sales || sales.length === 0) && (
          <p className="py-2 text-sm text-gray-400">No hay ventas en este periodo.</p>
        )}
      </div>
    </div>
  )
}
