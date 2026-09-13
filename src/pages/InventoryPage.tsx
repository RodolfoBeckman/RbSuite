import { useState, type ReactNode } from 'react'
import BranchPicker from '../components/BranchPicker'
import { useActiveBranch } from '../hooks/useActiveBranch'
import {
  useAdjustStock,
  useBusinessProducts,
  useCreateProduct,
  useCreateService,
  useServicesAdmin,
  useUpdateProduct,
  useUpdateService,
  type BusinessProduct,
  type ServiceItem,
} from '../hooks/useInventory'

const inputClass =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

export default function InventoryPage() {
  const activeBranchId = useActiveBranch()
  const [tab, setTab] = useState<'productos' | 'servicios'>('productos')

  if (!activeBranchId) {
    return <BranchPicker title="Elige la sucursal para ver su inventario" />
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex gap-2">
        <TabButton active={tab === 'productos'} onClick={() => setTab('productos')}>
          Productos
        </TabButton>
        <TabButton active={tab === 'servicios'} onClick={() => setTab('servicios')}>
          Servicios
        </TabButton>
      </div>
      {tab === 'productos' ? <ProductsSection branchId={activeBranchId} /> : <ServicesSection />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
        active
          ? 'bg-brand text-white'
          : 'bg-white text-gray-500 hover:text-brand-dark dark:bg-gray-800 dark:text-gray-400'
      }`}
    >
      {children}
    </button>
  )
}

function ProductsSection({ branchId }: { branchId: string }) {
  const { data: products, isLoading } = useBusinessProducts(branchId)
  const createProduct = useCreateProduct()

  const [form, setForm] = useState({
    barcode: '',
    name: '',
    brand: '',
    category: '',
    unit: 'pieza',
    salePrice: '',
    purchasePrice: '',
    minimumStock: '0',
    initialStock: '0',
  })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleCreate() {
    if (!form.name.trim() || !form.salePrice) return
    setFeedback(null)
    createProduct.mutate(
      {
        barcode: form.barcode.trim(),
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category.trim(),
        unit: form.unit.trim() || 'pieza',
        salePrice: Number(form.salePrice),
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        minimumStock: Number(form.minimumStock) || 0,
        branchId,
        initialStock: Number(form.initialStock) || 0,
      },
      {
        onSuccess: () => {
          setFeedback({ type: 'success', text: 'Producto agregado' })
          setForm({
            barcode: '',
            name: '',
            brand: '',
            category: '',
            unit: 'pieza',
            salePrice: '',
            purchasePrice: '',
            minimumStock: '0',
            initialStock: '0',
          })
        },
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo agregar el producto',
          }),
      },
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-1 font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
        Productos
      </h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        El precio es el mismo en todas las sucursales; el stock que ves es el de la sucursal
        elegida arriba en el punto de venta.
      </p>

      <div className="mb-5 space-y-3">
        {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}
        {products?.map((product) => (
          <ProductRow key={product.id} product={product} branchId={branchId} />
        ))}
        {products?.length === 0 && (
          <p className="text-sm text-gray-400">Aún no tienes productos registrados.</p>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
        <p className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">Nuevo producto</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="Código de barras (opcional)"
            value={form.barcode}
            onChange={(e) => setForm((p) => ({ ...p, barcode: e.target.value }))}
            className={inputClass}
          />
          <input
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className={inputClass}
          />
          <input
            placeholder="Marca (opcional)"
            value={form.brand}
            onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
            className={inputClass}
          />
          <input
            placeholder="Categoría (opcional)"
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
            className={inputClass}
          />
          <input
            placeholder="Unidad (ej. pieza, ml)"
            value={form.unit}
            onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            className={inputClass}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Precio de venta"
            value={form.salePrice}
            onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))}
            className={inputClass}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Precio de compra (opcional)"
            value={form.purchasePrice}
            onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))}
            className={inputClass}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Stock mínimo"
            value={form.minimumStock}
            onChange={(e) => setForm((p) => ({ ...p, minimumStock: e.target.value }))}
            className={inputClass}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Stock inicial en esta sucursal"
            value={form.initialStock}
            onChange={(e) => setForm((p) => ({ ...p, initialStock: e.target.value }))}
            className={inputClass}
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={createProduct.isPending || !form.name.trim() || !form.salePrice}
          className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {createProduct.isPending ? 'Agregando…' : 'Agregar producto'}
        </button>
      </div>

      {feedback && (
        <p className={`mt-3 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
          {feedback.text}
        </p>
      )}
    </div>
  )
}

