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

const PAYMENT_COLOR: Record<string, string> = {
  cash: 'rgb(var(--brand))',
  card: '#B58A2A',
  transfer: 'rgb(var(--brand-light))',
}

function TrendArea({ data }: { data: { day: string; total: number }[] }) {
  const width = 280
  const height = 120
  const padding = 8
  const max = Math.max(1, ...data.map((d) => d.total))
  const stepX = data.length > 1 ? (width - padding * 2) / (data.length - 1) : 0
  const points = data.map((d, i) => ({
    x: padding + stepX * i,
    y: height - padding - (d.total / max) * (height - padding * 2),
    total: d.total,
    day: d.day,
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const baseline = height - padding
  const areaPath =
    points.length > 0
      ? `${linePath} L${points[points.length - 1].x},${baseline} L${points[0].x},${baseline} Z`
      : ''

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {points.length > 0 && (
          <>
            <path d={areaPath} fill="url(#trendFill)" />
            <path
              d={linePath}
              fill="none"
              stroke="rgb(var(--brand))"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="transition-all duration-300"
            />
            {points.map((p) => (
              <circle key={p.day} cx={p.x} cy={p.y} r="3" fill="rgb(var(--brand))">
                <title>{currency.format(p.total)}</title>
              </circle>
            ))}
          </>
        )}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-gray-400">
        {data.map((d) => (
          <span key={d.day}>{weekday.format(new Date(`${d.day}T00:00:00`))}</span>
        ))}
      </div>
    </div>
  )
}

function PaymentDonut({ data }: { data: { method: string; total: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.total, 0)
  const radius = 42
  const circumference = 2 * Math.PI * radius
  let offset = 0

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 100 100" className="h-32 w-32 -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="14"
            className="stroke-gray-100 dark:stroke-gray-700"
          />
          {total > 0 &&
            data.map((d) => {
              const fraction = d.total / total
              const length = fraction * circumference
              const segment = (
                <circle
                  key={d.method}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke={PAYMENT_COLOR[d.method] ?? '#9CA3AF'}
                  strokeWidth="14"
                  strokeDasharray={`${length} ${circumference - length}`}
                  strokeDashoffset={-offset}
                  className="transition-all duration-300"
                />
              )
              offset += length
              return segment
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase text-gray-400">Total</span>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {currency.format(total)}
          </span>
        </div>
      </div>
      <div className="space-y-1.5 text-sm">
        {data.map((d) => (
          <div key={d.method} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: PAYMENT_COLOR[d.method] ?? '#9CA3AF' }}
            />
            <span className="w-28 text-gray-500 dark:text-gray-400">
              {PAYMENT_LABEL[d.method] ?? d.method}
            </span>
            <span className="font-medium text-gray-700 dark:text-gray-200">
              {currency.format(d.total)}
            </span>
          </div>
        ))}
        {data.length === 0 && <p className="text-gray-400">Sin pagos todavía.</p>}
      </div>
    </div>
  )
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
          {trend && trend.length > 0 ? (
            <TrendArea data={trend} />
          ) : (
            <p className="text-sm text-gray-400">Sin datos todavía.</p>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 font-serif text-base font-semibold text-brand-dark dark:text-brand-light">
            Métodos de pago (7 días)
          </h3>
          <PaymentDonut data={paymentMethods ?? []} />
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
