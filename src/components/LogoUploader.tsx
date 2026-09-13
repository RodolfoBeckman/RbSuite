import { useEffect, useRef, useState, type DragEvent } from 'react'

export default function LogoUploader({
  currentUrl,
  onSelect,
  uploading,
}: {
  currentUrl: string | null
  onSelect: (file: File) => void
  uploading: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function handleFile(file: File | undefined) {
    if (!file) return
    setPreviewUrl(URL.createObjectURL(file))
    onSelect(file)
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    handleFile(event.dataTransfer.files?.[0])
  }

  const displayUrl = previewUrl ?? currentUrl

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') inputRef.current?.click()
      }}
      className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed p-4 transition-colors duration-150 ${
        dragging
          ? 'border-brand bg-brand-tint dark:bg-brand/10'
          : 'border-gray-200 hover:border-brand/60 dark:border-gray-600'
      }`}
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-600 dark:bg-gray-900">
        {displayUrl ? (
          <img src={displayUrl} alt="Logo" className="h-full w-full object-contain" />
        ) : (
          <span className="text-xs text-gray-400">Sin logo</span>
        )}
      </div>
      <div className="text-sm">
        <p className="font-medium text-gray-700 dark:text-gray-200">
          {uploading ? 'Subiendo…' : 'Arrastra tu logo aquí'}
        </p>
        <p className="text-gray-400">o haz clic para elegir un archivo (PNG, JPG, SVG, WEBP)</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        className="hidden"
        onChange={(event) => handleFile(event.target.files?.[0])}
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  )
}