function ProductRow({ product, branchId }: { product: BusinessProduct; branchId: string }) {
  const updateProduct = useUpdateProduct()
  const adjustStock = useAdjustStock()

  const [form, setForm] = useState({
    salePrice: String(product.salePrice),
    purchasePrice: product.purchasePrice != null ? String(product.purchasePrice) : '',
    minimumStock: String(product.minimumStock),
    active: product.active,
  })
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)

  const [adjust, setAdjust] = useState({ quantity: '', reason: '' })
  const [adjustFeedback, setAdjustFeedback] = useState<'success' | 'error' | null>(null)

  const dirty =
    form.salePrice !== String(product.salePrice) ||
    form.purchasePrice !== (product.purchasePrice != null ? String(product.purchasePrice) : '') ||
    form.minimumStock !== String(product.minimumStock) ||
    form.active !== product.active

  const lowStock = product.stock <= product.minimumStock

  function handleSave() {
    setFeedback(null)
    updateProduct.mutate(
      {
        id: product.id,
        salePrice: Number(form.salePrice) || 0,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        minimumStock: Number(form.minimumStock) || 0,
        active: form.active,
      },
      { onSuccess: () => setFeedback('success'), onError: () => setFeedback('error') },
    )
  }

  function handleAdjust() {
    const quantity = Number(adjust.quantity)
    if (!quantity) return
    setAdjustFeedback(null)
    adjustStock.mutate(
      { businessProductId: product.id, branchId, quantity, reason: adjust.reason.trim() },
      {
        onSuccess: () => {
          setAdjustFeedback('success')
          setAdjust({ quantity: '', reason: '' })
        },
        onError: () => setAdjustFeedback('error'),
      },
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">
          {product.name}
          {product.brand && <span className="ml-1 text-gray-400">· {product.brand}</span>}
        </p>
        <span
          className={`whitespace-nowrap text-sm font-semibold ${
            lowStock ? 'text-danger' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          Stock: {product.stock} {product.unit}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <input
          type="number"
          step="0.01"
          value={form.salePrice}
          onChange={(e) => setForm((p) => ({ ...p, salePrice: e.target.value }))}
          className={inputClass}
          placeholder="Precio venta"
        />
        <input
          type="number"
          step="0.01"
          value={form.purchasePrice}
          onChange={(e) => setForm((p) => ({ ...p, purchasePrice: e.target.value }))}
          className={inputClass}
          placeholder="Precio compra"
        />
        <input
          type="number"
          step="0.01"
          value={form.minimumStock}
          onChange={(e) => setForm((p) => ({ ...p, minimumStock: e.target.value }))}
          className={inputClass}
          placeholder="Stock mínimo"
        />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
            />
            Activo
          </label>
          <button
            onClick={handleSave}
            disabled={!dirty || updateProduct.isPending}
            className="ml-auto rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {updateProduct.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
      {feedback === 'success' && <p className="mt-2 text-sm text-success">Guardado</p>}
      {feedback === 'error' && <p className="mt-2 text-sm text-danger">Error al guardar</p>}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
        <input
          type="number"
          step="0.01"
          placeholder="+/- cantidad"
          value={adjust.quantity}
          onChange={(e) => setAdjust((p) => ({ ...p, quantity: e.target.value }))}
          className={`${inputClass} w-32`}
        />
        <input
          placeholder="Motivo (ej. compra, merma, conteo)"
          value={adjust.reason}
          onChange={(e) => setAdjust((p) => ({ ...p, reason: e.target.value }))}
          className={`${inputClass} min-w-[140px] flex-1`}
        />
        <button
          onClick={handleAdjust}
          disabled={adjustStock.isPending || !adjust.quantity}
          className="rounded-lg border border-brand px-3 py-1.5 text-sm font-semibold text-brand-dark hover:bg-brand-tint disabled:opacity-50 dark:text-brand-light"
        >
          {adjustStock.isPending ? 'Ajustando…' : 'Ajustar stock'}
        </button>
        {adjustFeedback === 'success' && <span className="text-sm text-success">Movimiento registrado</span>}
        {adjustFeedback === 'error' && <span className="text-sm text-danger">No se pudo registrar</span>}
      </div>
    </div>
  )
}

function ServicesSection() {
  const { data: services, isLoading } = useServicesAdmin()
  const createService = useCreateService()

  const [form, setForm] = useState({ name: '', price: '', durationMinutes: '' })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleCreate() {
    if (!form.name.trim() || !form.price) return
    setFeedback(null)
    createService.mutate(
      {
        name: form.name.trim(),
        price: Number(form.price),
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
      },
      {
        onSuccess: () => {
          setFeedback({ type: 'success', text: 'Servicio agregado' })
          setForm({ name: '', price: '', durationMinutes: '' })
        },
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo agregar el servicio',
          }),
      },
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-1 font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
        Servicios
      </h2>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Los servicios no manejan stock — solo precio y duración.
      </p>

      <div className="mb-5 space-y-3">
        {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}
        {services?.map((service) => (
          <ServiceRow key={service.id} service={service} />
        ))}
        {services?.length === 0 && (
          <p className="text-sm text-gray-400">Aún no tienes servicios registrados.</p>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
        <p className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">Nuevo servicio</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="Nombre"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className={inputClass}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Precio"
            value={form.price}
            onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
            className={inputClass}
          />
          <input
            type="number"
            placeholder="Duración en minutos (opcional)"
            value={form.durationMinutes}
            onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
            className={inputClass}
          />
        </div>
        <button
          onClick={handleCreate}
          disabled={createService.isPending || !form.name.trim() || !form.price}
          className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {createService.isPending ? 'Agregando…' : 'Agregar servicio'}
        </button>
      </div>

      {feedback && (
        <p className={`mt-3 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
          {feedback.text}
        </p>
      )}
    </div>
  )
}

