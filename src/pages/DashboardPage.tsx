import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import {
  useDashboardSummary,
  useLowStock,
  usePaymentMethodTotals,
  useSalesByBranch,
  useSalesTrend,
  useTopItems,
} from '../hooks/useDashboard'
import type { DashboardSummary } from '../types'

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const weekday = new Intl.DateTimeFormat('es-MX', { weekday: 'short' })

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Efectivo',
  card: 'Tarjeta',
  transfer: 'Transferencia',
}

export default function DashboardPage() {
  const { membership } = useAuth()
  const { data: summary, isLoading: loadingSummary } = useDashboardSummary()

  if (!membership) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>
  }

  const isManager = membership.role === 'administrador' || membership.role === 'gerente'

  return isManager ? (
    <ManagerDashboard summary={summary} loadingSummary={loadingSummary} />
  ) : (
    <VendorDashboard summary={summary} loadingSummary={loadingSummary} />
  )
}

function SummaryCard({
  label,
  value,
  loading,
  tone = 'brand',
}: {
  label: string
  value: string
  loading: boolean
  tone?: 'brand' | 'danger'
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p
        className={`font-serif text-3xl font-semibold ${tone === 'danger' ? 'text-danger' : 'text-brand-dark dark:text-brand-light'}`}
      >
        {loading ? '—' : value}
      </p>
    </div>
  )
}

function VendorDashboard({
  summary,
  loadingSummary,
}: {
  summary?: DashboardSummary
  loadingSummary: boolean
}) {
  return (
    <div className="space-y-4">
      <SummaryCard
        label="Ventas de hoy"
        value={`${currency.format(summary?.total ?? 0)} · ${summary?.salesCount ?? 0} ventas`}
        loading={loadingSummary}
      />
      <SummaryCard
        label="Cajas abiertas en tu sucursal"
        value={String(summary?.openCashSessions ?? 0)}
        loading={loadingSummary}
      />
      <Link
        to="/pos"
        className="block rounded-xl bg-brand p-8 text-center font-serif text-xl font-semibold text-white transition hover:bg-brand-dark"
      >
        Ir al punto de venta →
      </Link>
    </div>
  )
}

function ManagerDashboard({
  summary,
  loadingSummary,
}: {
  summary?: DashboardSummary
  loadingSummary: boolean
}) {
  const { data: byBranch } = useSalesByBranch()
  const { data: trend } = useSalesTrend(7)
  const { data: paymentMethods } = usePaymentMethodTotals(7)
  const { data: topItems } = useTopItems(30, 5)
  const { data: lowStock } = useLowStock()

  const maxTrend = Math.max(1, ...(trend ?? []).map((d) => d.total))
  const maxPayment = Math.max(1, ...(paymentMethods ?? []).map((p) => p.total))
  const maxBranch = Math.max(1, ...(byBranch ?? []).map((b) => b.total))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Venta de hoy"
          value={`${currency.format(summary?.total ?? 0)} · ${summary?.salesCount ?? 0} ventas`}
          loading={loadingSummary}
        />
        <SummaryCard
          label="Cajas abiertas"
          value={String(summary?.openCashSessions ?? 0)}
          loading={loadingSummary}
        />
        <SummaryCard
          label="Productos con stock bajo"
          value={String(lowStock?.length ?? 0)}
          loading={false}
          tone={lowStock && lowStock.length > 0 ? 'danger' : 'brand'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 font-serif text-base font-semibold text-brand-dark dark:text-brand-light">
            Ventas — últimos 7 días
          </h3>
          <div className="flex items-end gap-2">
            {(trend ?? []).map((point) => (
              <div key={point.day} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-32 w-full items-end">
                  <div
                    className="w-full rounded-t bg-brand transition-all"
                    style={{ height: `${Math.max(4, (point.total / maxTrend) * 100)}%` }}
                    title={currency.format(point.total)}
                  />
                </div>
                <span className="text-xs text-gray-400">
                  {weekday.format(new Date(`${point.day}T00:00:00`))}
                </span>
              </div>
            ))}
            {(!trend || trend.length === 0) && (
              <p className="text-sm text-gray-400">Sin datos todavía.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 font-serif text-base font-semibold text-brand-dark dark:text-brand-light">
            Métodos de pago (7 días)
          </h3>
          <div className="space-y-2">
            {(paymentMethods ?? []).map((method) => (
              <div key={method.method} className="flex items-center gap-2 text-sm">
                <span className="w-28 text-gray-500 dark:text-gray-400">
                  {PAYMENT_LABEL[method.method] ?? method.method}
                </span>
                <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-gold"
                    style={{ width: `${(method.total / maxPayment) * 100}%` }}
                  />
                </div>
                <span className="w-24 text-right text-gray-700 dark:text-gray-300">
                  {currency.format(method.total)}
                </span>
              </div>
            ))}
            {(!paymentMethods || paymentMethods.length === 0) && (
              <p className="text-sm text-gray-400">Sin pagos todavía.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 font-serif text-base font-semibold text-brand-dark dark:text-brand-light">
            Venta por sucursal (hoy)
          </h3>
          <div className="space-y-2">
            {(byBranch ?? []).map((branch) => (
              <div key={branch.branchId} className="flex items-center gap-2 text-sm">
                <span className="w-24 truncate text-gray-500 dark:text-gray-400">
                  {branch.branchName}
                </span>
                <div className="h-2 flex-1 rounded-full bg-gray-100 dark:bg-gray-700">
                  <div
                    className="h-2 rounded-full bg-brand"
                    style={{ width: `${(branch.total / maxBranch) * 100}%` }}
                  />
                </div>
                <span className="w-24 text-right text-gray-700 dark:text-gray-300">
                  {currency.format(branch.total)}
                </span>
              </div>
            ))}
            {(!byBranch || byBranch.length === 0) && (
              <p className="text-sm text-gray-400">Sin sucursales todavía.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 font-serif text-base font-semibold text-brand-dark dark:text-brand-light">
            Más vendidos (30 días)
          </h3>
          <div className="space-y-1 text-sm">
            {(topItems ?? []).map((item) => (
              <div
                key={`${item.itemType}-${item.name}`}
                className="flex items-center justify-between"
              >
                <span className="text-gray-700 dark:text-gray-300">{item.name}</span>
                <span className="text-gray-400">
                  {item.quantity} · {currency.format(item.total)}
                </span>
              </div>
            ))}
            {(!topItems || topItems.length === 0) && (
              <p className="text-gray-400">Aún no hay ventas.</p>
            )}
          </div>
        </div>
      </div>

      {lowStock && lowStock.length > 0 && (
        <div className="rounded-xl border border-danger/30 bg-white p-6 dark:bg-gray-800">
          <h3 className="mb-3 font-serif text-base font-semibold text-danger">Stock bajo</h3>
          <div className="space-y-1 text-sm">
            {lowStock.map((item) => (
              <div
                key={`${item.businessProductId}-${item.branchId}`}
                className="flex items-center justify-between"
              >
                <span className="text-gray-700 dark:text-gray-300">
                  {item.name} — {item.branchName}
                </span>
                <span className="text-danger">
                  {item.stock} / mín. {item.minimumStock}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
