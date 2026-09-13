import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

// A donde llega quien acepta una invitación de equipo: el link del correo
// ya deja una sesión activa (así funciona inviteUserByEmail), pero esa
// cuenta todavía no tiene contraseña — sin esto, la persona quedaría
// atrapada sin forma de volver a iniciar sesión después.
export default function SetPasswordPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <div className="p-6 text-sm text-gray-500">Cargando…</div>
  }

  if (!session) return <Navigate to="/login" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setSubmitting(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (updateError) {
      setError('No se pudo guardar la contraseña. Intenta de nuevo.')
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="mb-4 inline-block rounded-lg bg-white p-2">
          <img src="/logo.svg" alt="RB Suite" className="h-8 w-auto" />
        </div>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Bienvenido/a — crea tu contraseña para terminar de unirte al equipo.
        </p>

        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
          Nueva contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-brand dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          placeholder="••••••••"
        />

        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
          Confirma tu contraseña
        </label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mb-4 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-brand dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          placeholder="••••••••"
        />

        {error && <p className="mb-4 text-sm text-danger">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {submitting ? 'Guardando…' : 'Guardar y entrar'}
        </button>
      </form>
    </div>
  )
}
