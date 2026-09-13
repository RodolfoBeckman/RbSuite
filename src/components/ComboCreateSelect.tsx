import { useEffect, useRef, useState } from 'react'

export interface ComboItem {
  id: string
  name: string
}

// Selector con búsqueda que además deja crear un valor nuevo sin salir del
// formulario — usado para marca/unidad/categoría/familia, que antes eran
// texto libre y se prestaban a variantes de captura ("L'Oréal"/"Loreal").
export default function ComboCreateSelect({
  label,
  items,
  value,
  onChange,
  onCreate,
  placeholder,
  disabled,
}: {
  label?: string
  items: ComboItem[]
  value: string | null
  onChange: (id: string | null) => void
  onCreate: (name: string) => Promise<ComboItem>
  placeholder?: string
  disabled?: boolean
}) {
  const selected = items.find((item) => item.id === value) ?? null
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState(selected?.name ?? '')
  const [creating, setCreating] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setQuery(selected?.name ?? '')
    // Solo re-sincronizar cuando cambia lo seleccionado, no en cada
    // render (items es un array nuevo cada vez que la query refresca).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.name])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery(selected?.name ?? '')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selected])

  const term = query.trim().toLowerCase()
  const filtered = term ? items.filter((item) => item.name.toLowerCase().includes(term)) : items
  const exactMatch = items.some((item) => item.name.toLowerCase() === term)

  async function handleCreate() {
    if (!query.trim() || creating) return
    setCreating(true)
    try {
      const created = await onCreate(query.trim())
      onChange(created.id)
      setQuery(created.name)
      setOpen(false)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">{label}</label>
      )}
      <input
        value={query}
        disabled={disabled}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
          if (value) onChange(null)
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />
      {open && !disabled && (
        <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onChange(item.id)
                setQuery(item.name)
                setOpen(false)
              }}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-brand-tint dark:text-gray-100 dark:hover:bg-brand/20"
            >
              {item.name}
            </button>
          ))}
          {filtered.length === 0 && <p className="px-3 py-2 text-sm text-gray-400">Sin resultados</p>}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating}
              className="block w-full border-t border-gray-100 px-3 py-2 text-left text-sm font-medium text-brand-dark hover:bg-brand-tint disabled:opacity-50 dark:border-gray-700 dark:text-brand-light dark:hover:bg-brand/20"
            >
              {creating ? 'Agregando…' : `+ Agregar "${query.trim()}"`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
