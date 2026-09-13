export default function PosPage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-2 font-serif text-lg font-semibold text-brand-dark">Punto de venta</h2>
      <p className="text-sm text-gray-500">
        Aquí se porta la pantalla de venta del prototipo (búsqueda, carrito, cobro),
        conectada a la función <code className="rounded bg-gray-100 px-1">create_sale</code>{' '}
        que definimos en la capa de RPC.
      </p>
    </div>
  )
}
