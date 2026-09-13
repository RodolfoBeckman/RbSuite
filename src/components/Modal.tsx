import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({
  title,
  onClose,
  isDirty,
  children,
}: {
  title: string
  onClose: () => void
  // Si hay datos capturados, Esc pide confirmación antes de cerrar y
  // perderlos — Cancelar y la "X" sí cierran directo (el usuario ya
  // decidió). Clic afuera nunca cierra el modal (fácil de disparar sin
  // querer y perder todo lo llenado).
  isDirty?: boolean
  children: ReactNode
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (isDirty && !window.confirm('¿Cerrar sin guardar? Se perderá lo que capturaste.')) return
      onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose, isDirty])

  return createPortal(
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10 sm:pt-16">
      <div
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}
