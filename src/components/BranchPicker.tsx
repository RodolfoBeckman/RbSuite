import { useAuth } from '../auth/AuthContext'
import { useBranches } from '../hooks/useBranches'

// Administrador y Gerente ven todas las sucursales (branch_id null en su
// membership), así que eligen desde cuál están operando antes de usar el
// POS o la Caja. El Vendedor ya trae branch_id fijo y nunca ve esto.
export default function BranchPicker({ title }: { title: string }) {
  const { setActiveBranchId } = useAuth()
  const { data: branches, isLoading } = useBranches()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <h2 className="mb-3 font-serif text-lg font-semibold text-brand-dark">{title}</h2>
      {isLoading ? (
        <p className="text-sm text-gray-500">Cargando sucursales…</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {branches?.map((branch) => (
            <button
              key={branch.id}
              onClick={() => setActiveBranchId(branch.id)}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:border-brand hover:text-brand-dark"
            >
              {branch.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
