import { useState, type ReactNode } from 'react'
import BranchPicker from '../components/BranchPicker'
import Modal from '../components/Modal'
import ComboCreateSelect from '../components/ComboCreateSelect'
import { useActiveBranch } from '../hooks/useActiveBranch'
import {
  useAdjustStock,
  useBrands,
  useBusinessProducts,
  useCategories,
  useCreateBrand,
  useCreateCategory,
  useCreateProduct,
  useCreateProductFamily,
  useCreateService,
  useCreateUnit,
  useProductFamilies,
  useSearchCatalogProducts,
  useServicesAdmin,
  useUnits,
  useUpdateProduct,
  useUpdateService,
  type BusinessProduct,
  type CatalogProductMatch,
  type ServiceItem,
} from '../hooks/useInventory'

const inputClass =
  'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'

const PAGE_SIZES = [10, 25, 50, 100]

export default function InventoryPage() {
  const activeBranchId = useActiveBranch()
  const [tab, setTab] = useState<'productos' | 'servicios'>('productos')

  if (!activeBranchId) {
    return <BranchPicker title="Elige la sucursal para ver su inventario" />
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <TabButton active={tab === 'productos'} onClick={() => setTab('productos')}>
          Productos
        </TabButton>
        <TabButton active={tab === 'servicios'} onClick={() => setTab('servicios')}>
          Servicios
        </TabButton>
      </div>
      {tab === 'productos' ? (
        <ProductsSection branchId={activeBranchId} />
      ) : (
        <div className="max-w-lg">
          <ServicesSection />
        </div>
      )}
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
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)

  const { data, isLoading } = useBusinessProducts(branchId, { page, pageSize, search })
  const products = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  function handleSearchChange(value: string) {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
            Productos
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            El precio es el mismo en todas las sucursales; el stock es el de la sucursal activa.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          + Agregar producto
        </button>
      </div>

      <input
        value={search}
        onChange={(event) => handleSearchChange(event.target.value)}
        placeholder="Buscar por nombre o código de barras…"
        className={`${inputClass} mb-4 w-full`}
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase text-gray-400 dark:border-gray-700">
              <th className="py-2 pr-3 font-medium">Producto</th>
              <th className="py-2 pr-3 font-medium">Marca</th>
              <th className="py-2 pr-3 font-medium">Categoría</th>
              <th className="py-2 pr-3 font-medium">P. venta</th>
              <th className="py-2 pr-3 font-medium">P. compra</th>
              <th className="py-2 pr-3 font-medium">Stock</th>
              <th className="py-2 pr-3 font-medium">Activo</th>
              <th className="py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={8} className="py-4 text-sm text-gray-500 dark:text-gray-400">
                  Cargando…
                </td>
              </tr>
            )}
            {!isLoading && products.length === 0 && (
              <tr>
                <td colSpan={8} className="py-4 text-sm text-gray-400">
                  No hay productos que coincidan.
                </td>
              </tr>
            )}
            {products.map((product) => (
              <ProductRow key={product.id} product={product} branchId={branchId} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <span>Mostrar</span>
          <select
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(1)
            }}
            className={inputClass}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>por página · {total} en total</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600"
          >
            Anterior
          </button>
          <span>
            Página {page} de {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded-lg border border-gray-200 px-3 py-1.5 disabled:opacity-40 dark:border-gray-600"
          >
            Siguiente
          </button>
        </div>
      </div>

      {showModal && <ProductFormModal branchId={branchId} onClose={() => setShowModal(false)} />}
    </div>
  )
}

