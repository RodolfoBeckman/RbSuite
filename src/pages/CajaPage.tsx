export default function CajaPage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-2 font-serif text-lg font-semibold text-brand-dark">Caja</h2>
      <p className="text-sm text-gray-500">
        Aquí se portan las pantallas de apertura y cierre de caja del prototipo, conectadas a{' '}
        <code className="rounded bg-gray-100 px-1">open_cash_session</code> y{' '}
        <code className="rounded bg-gray-100 px-1">close_cash_session</code>.
      </p>
    </div>
  )
}
