import { useMemo, useState } from 'react'
import {
  previousPeriod,
  useReportPaymentMethods,
  useReportProfitMargin,
  useReportSalesByBranch,
  useReportSalesByEmployee,
  useReportSalesSummary,
  useReportSalesTrend,
  type DateRange,
} from '../hooks/useReports'
import { downloadCsv } from '../utils/csvExport'

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

const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const shortDate = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short' })

function ReportsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5a1 1 0 0 1 1-1h6l2 2h6a1 1 0 0 1 1 1v3M4 19h16M4 19l3-6 4 3 3-5 3 3" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0-4-4m4 4 4-4M4 19h16" />
    </svg>
  )
}

function toInputValue(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function daysAgo(n: number): Date {
  const date = startOfDay(new Date())
  date.setDate(date.getDate() - n)
  return date
}

const PRESETS: { key: string; label: string; range: () => DateRange }[] = [
  { key: 'today', label: 'Hoy', range: () => ({ from: daysAgo(0), to: daysAgo(0) }) },
  { key: 'last7', label: 'Últimos 7 días', range: () => ({ from: daysAgo(6), to: daysAgo(0) }) },
  { key: 'last30', label: 'Últimos 30 días', range: () => ({ from: daysAgo(29), to: daysAgo(0) }) },
  {
    key: 'month',
    label: 'Este mes',
    range: () => {
      const now = new Date()
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: daysAgo(0) }
    },
  },
]

function TrendChart({ data }: { data: { day: string; total: number }[] }) {
  const width = 600
  const height = 140
  const padding = 10
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
  // Con un rango largo, mostrar una etiqueta por punto satura el eje —
  // se limita a ~8 etiquetas repartidas, sin importar cuántos días haya.
  const labelStep = Math.max(1, Math.ceil(points.length / 8))

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-hidden="true">
        <defs>
          <linearGradient id="reportTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity="0" />
          </linearGradient>
        </defs>
        {points.length > 0 && (
          <>
            <path d={areaPath} fill="url(#reportTrendFill)" />
            <path
              d={linePath}
              fill="none"
              stroke="rgb(var(--brand))"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {points.map((p) => (
              <circle key={p.day} cx={p.x} cy={p.y} r="2.5" fill="rgb(var(--brand))">
                <title>
                  {shortDate.format(new Date(`${p.day}T00:00:00`))} — {currency.format(p.total)}
                </title>
              </circle>
            ))}
          </>
        )}
      </svg>
      <div className="mt-1 flex justify-between text-xs text-gray-400">
        {points
          .filter((_, i) => i % labelStep === 0)
          .map((p) => (
            <span key={p.day}>{shortDate.format(new Date(`${p.day}T00:00:00`))}</span>
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
            <span className="text-gray-600 dark:text-gray-300">
              {PAYMENT_LABEL[d.method] ?? d.method}
            </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">
              {currency.format(d.total)}
            </span>
          </div>
        ))}
        {!data.length && <p className="text-sm text-gray-400">Sin ventas en este periodo.</p>}
      </div>
    </div>
  )
}

function PercentBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return current > 0 ? (
      <span className="text-xs font-semibold text-success">nuevo</span>
    ) : null
  }
  const change = ((current - previous) / previous) * 100
  const up = change >= 0
  return (
    <span className={`text-xs font-semibold ${up ? 'text-success' : 'text-danger'}`}>
      {up ? '▲' : '▼'} {Math.abs(change).toFixed(0)}%
    </span>
  )
}