function ProductFormModal({ branchId, onClose }: { branchId: string; onClose: () => void }) {
  const createProduct = useCreateProduct()
  const { data: brands } = useBrands()
  const { data: units } = useUnits()
  const { data: families } = useProductFamilies()
  const { data: categories } = useCategories()
  const createBrand = useCreateBrand()
  const createUnit = useCreateUnit()
  const createFamily = useCreateProductFamily()
  const createCategory = useCreateCategory()

  const [searchTerm, setSearchTerm] = useState('')
  const { data: matches, isFetching: searching } = useSearchCatalogProducts(searchTerm)
  const [selectedMatch, setSelectedMatch] = useState<CatalogProductMatch | null>(null)

  const [form, setForm] = useState({
    barcode: '',
    name: '',
    brandId: null as string | null,
    unitId: null as string | null,
    familyId: null as string | null,
    categoryId: null as string | null,
    salePrice: '',
    purchasePrice: '',
    minimumStock: '0',
    initialStock: '0',
  })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  const usingExisting = !!selectedMatch

  function handlePickMatch(match: CatalogProductMatch) {
    setSelectedMatch(match)
    setForm((p) => ({ ...p, name: match.name, barcode: match.barcode ?? '' }))
  }

  function handleCreate() {
    if (!usingExisting && (!form.name.trim() || !form.unitId)) return
    if (!form.salePrice) return
    setFeedback(null)
    createProduct.mutate(
      {
        productId: selectedMatch?.id ?? null,
        barcode: form.barcode.trim(),
        name: form.name.trim(),
        brandId: form.brandId,
        unitId: form.unitId,
        familyId: form.familyId,
        categoryId: form.categoryId,
        salePrice: Number(form.salePrice),
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        minimumStock: Number(form.minimumStock) || 0,
        branchId,
        initialStock: Number(form.initialStock) || 0,
      },
      {
        onSuccess: () => onClose(),
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo agregar el producto',
          }),
      },
    )
  }

  return (
    <Modal title="Nuevo producto" onClose={onClose}>
      <div className="space-y-4">
        {!usingExisting && (
          <div>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
              Buscar producto ya existente (por nombre o código de barras)
            </label>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Ej. Shampoo 400ml o el código de barras"
              className={`${inputClass} w-full`}
            />
            {searchTerm.trim().length >= 2 && (
              <div className="mt-2 space-y-1">
                {searching && <p className="text-sm text-gray-400">Buscando…</p>}
                {matches?.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => handlePickMatch(match)}
                    className="block w-full rounded-lg border border-gray-200 p-2 text-left text-sm hover:border-brand dark:border-gray-600"
                  >
                    <span className="font-medium">{match.name}</span>
                    {match.brandName && <span className="text-gray-400"> · {match.brandName}</span>}
                    <span className="ml-2 text-xs text-gray-400">{match.unitName}</span>
                  </button>
                ))}
                {matches?.length === 0 && !searching && (
                  <p className="text-sm text-gray-400">
                    Nadie más en la plataforma tiene ese producto — llena los datos abajo para
                    crearlo.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {usingExisting && (
          <div className="flex items-center justify-between rounded-lg border border-brand bg-brand-tint p-3 dark:bg-brand/10">
            <div>
              <p className="text-sm font-semibold text-brand-dark dark:text-brand-light">
                {selectedMatch!.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Reutilizando este producto del catálogo — solo defines tu precio y stock.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedMatch(null)
                setForm((p) => ({ ...p, name: '', barcode: '' }))
              }}
              className="text-sm text-gray-400 hover:text-gray-600"
            >
              Cambiar
            </button>
          </div>
        )}

        {!usingExisting && (
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Código de barras (opcional)"
              value={form.barcode}
              onChange={(event) => setForm((p) => ({ ...p, barcode: event.target.value }))}
              className={inputClass}
            />
            <input
              placeholder="Nombre"
              value={form.name}
              onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
              className={inputClass}
            />
            <ComboCreateSelect
              label="Marca"
              items={brands ?? []}
              value={form.brandId}
              onChange={(id) => setForm((p) => ({ ...p, brandId: id }))}
              onCreate={(name) => createBrand.mutateAsync(name)}
              placeholder="Buscar o crear marca"
            />
            <ComboCreateSelect
              label="Unidad"
              items={units ?? []}
              value={form.unitId}
              onChange={(id) => setForm((p) => ({ ...p, unitId: id }))}
              onCreate={(name) => createUnit.mutateAsync(name)}
              placeholder="Buscar o crear unidad"
            />
            <ComboCreateSelect
              label="Familia (opcional, para presentaciones)"
              items={families ?? []}
              value={form.familyId}
              onChange={(id) => setForm((p) => ({ ...p, familyId: id }))}
              onCreate={(name) => createFamily.mutateAsync(name)}
              placeholder="Ej. Refresco Cola"
            />
          </div>
        )}

        <ComboCreateSelect
          label="Categoría (opcional)"
          items={categories ?? []}
          value={form.categoryId}
          onChange={(id) => setForm((p) => ({ ...p, categoryId: id }))}
          onCreate={(name) => createCategory.mutateAsync(name)}
          placeholder="Buscar o crear categoría"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="number"
            step="0.01"
            placeholder="Precio de venta"
            value={form.salePrice}
            onChange={(event) => setForm((p) => ({ ...p, salePrice: event.target.value }))}
            className={inputClass}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Precio de compra (opcional)"
            value={form.purchasePrice}
            onChange={(event) => setForm((p) => ({ ...p, purchasePrice: event.target.value }))}
            className={inputClass}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Stock mínimo"
            value={form.minimumStock}
            onChange={(event) => setForm((p) => ({ ...p, minimumStock: event.target.value }))}
            className={inputClass}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Stock inicial en esta sucursal"
            value={form.initialStock}
            onChange={(event) => setForm((p) => ({ ...p, initialStock: event.target.value }))}
            className={inputClass}
          />
        </div>

        {feedback && (
          <p className={`text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
            {feedback.text}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={
              createProduct.isPending ||
              (!usingExisting && (!form.name.trim() || !form.unitId)) ||
              !form.salePrice
            }
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {createProduct.isPending ? 'Agregando…' : 'Agregar producto'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ProductRow({ product, branchId }: { product: BusinessProduct; branchId: string }) {
  const updateProduct = useUpdateProduct()
  const { data: categories } = useCategories()
  const createCategory = useCreateCategory()

  const [form, setForm] = useState({
    categoryId: product.categoryId,
    salePrice: String(product.salePrice),
    purchasePrice: product.purchasePrice != null ? String(product.purchasePrice) : '',
    minimumStock: String(product.minimumStock),
    active: product.active,
  })
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)
  const [showAdjust, setShowAdjust] = useState(false)

  const dirty =
    form.categoryId !== product.categoryId ||
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
        categoryId: form.categoryId,
        salePrice: Number(form.salePrice) || 0,
        purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : null,
        minimumStock: Number(form.minimumStock) || 0,
        active: form.active,
      },
      { onSuccess: () => setFeedback('success'), onError: () => setFeedback('error') },
    )
  }

  return (
    <>
      <tr className="border-b border-gray-100 align-top dark:border-gray-700">
        <td className="max-w-[180px] py-2 pr-3">
          <p className="truncate font-medium text-gray-700 dark:text-gray-200">{product.name}</p>
          {product.familyName && (
            <p className="truncate text-xs text-gray-400">Familia: {product.familyName}</p>
          )}
        </td>
        <td className="py-2 pr-3 text-gray-500 dark:text-gray-400">{product.brandName ?? '—'}</td>
        <td className="min-w-[140px] py-2 pr-3">
          <ComboCreateSelect
            items={categories ?? []}
            value={form.categoryId}
            onChange={(id) => setForm((p) => ({ ...p, categoryId: id }))}
            onCreate={(name) => createCategory.mutateAsync(name)}
            placeholder="Sin categoría"
          />
        </td>
        <td className="py-2 pr-3">
          <input
            type="number"
            step="0.01"
            value={form.salePrice}
            onChange={(event) => setForm((p) => ({ ...p, salePrice: event.target.value }))}
            className={`${inputClass} w-24`}
          />
        </td>
        <td className="py-2 pr-3">
          <input
            type="number"
            step="0.01"
            value={form.purchasePrice}
            onChange={(event) => setForm((p) => ({ ...p, purchasePrice: event.target.value }))}
            className={`${inputClass} w-24`}
          />
        </td>
        <td className="whitespace-nowrap py-2 pr-3">
          <span className={lowStock ? 'font-semibold text-danger' : ''}>
            {product.stock} {product.unitName}
          </span>
          <button
            onClick={() => setShowAdjust(true)}
            className="ml-2 text-xs text-brand-dark underline hover:no-underline dark:text-brand-light"
          >
            Ajustar
          </button>
        </td>
        <td className="py-2 pr-3">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((p) => ({ ...p, active: event.target.checked }))}
          />
        </td>
        <td className="py-2">
          <button
            onClick={handleSave}
            disabled={!dirty || updateProduct.isPending}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {updateProduct.isPending ? '…' : 'Guardar'}
          </button>
          {feedback === 'success' && <p className="mt-1 text-xs text-success">Guardado</p>}
          {feedback === 'error' && <p className="mt-1 text-xs text-danger">Error</p>}
        </td>
      </tr>
      {showAdjust && (
        <AdjustStockModal product={product} branchId={branchId} onClose={() => setShowAdjust(false)} />
      )}
    </>
  )
}

function AdjustStockModal({
  product,
  branchId,
  onClose,
}: {
  product: BusinessProduct
  branchId: string
  onClose: () => void
}) {
  const adjustStock = useAdjustStock()
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleSubmit() {
    const value = Number(quantity)
    if (!value) return
    setFeedback(null)
    adjustStock.mutate(
      { businessProductId: product.id, branchId, quantity: value, reason: reason.trim() },
      {
        onSuccess: () => onClose(),
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo registrar',
          }),
      },
    )
  }

  return (
    <Modal title={`Ajustar stock — ${product.name}`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Stock actual: {product.stock} {product.unitName}
        </p>
        <input
          type="number"
          step="0.01"
          placeholder="Cantidad (positivo entra, negativo sale)"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className={`${inputClass} w-full`}
        />
        <input
          placeholder="Motivo (ej. compra, merma, conteo)"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={`${inputClass} w-full`}
        />
        {feedback && (
          <p className={`text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
            {feedback.text}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            Cerrar
          </button>
          <button
            onClick={handleSubmit}
            disabled={adjustStock.isPending || !quantity}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {adjustStock.isPending ? 'Guardando…' : 'Registrar movimiento'}
          </button>
        </div>
      </div>
    </Modal>
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
            onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
            className={inputClass}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Precio"
            value={form.price}
            onChange={(event) => setForm((p) => ({ ...p, price: event.target.value }))}
            className={inputClass}
          />
          <input
            type="number"
            placeholder="Duración en minutos (opcional)"
            value={form.durationMinutes}
            onChange={(event) => setForm((p) => ({ ...p, durationMinutes: event.target.value }))}
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
          onChange={(event) => setForm((p) => ({ ...p, name: event.target.value }))}
          className={inputClass}
        />
        <input
          type="number"
          step="0.01"
          value={form.price}
          onChange={(event) => setForm((p) => ({ ...p, price: event.target.value }))}
          className={inputClass}
        />
        <input
          type="number"
          value={form.durationMinutes}
          onChange={(event) => setForm((p) => ({ ...p, durationMinutes: event.target.value }))}
          className={inputClass}
          placeholder="min"
        />
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => setForm((p) => ({ ...p, active: event.target.checked }))}
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
