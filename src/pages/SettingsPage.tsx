import { useEffect, useState, type ChangeEvent } from 'react'
import { DEFAULT_PRIMARY_COLOR, useBranding, useUpdateBrandColor, useUploadLogo } from '../hooks/useBranding'

export default function SettingsPage() {
  const { data: branding, isLoading } = useBranding()
  const updateColor = useUpdateBrandColor()
  const uploadLogo = useUploadLogo()

  const [color, setColor] = useState(DEFAULT_PRIMARY_COLOR)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  useEffect(() => {
    if (branding?.primaryColor) setColor(branding.primaryColor)
  }, [branding?.primaryColor])

  function handleSaveColor() {
    setFeedback(null)
    updateColor.mutate(color, {
      onSuccess: () => setFeedback({ type: 'success', text: 'Color de marca actualizado' }),
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo guardar el color',
        }),
    })
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFeedback(null)
    uploadLogo.mutate(file, {
      onSuccess: () => setFeedback({ type: 'success', text: 'Logo actualizado' }),
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo subir el logo',
        }),
    })
    event.target.value = ''
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-1 font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
          Marca de tu negocio
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          El logo y el color se usan en el encabezado y los acentos de toda la app.
        </p>

        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">Logo</label>
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600">
            {branding?.logoUrl ? (
              <img
                src={branding.logoUrl}
                alt="Logo actual"
                className="h-full w-full rounded-lg object-contain"
              />
            ) : (
              <span className="text-xs text-gray-400">Sin logo</span>
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleLogoChange}
              disabled={uploadLogo.isPending}
              className="block text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-tint file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-brand-dark hover:file:bg-brand/20 dark:text-gray-300 dark:file:text-brand-light"
            />
            {uploadLogo.isPending && (
              <p className="mt-1 text-xs text-gray-400">Subiendo…</p>
            )}
          </div>
        </div>

        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
          Color de marca
        </label>
        <div className="mb-4 flex items-center gap-3">
          <input
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-10 w-16 cursor-pointer rounded border border-gray-200 bg-transparent dark:border-gray-600"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">{color}</span>
          <button
            onClick={handleSaveColor}
            disabled={updateColor.isPending}
            className="ml-auto rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {updateColor.isPending ? 'Guardando…' : 'Guardar'}
          </button>
        </div>

        {feedback && (
          <p
            className={`text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}
          >
            {feedback.text}
          </p>
        )}
      </div>
    </div>
  )
}