function ServiceRow({ service }: { service: ServiceItem }) {
  const updateService = useUpdateService()
  const [form, setForm] = useState({
    name: service.name,
    price: String(service.price),
    durationMinutes: service.durationMinutes != null ? String(service.durationMinutes) : '',
    active: service.active,
  })
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)

  const dirty =
    form.name !== service.name ||
    form.price !== String(service.price) ||
    form.durationMinutes !== (service.durationMinutes != null ? String(service.durationMinutes) : '') ||
    form.active !== service.active

  function handleSave() {
    setFeedback(null)
    updateService.mutate(
      {
        id: service.id,
        name: form.name.trim(),
        price: Number(form.price) || 0,
        durationMinutes: form.durationMinutes ? Number(form.durationMinutes) : null,
        active: form.active,
      },
      { onSuccess: () => setFeedback('success'), onError: () => setFeedback('error') },
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="grid gap-3 sm:grid-cols-4">
        <input
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          className={inputClass}
        />
        <input
          type="number"
          step="0.01"
          value={form.price}
          onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
          className={inputClass}
        />
        <input
          type="number"
          value={form.durationMinutes}
          onChange={(e) => setForm((p) => ({ ...p, durationMinutes: e.target.value }))}
          className={inputClass}
          placeholder="min"
        />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
            />
            Activo
          </label>
          <button
            onClick={handleSave}
            disabled={!dirty || updateService.isPending}
            className="ml-auto rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {updateService.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
      {feedback === 'success' && <p className="mt-2 text-sm text-success">Guardado</p>}
      {feedback === 'error' && <p className="mt-2 text-sm text-danger">Error al guardar</p>}
    </div>
  )
}