export default function ReportesPage() {
  const [range, setRange] = useState<DateRange>(() => ({ from: daysAgo(29), to: daysAgo(0) }))
  const [activePreset, setActivePreset] = useState('last30')

  const { data: summary, isLoading: loadingSummary } = useReportSalesSummary(range)
  const { data: previousSummary } = useReportSalesSummary(useMemo(() => previousPeriod(range), [range]))
  const { data: trend, isLoading: loadingTrend } = useReportSalesTrend(range)
  const {
    data: paymentMethods,
    isLoading: loadingPayments,
    error: paymentsError,
  } = useReportPaymentMethods(range)
  const { data: byBranch, isLoading: loadingBranches, error: branchesError } =
    useReportSalesByBranch(range)
  const { data: byEmployee, isLoading: loadingEmployees, error: employeesError } =
    useReportSalesByEmployee(range)
  const [selectedEmployee, setSelectedEmployee] = useState<{ userId: string; email: string } | null>(
    null,
  )
  const {
    data: profitLines,
    isLoading: loadingProfit,
    error: profitError,
  } = useReportProfitMargin(range, selectedEmployee?.userId ?? null)

  const profitTotals = useMemo(
    () =>
      (profitLines ?? []).reduce(
        (acc, line) => ({
          revenue: acc.revenue + line.revenue,
          cost: acc.cost + line.cost,
          profit: acc.profit + line.profit,
        }),
        { revenue: 0, cost: 0, profit: 0 },
      ),
    [profitLines],
  )

  function applyPreset(key: string) {
    const preset = PRESETS.find((p) => p.key === key)
    if (!preset) return
    setActivePreset(key)
    setRange(preset.range())
  }

  function handleCustomDate(field: 'from' | 'to', value: string) {
    if (!value) return
    setActivePreset('')
    setRange((prev) => ({ ...prev, [field]: startOfDay(new Date(`${value}T00:00:00`)) }))
  }

  function exportEmployees() {
    downloadCsv(
      `ventas-por-empleado_${toInputValue(range.from)}_${toInputValue(range.to)}.csv`,
      ['Empleado', 'Ventas', 'Total'],
      (byEmployee ?? []).map((row) => [row.email, row.salesCount, row.total.toFixed(2)]),
    )
  }

  function exportProfit() {
    const suffix = selectedEmployee ? `_${selectedEmployee.email}` : ''
    downloadCsv(
      `utilidad_${toInputValue(range.from)}_${toInputValue(range.to)}${suffix}.csv`,
      ['Producto/servicio', 'Tipo', 'Cantidad', 'Ingresos', 'Costo', 'Utilidad'],
      (profitLines ?? []).map((row) => [
        row.itemName,
        row.itemType === 'product' ? 'Producto' : 'Servicio',
        row.quantity,
        row.revenue.toFixed(2),
        row.cost.toFixed(2),
        row.profit.toFixed(2),
      ]),
    )
  }

  return (
    <div className="space-y-4 pb-16">
      <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <ReportsIcon className="h-5 w-5 text-brand" />
          <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
            Reportes
          </h2>
        </div>

        <p className="mb-2 hidden text-sm text-gray-600 print:block">
          Periodo: {shortDate.format(range.from)} — {shortDate.format(range.to)}
        </p>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                activePreset === preset.key
                  ? 'bg-brand text-white'
                  : 'border border-gray-200 text-gray-600 hover:border-brand dark:border-gray-600 dark:text-gray-300'
              }`}
            >
              {preset.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 text-sm">
            <input
              type="date"
              value={toInputValue(range.from)}
              max={toInputValue(range.to)}
              onChange={(e) => handleCustomDate('from', e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
            <span className="text-gray-400">a</span>
            <input
              type="date"
              value={toInputValue(range.to)}
              min={toInputValue(range.from)}
              onChange={(e) => handleCustomDate('to', e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-gray-400">Total del periodo</p>
            {previousSummary && (
              <PercentBadge current={summary?.total ?? 0} previous={previousSummary.total} />
            )}
          </div>
          <p className="mt-1 font-serif text-2xl font-semibold text-brand-dark dark:text-brand-light">
            {loadingSummary ? '—' : currency.format(summary?.total ?? 0)}
          </p>
          <p className="text-xs text-gray-400 print:hidden">vs. periodo anterior</p>
        </div>
        <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-gray-400">Ventas</p>
            {previousSummary && (
              <PercentBadge current={summary?.salesCount ?? 0} previous={previousSummary.salesCount} />
            )}
          </div>
          <p className="mt-1 font-serif text-2xl font-semibold text-brand-dark dark:text-brand-light">
            {loadingSummary ? '—' : summary?.salesCount ?? 0}
          </p>
          <p className="text-xs text-gray-400 print:hidden">vs. periodo anterior</p>
        </div>
        <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase text-gray-400">Ticket promedio</p>
            {previousSummary && (
              <PercentBadge current={summary?.avgTicket ?? 0} previous={previousSummary.avgTicket} />
            )}
          </div>
          <p className="mt-1 font-serif text-2xl font-semibold text-brand-dark dark:text-brand-light">
            {loadingSummary ? '—' : currency.format(summary?.avgTicket ?? 0)}
          </p>
          <p className="text-xs text-gray-400 print:hidden">vs. periodo anterior</p>
        </div>
      </div>

      <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <h3 className="mb-3 font-serif text-base font-semibold text-brand-dark dark:text-brand-light">
          Ventas en el periodo
        </h3>
        {loadingTrend ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>
        ) : (
          <TrendChart data={trend ?? []} />
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <h3 className="mb-3 font-serif text-base font-semibold text-brand-dark dark:text-brand-light">
            Métodos de pago
          </h3>
          {loadingPayments && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}
          {!!paymentsError && (
            <p className="text-sm text-danger">
              No se pudo cargar el reporte: {paymentsError instanceof Error ? paymentsError.message : 'error desconocido'}
            </p>
          )}
          {!loadingPayments && !paymentsError && <PaymentDonut data={paymentMethods ?? []} />}
        </div>

        <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
          <h3 className="mb-3 font-serif text-base font-semibold text-brand-dark dark:text-brand-light">
            Ventas por sucursal
          </h3>
          {loadingBranches && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}
          {!!branchesError && (
            <p className="text-sm text-danger">
              No se pudo cargar el reporte: {branchesError instanceof Error ? branchesError.message : 'error desconocido'}
            </p>
          )}
          {!loadingBranches && !branchesError && !byBranch?.length && (
            <p className="text-sm text-gray-400">Sin sucursales.</p>
          )}
          {!!byBranch?.length && (
            <div className="space-y-2">
              {(() => {
                const maxTotal = Math.max(1, ...byBranch.map((b) => b.total))
                return byBranch.map((branch) => (
                  <div key={branch.branchId}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">{branch.branchName}</span>
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {currency.format(branch.total)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-brand transition-all duration-300"
                        style={{ width: `${(branch.total / maxTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      </div>

      <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-semibold text-brand-dark dark:text-brand-light">
              Ventas por empleado
            </h3>
            <p className="text-xs text-gray-400 print:hidden">
              Clic en un empleado para ver qué vendió, abajo.
            </p>
          </div>
          <button
            onClick={exportEmployees}
            disabled={!byEmployee?.length}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors duration-150 hover:border-brand hover:text-brand-dark disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 print:hidden"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        </div>
        {loadingEmployees && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}
        {!!employeesError && (
          <p className="text-sm text-danger">
            No se pudo cargar el reporte: {employeesError instanceof Error ? employeesError.message : 'error desconocido'}
          </p>
        )}
        {!loadingEmployees && !employeesError && !byEmployee?.length && (
          <p className="text-sm text-gray-400">Sin ventas en este periodo.</p>
        )}
        {!!byEmployee?.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400 dark:border-gray-700">
                  <th className="py-2 pr-2">Empleado</th>
                  <th className="py-2 pr-2 text-right">Ventas</th>
                  <th className="py-2 pr-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {byEmployee.map((row) => (
                  <tr
                    key={row.userId}
                    onClick={() =>
                      setSelectedEmployee((prev) =>
                        prev?.userId === row.userId ? null : { userId: row.userId, email: row.email },
                      )
                    }
                    className={`cursor-pointer transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-900/50 print:cursor-auto ${
                      selectedEmployee?.userId === row.userId ? 'bg-brand-tint dark:bg-brand/20' : ''
                    }`}
                  >
                    <td className="py-2 pr-2 text-gray-700 dark:text-gray-300">{row.email}</td>
                    <td className="py-2 pr-2 text-right text-gray-600 dark:text-gray-400">
                      {row.salesCount}
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold text-gray-800 dark:text-gray-200">
                      {currency.format(row.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-semibold text-brand-dark dark:text-brand-light">
              Utilidad por producto/servicio
            </h3>
            {selectedEmployee && (
              <p className="flex items-center gap-2 text-xs text-gray-500">
                Filtrado por: <span className="font-semibold">{selectedEmployee.email}</span>
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="text-brand underline print:hidden"
                >
                  Ver todos
                </button>
              </p>
            )}
          </div>
          <button
            onClick={exportProfit}
            disabled={!profitLines?.length}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 transition-colors duration-150 hover:border-brand hover:text-brand-dark disabled:opacity-40 dark:border-gray-600 dark:text-gray-300 print:hidden"
          >
            <DownloadIcon className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        </div>
        <p className="mb-3 text-xs text-gray-400">
          Servicios y productos sin costo de compra capturado cuentan como 100% utilidad —
          captura el costo en Inventario para un margen más preciso.
        </p>
        {loadingProfit && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}
        {!!profitError && (
          <p className="text-sm text-danger">
            No se pudo cargar el reporte: {profitError instanceof Error ? profitError.message : 'error desconocido'}
          </p>
        )}
        {!loadingProfit && !profitError && !profitLines?.length && (
          <p className="text-sm text-gray-400">Sin ventas en este periodo.</p>
        )}
        {!!profitLines?.length && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400 dark:border-gray-700">
                  <th className="py-2 pr-2">Producto/servicio</th>
                  <th className="py-2 pr-2 text-right">Cant.</th>
                  <th className="py-2 pr-2 text-right">Ingresos</th>
                  <th className="py-2 pr-2 text-right">Costo</th>
                  <th className="py-2 pr-2 text-right">Utilidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {profitLines.map((row) => (
                  <tr key={`${row.itemName}-${row.itemType}`}>
                    <td className="py-2 pr-2 text-gray-700 dark:text-gray-300">{row.itemName}</td>
                    <td className="py-2 pr-2 text-right text-gray-600 dark:text-gray-400">
                      {row.quantity}
                    </td>
                    <td className="py-2 pr-2 text-right text-gray-600 dark:text-gray-400">
                      {currency.format(row.revenue)}
                    </td>
                    <td className="py-2 pr-2 text-right text-gray-600 dark:text-gray-400">
                      {currency.format(row.cost)}
                    </td>
                    <td className="py-2 pr-2 text-right font-semibold text-success">
                      {currency.format(row.profit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-200 font-semibold dark:border-gray-600">
                  <td className="py-2 pr-2 text-gray-800 dark:text-gray-200">Total</td>
                  <td className="py-2 pr-2" />
                  <td className="py-2 pr-2 text-right text-gray-800 dark:text-gray-200">
                    {currency.format(profitTotals.revenue)}
                  </td>
                  <td className="py-2 pr-2 text-right text-gray-800 dark:text-gray-200">
                    {currency.format(profitTotals.cost)}
                  </td>
                  <td className="py-2 pr-2 text-right text-success">
                    {currency.format(profitTotals.profit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
