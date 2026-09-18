import { useEffect, useState } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import LogoUploader from '../components/LogoUploader'
import { useAuth } from '../auth/AuthContext'
import { hasPermission, PERMISSION_LABELS } from '../auth/permissions'
import { useAuditLogs } from '../hooks/useAuditLogs'
import {
  DEFAULT_PRIMARY_COLOR,
  useBranding,
  useUpdateBrandColor,
  useUploadLogo,
} from '../hooks/useBranding'
import { useBusinessModules, useUpdateBusinessModules, type BusinessModules } from '../hooks/useBusinessModules'
import { useLabels, useUpdateLabels } from '../hooks/useLabels'
import { usePosLayout, useUpdatePosLayout } from '../hooks/usePosLayout'
import { usePublicPageSettings, useUpdatePublicPageSettings } from '../hooks/usePublicPageSettings'
import {
  useBranches,
  useCreateBranch,
  useManageBranches,
  useUpdateBranch,
  type BranchDetail,
} from '../hooks/useBranches'
import {
  useInviteTeamMember,
  useRemoveTeamMember,
  useTeamMembers,
  useUpdateTeamMember,
  type TeamMember,
} from '../hooks/useTeam'
import type { Labels } from '../labels/defaultLabels'
import type { PermissionAction, PosLayout, RoleName } from '../types'

function PaintIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-.9.7-1.5 1.5-1.5H16a4 4 0 0 0 4-4c0-4.4-3.6-8-8-8Z" />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="11" cy="7.5" r="1" fill="currentColor" />
      <circle cx="15" cy="8.5" r="1" fill="currentColor" />
    </svg>
  )
}

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 8a3 3 0 1 1 0 6M22 20c0-2.8-2-5.1-4.7-5.8" />
    </svg>
  )
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 2 3 11l10 11 9-9V2h-10Z" />
      <circle cx="16.5" cy="6.5" r="1.2" fill="currentColor" />
    </svg>
  )
}

function CashRegisterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path strokeLinecap="round" d="M8 7V5a4 4 0 0 1 8 0v2" />
      <circle cx="12" cy="13.5" r="2" />
    </svg>
  )
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="8" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
      <rect x="13" y="13" width="8" height="8" rx="1.5" />
    </svg>
  )
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M3 12h18M12 3c2.5 2.5 4 5.7 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.7-4-9s1.5-6.5 4-9Z" />
    </svg>
  )
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.5 12 2 2 3.5-4" />
    </svg>
  )
}

const LABEL_FIELDS: { key: keyof Labels; hint: string }[] = [
  { key: 'navDashboard', hint: 'Menú — Dashboard' },
  { key: 'navPos', hint: 'Menú — Punto de venta' },
  { key: 'navCaja', hint: 'Menú — Caja' },
  { key: 'navVentas', hint: 'Menú — Ventas' },
  { key: 'posTitle', hint: 'Título dentro del punto de venta' },
]

// "admin_only" no es un PermissionAction overridable a propósito — invitar
// o quitar gente del equipo se queda como acción exclusiva del
// Administrador (ver nota en 0018_granular_permissions.sql).
const SETTINGS_NAV: {
  to: string
  label: string
  permission: PermissionAction | 'admin_only'
  icon: typeof PaintIcon
}[] = [
  { to: 'marca', label: 'Marca', permission: 'manage_branding', icon: PaintIcon },
  { to: 'sucursales', label: 'Sucursales', permission: 'manage_branches', icon: MapPinIcon },
  { to: 'equipo', label: 'Equipo', permission: 'admin_only', icon: UsersIcon },
  { to: 'etiquetas', label: 'Etiquetas', permission: 'manage_branding', icon: TagIcon },
  { to: 'punto-de-venta', label: 'Punto de venta', permission: 'manage_branding', icon: CashRegisterIcon },
  { to: 'modulos', label: 'Módulos', permission: 'manage_branding', icon: GridIcon },
  { to: 'pagina-publica', label: 'Página pública', permission: 'manage_branding', icon: GlobeIcon },
  { to: 'auditoria', label: 'Auditoría', permission: 'view_audit_log', icon: ShieldIcon },
]

function useVisibleSettingsNav() {
  const { membership } = useAuth()
  return SETTINGS_NAV.filter((item) =>
    item.permission === 'admin_only'
      ? membership?.role === 'administrador'
      : hasPermission(membership, item.permission),
  )
}

export function SettingsIndexRedirect() {
  const visibleNav = useVisibleSettingsNav()
  return <Navigate to={visibleNav[0]?.to ?? 'marca'} replace />
}

export default function SettingsPage() {
  const visibleNav = useVisibleSettingsNav()

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start">
      <nav className="flex gap-2 overflow-x-auto md:w-48 md:flex-none md:flex-col md:gap-1">
        {visibleNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                isActive
                  ? 'bg-brand-tint text-brand-dark dark:bg-brand/20 dark:text-brand-light'
                  : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
              }`
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="max-w-2xl flex-1">
        {visibleNav.length === 0 ? (
          <p className="text-sm text-gray-400">No tienes acceso a ninguna sección de Configuración.</p>
        ) : (
          <Outlet />
        )}
      </div>
    </div>
  )
}

export function BrandingSection() {
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

  function handleLogoFile(file: File) {
    setFeedback(null)
    uploadLogo.mutate(file, {
      onSuccess: () => setFeedback({ type: 'success', text: 'Logo actualizado' }),
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo subir el logo',
        }),
    })
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>
  }

  return (
    <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-1 flex items-center gap-2">
          <PaintIcon className="h-5 w-5 text-brand" />
          <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
            Marca de tu negocio
          </h2>
        </div>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          El logo y el color se usan en el encabezado y los acentos de toda la app.
        </p>

        <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">Logo</label>
        <div className="mb-5">
          <LogoUploader
            currentUrl={branding?.logoUrl ?? null}
            uploading={uploadLogo.isPending}
            onSelect={handleLogoFile}
          />
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
            className="ml-auto rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
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
  )
}

const ROLE_OPTIONS: { value: RoleName; label: string }[] = [
  { value: 'administrador', label: 'Administrador' },
  { value: 'gerente', label: 'Gerente' },
  { value: 'vendedor', label: 'Vendedor' },
]

export function TeamSection() {
  const { data: members, isLoading } = useTeamMembers()
  const { data: branches } = useBranches()
  const inviteMember = useInviteTeamMember()

  const [invite, setInvite] = useState<{ email: string; role: RoleName; branchId: string }>({
    email: '',
    role: 'vendedor',
    branchId: '',
  })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleInvite() {
    if (!invite.email.trim()) return
    if (invite.role === 'vendedor' && !invite.branchId) {
      setFeedback({ type: 'error', text: 'Elige la sucursal del vendedor' })
      return
    }
    setFeedback(null)
    inviteMember.mutate(
      {
        email: invite.email.trim(),
        role: invite.role,
        branchId: invite.role === 'vendedor' ? invite.branchId : null,
      },
      {
        onSuccess: () => {
          setFeedback({ type: 'success', text: 'Invitación enviada' })
          setInvite({ email: '', role: 'vendedor', branchId: '' })
        },
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo enviar la invitación',
          }),
      },
    )
  }

  return (
    <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-1 flex items-center gap-2">
        <UsersIcon className="h-5 w-5 text-brand" />
        <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
          Equipo
        </h2>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Invita a tu equipo y asigna su rol y sucursal. Administrador y Gerente ven todas las
        sucursales; un Vendedor queda restringido a la suya.
      </p>

      <div className="mb-5 space-y-3">
        {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}
        {members?.map((member) => (
          <TeamMemberRow key={member.userId} member={member} branches={branches ?? []} />
        ))}
        {members?.length === 0 && (
          <p className="text-sm text-gray-400">Aún no tienes compañeros invitados.</p>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
        <p className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
          Invitar a alguien
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="email"
            placeholder="correo@ejemplo.com"
            value={invite.email}
            onChange={(event) => setInvite((prev) => ({ ...prev, email: event.target.value }))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <select
            value={invite.role}
            onChange={(event) =>
              setInvite((prev) => ({ ...prev, role: event.target.value as RoleName }))
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select
            value={invite.branchId}
            onChange={(event) => setInvite((prev) => ({ ...prev, branchId: event.target.value }))}
            disabled={invite.role !== 'vendedor'}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            <option value="">
              {invite.role === 'vendedor' ? 'Elige sucursal' : 'Todas las sucursales'}
            </option>
            {(branches ?? []).map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleInvite}
          disabled={inviteMember.isPending || !invite.email.trim()}
          className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
        >
          {inviteMember.isPending ? 'Enviando…' : 'Enviar invitación'}
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

function TeamMemberRow({
  member,
  branches,
}: {
  member: TeamMember
  branches: { id: string; name: string }[]
}) {
  const updateMember = useUpdateTeamMember()
  const removeMember = useRemoveTeamMember()

  const [form, setForm] = useState<{
    role: RoleName
    branchId: string
    permissionOverrides: Partial<Record<PermissionAction, boolean>>
  }>({
    role: member.role,
    branchId: member.branchId ?? '',
    permissionOverrides: member.permissionOverrides,
  })
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)

  const dirty =
    form.role !== member.role ||
    form.branchId !== (member.branchId ?? '') ||
    JSON.stringify(form.permissionOverrides) !== JSON.stringify(member.permissionOverrides)

  function togglePermission(action: PermissionAction, checked: boolean) {
    setForm((prev) => ({
      ...prev,
      permissionOverrides: { ...prev.permissionOverrides, [action]: checked },
    }))
  }

  function handleSave() {
    if (form.role === 'vendedor' && !form.branchId) {
      setFeedback('error')
      return
    }
    setFeedback(null)
    updateMember.mutate(
      {
        userId: member.userId,
        role: form.role,
        branchId: form.role === 'vendedor' ? form.branchId : null,
        permissionOverrides: form.permissionOverrides,
      },
      {
        onSuccess: () => setFeedback('success'),
        onError: () => setFeedback('error'),
      },
    )
  }

  function handleRemove() {
    if (!confirm(`¿Quitar acceso a ${member.email}?`)) return
    removeMember.mutate(member.userId)
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3 transition-colors duration-150 hover:border-brand/40 dark:border-gray-700">
      <p className="mb-2 truncate text-sm font-medium text-gray-700 dark:text-gray-200">
        {member.email}
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          value={form.role}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, role: event.target.value as RoleName }))
          }
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={form.branchId}
          onChange={(event) => setForm((prev) => ({ ...prev, branchId: event.target.value }))}
          disabled={form.role !== 'vendedor'}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none disabled:opacity-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="">
            {form.role === 'vendedor' ? 'Elige sucursal' : 'Todas las sucursales'}
          </option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={!dirty || updateMember.isPending}
            className="rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
          >
            {updateMember.isPending ? 'Guardando…' : 'Guardar'}
          </button>
          <button
            onClick={handleRemove}
            disabled={removeMember.isPending}
            className="ml-auto rounded-lg border border-danger px-3 py-1.5 text-sm font-semibold text-danger transition-colors duration-150 hover:bg-danger/10 disabled:opacity-50"
          >
            Quitar
          </button>
        </div>
      </div>

      {form.role !== 'administrador' && (
        <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
          <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
            Permisos adicionales (sobre lo que ya puede su rol)
          </p>
          <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
            {PERMISSION_LABELS.map((permission) => (
              <label
                key={permission.value}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={hasPermission(
                    { role: form.role, permissionOverrides: form.permissionOverrides },
                    permission.value,
                  )}
                  onChange={(event) => togglePermission(permission.value, event.target.checked)}
                />
                {permission.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {feedback === 'success' && <p className="mt-2 text-sm text-success">Guardado</p>}
      {feedback === 'error' && <p className="mt-2 text-sm text-danger">Error al guardar</p>}
    </div>
  )
}

const TIMEZONE_OPTIONS = [
  'America/Mexico_City',
  'America/Tijuana',
  'America/Cancun',
  'America/Hermosillo',
]

export function BranchesSection() {
  const { data: branches, isLoading } = useManageBranches()
  const createBranch = useCreateBranch()

  const [newBranch, setNewBranch] = useState({
    name: '',
    address: '',
    phone: '',
    hours: '',
    timezone: TIMEZONE_OPTIONS[0],
  })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleCreate() {
    if (!newBranch.name.trim()) return
    setFeedback(null)
    createBranch.mutate(newBranch, {
      onSuccess: () => {
        setFeedback({ type: 'success', text: 'Sucursal creada' })
        setNewBranch({ name: '', address: '', phone: '', hours: '', timezone: TIMEZONE_OPTIONS[0] })
      },
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo crear la sucursal',
        }),
    })
  }

  return (
    <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-1 flex items-center gap-2">
        <MapPinIcon className="h-5 w-5 text-brand" />
        <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
          Sucursales
        </h2>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Da de alta y edita las sucursales de tu negocio. Desactivar una sucursal la oculta del
        punto de venta sin borrar su historial.
      </p>

      <div className="mb-5 space-y-3">
        {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}
        {branches?.map((branch) => (
          <BranchRow key={branch.id} branch={branch} />
        ))}
        {branches?.length === 0 && (
          <p className="text-sm text-gray-400">Aún no tienes sucursales registradas.</p>
        )}
      </div>

      <div className="rounded-lg border border-dashed border-gray-300 p-4 dark:border-gray-600">
        <p className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-300">
          Nueva sucursal
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            type="text"
            placeholder="Nombre (ej. Norte)"
            value={newBranch.name}
            onChange={(event) => setNewBranch((prev) => ({ ...prev, name: event.target.value }))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            placeholder="Dirección (opcional)"
            value={newBranch.address}
            onChange={(event) =>
              setNewBranch((prev) => ({ ...prev, address: event.target.value }))
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            placeholder="Teléfono (opcional)"
            value={newBranch.phone}
            onChange={(event) => setNewBranch((prev) => ({ ...prev, phone: event.target.value }))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <input
            type="text"
            placeholder="Horario (ej. Lun-Sáb 9am-7pm)"
            value={newBranch.hours}
            onChange={(event) => setNewBranch((prev) => ({ ...prev, hours: event.target.value }))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          />
          <select
            value={newBranch.timezone}
            onChange={(event) =>
              setNewBranch((prev) => ({ ...prev, timezone: event.target.value }))
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
          >
            {TIMEZONE_OPTIONS.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCreate}
          disabled={createBranch.isPending || !newBranch.name.trim()}
          className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
        >
          {createBranch.isPending ? 'Creando…' : 'Agregar sucursal'}
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

function BranchRow({ branch }: { branch: BranchDetail }) {
  const updateBranch = useUpdateBranch()
  const [form, setForm] = useState({
    name: branch.name,
    address: branch.address ?? '',
    phone: branch.phone ?? '',
    hours: branch.hours ?? '',
    timezone: branch.timezone,
    active: branch.active,
  })
  const [feedback, setFeedback] = useState<'success' | 'error' | null>(null)

  const dirty =
    form.name !== branch.name ||
    form.address !== (branch.address ?? '') ||
    form.phone !== (branch.phone ?? '') ||
    form.hours !== (branch.hours ?? '') ||
    form.timezone !== branch.timezone ||
    form.active !== branch.active

  function handleSave() {
    setFeedback(null)
    updateBranch.mutate(
      { id: branch.id, ...form },
      {
        onSuccess: () => setFeedback('success'),
        onError: () => setFeedback('error'),
      },
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 p-3 transition-colors duration-150 hover:border-brand/40 dark:border-gray-700">
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="text"
          value={form.name}
          onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <input
          type="text"
          placeholder="Dirección"
          value={form.address}
          onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <input
          type="text"
          placeholder="Teléfono"
          value={form.phone}
          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <input
          type="text"
          placeholder="Horario"
          value={form.hours}
          onChange={(event) => setForm((prev) => ({ ...prev, hours: event.target.value }))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        />
        <select
          value={form.timezone}
          onChange={(event) => setForm((prev) => ({ ...prev, timezone: event.target.value }))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
          />
          Activa
        </label>
        <button
          onClick={handleSave}
          disabled={!dirty || updateBranch.isPending}
          className="ml-auto rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
        >
          {updateBranch.isPending ? 'Guardando…' : 'Guardar'}
        </button>
        {feedback === 'success' && <span className="text-sm text-success">Guardado</span>}
        {feedback === 'error' && <span className="text-sm text-danger">Error al guardar</span>}
      </div>
    </div>
  )
}

export function LabelsSection() {
  const labels = useLabels()
  const updateLabels = useUpdateLabels()

  const [form, setForm] = useState<Labels>(labels)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  useEffect(() => {
    setForm(labels)
    // Solo re-sincronizar cuando cambian los valores guardados, no en cada
    // render (labels es un objeto nuevo cada vez que useLabels corre).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(labels)])

  function handleSave() {
    setFeedback(null)
    updateLabels.mutate(form, {
      onSuccess: () => setFeedback({ type: 'success', text: 'Textos actualizados' }),
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo guardar',
        }),
    })
  }

  return (
    <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-1 flex items-center gap-2">
        <TagIcon className="h-5 w-5 text-brand" />
        <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
          Textos de la interfaz
        </h2>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Personaliza los nombres que ve tu equipo — por ejemplo, si no manejas servicios, puedes
        quitar esa palabra del menú de ventas.
      </p>

      <div className="mb-4 space-y-3">
        {LABEL_FIELDS.map(({ key, hint }) => (
          <div key={key}>
            <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">{hint}</label>
            <input
              type="text"
              value={form[key]}
              onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={updateLabels.isPending}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
      >
        {updateLabels.isPending ? 'Guardando…' : 'Guardar textos'}
      </button>

      {feedback && (
        <p className={`mt-3 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
          {feedback.text}
        </p>
      )}
    </div>
  )
}

const POS_LAYOUT_OPTIONS: { value: PosLayout; label: string; hint: string }[] = [
  {
    value: 'catalogo',
    label: 'Catálogo',
    hint: 'Tarjetas visuales. Ideal para salones, boutiques y negocios con pocos productos y servicios.',
  },
  {
    value: 'ferreteria',
    label: 'Ferretería',
    hint: 'Tabla densa agrupada por departamento. Ideal para catálogos grandes organizados por categoría.',
  },
  {
    value: 'abarrotes',
    label: 'Abarrotes',
    hint: 'Prioriza escanear o teclear el código de barras, con el total siempre visible en grande.',
  },
]

export function PosLayoutSection() {
  const { data: posLayout, isLoading } = usePosLayout()
  const updatePosLayout = useUpdatePosLayout()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleSelect(value: PosLayout) {
    if (value === posLayout) return
    setFeedback(null)
    updatePosLayout.mutate(value, {
      onSuccess: () => setFeedback({ type: 'success', text: 'Diseño de venta actualizado' }),
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo guardar',
        }),
    })
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>
  }

  return (
    <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-1 flex items-center gap-2">
        <CashRegisterIcon className="h-5 w-5 text-brand" />
        <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
          Punto de venta
        </h2>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Elige el diseño de la pantalla de venta según cómo trabaja tu negocio.
      </p>

      <div className="space-y-2">
        {POS_LAYOUT_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => handleSelect(option.value)}
            disabled={updatePosLayout.isPending}
            className={`w-full rounded-lg border p-3 text-left transition-colors duration-150 disabled:opacity-50 ${
              posLayout === option.value
                ? 'border-brand bg-brand-tint dark:bg-brand/20'
                : 'border-gray-200 hover:border-brand dark:border-gray-600'
            }`}
          >
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {option.label}
            </p>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{option.hint}</p>
          </button>
        ))}
      </div>

      {feedback && (
        <p className={`mt-3 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
          {feedback.text}
        </p>
      )}
    </div>
  )
}

const MODULE_OPTIONS: { key: keyof BusinessModules; label: string; hint: string }[] = [
  {
    key: 'caja',
    label: 'Caja',
    hint: 'Apertura/cierre de caja y control de efectivo. Desactívalo si tu negocio no maneja cortes de caja.',
  },
  {
    key: 'inventario',
    label: 'Inventario',
    hint: 'Productos con stock por sucursal. Desactívalo si tu negocio vende solo servicios.',
  },
  {
    key: 'servicios',
    label: 'Servicios',
    hint: 'Servicios sin stock (ej. cortes, consultas). Desactívalo si tu negocio vende solo productos.',
  },
]

export function ModulesSection() {
  const { data: modules, isLoading } = useBusinessModules()
  const updateModules = useUpdateBusinessModules()
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )

  function handleToggle(key: keyof BusinessModules, checked: boolean) {
    if (!modules) return
    setFeedback(null)
    updateModules.mutate(
      { ...modules, [key]: checked },
      {
        onSuccess: () => setFeedback({ type: 'success', text: 'Módulos actualizados' }),
        onError: (error) =>
          setFeedback({
            type: 'error',
            text: error instanceof Error ? error.message : 'No se pudo guardar',
          }),
      },
    )
  }

  if (isLoading || !modules) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>
  }

  return (
    <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-1 flex items-center gap-2">
        <GridIcon className="h-5 w-5 text-brand" />
        <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
          Módulos
        </h2>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Prende o apaga secciones enteras según cómo trabaja tu negocio. Se puede reactivar en
        cualquier momento sin perder nada de lo ya capturado.
      </p>

      <div className="space-y-3">
        {MODULE_OPTIONS.map((option) => (
          <label
            key={option.key}
            className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 transition-colors duration-150 hover:border-brand/40 dark:border-gray-600"
          >
            <input
              type="checkbox"
              checked={modules[option.key]}
              onChange={(event) => handleToggle(option.key, event.target.checked)}
              disabled={updateModules.isPending}
              className="mt-0.5"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-800 dark:text-gray-100">
                {option.label}
              </span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {feedback && (
        <p className={`mt-3 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
          {feedback.text}
        </p>
      )}
    </div>
  )
}

export function PublicPageSection() {
  const { data: settings, isLoading } = usePublicPageSettings()
  const updateSettings = useUpdatePublicPageSettings()

  const [form, setForm] = useState({ whatsapp: '', description: '' })
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  )
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (settings) setForm({ whatsapp: settings.whatsapp, description: settings.description })
  }, [settings])

  const publicUrl = settings?.slug ? `${window.location.origin}/negocio/${settings.slug}` : null

  function handleSave() {
    setFeedback(null)
    updateSettings.mutate(form, {
      onSuccess: () => setFeedback({ type: 'success', text: 'Página pública actualizada' }),
      onError: (error) =>
        setFeedback({
          type: 'error',
          text: error instanceof Error ? error.message : 'No se pudo guardar',
        }),
    })
  }

  async function handleCopy() {
    if (!publicUrl) return
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard puede fallar por permisos del navegador; no es crítico,
      // el enlace ya se muestra en pantalla para copiar a mano.
    }
  }

  if (isLoading) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>
  }

  return (
    <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-1 flex items-center gap-2">
        <GlobeIcon className="h-5 w-5 text-brand" />
        <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
          Página pública
        </h2>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Una página visible para cualquiera, con tus servicios, sucursales y un botón de contacto
        por WhatsApp. Usa el logo y color de marca que ya configuraste.
      </p>

      {publicUrl && (
        <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-900">
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm font-medium text-brand-dark hover:underline dark:text-brand-light"
          >
            {publicUrl}
          </a>
          <button
            onClick={handleCopy}
            className="ml-auto rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 transition-colors duration-150 hover:border-brand hover:text-brand-dark dark:border-gray-600 dark:text-gray-300"
          >
            {copied ? 'Copiado' : 'Copiar enlace'}
          </button>
        </div>
      )}

      <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
        Descripción breve
      </label>
      <textarea
        value={form.description}
        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        rows={3}
        placeholder="Ej. Salón de belleza con más de 10 años de experiencia en Guadalajara."
        className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />

      <label className="mb-1 block text-sm text-gray-600 dark:text-gray-300">
        WhatsApp de contacto
      </label>
      <input
        type="text"
        value={form.whatsapp}
        onChange={(event) => setForm((prev) => ({ ...prev, whatsapp: event.target.value }))}
        placeholder="Ej. 33 1234 5678"
        className="mb-4 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
      />

      <button
        onClick={handleSave}
        disabled={updateSettings.isPending}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-brand-dark hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none"
      >
        {updateSettings.isPending ? 'Guardando…' : 'Guardar'}
      </button>

      {feedback && (
        <p className={`mt-3 text-sm ${feedback.type === 'success' ? 'text-success' : 'text-danger'}`}>
          {feedback.text}
        </p>
      )}
    </div>
  )
}

const ACTION_LABEL: Record<string, string> = {
  cancel_sale: 'Canceló una venta',
  create_business_product: 'Agregó un producto',
  update_business_product: 'Editó un producto',
  adjust_stock: 'Ajustó inventario',
  cash_withdrawal: 'Retiro de caja',
  invite_team_member: 'Invitó a un miembro del equipo',
  update_team_member: 'Cambió rol/sucursal de un miembro',
  remove_team_member: 'Quitó acceso a un miembro',
}

function formatAuditDetails(details: Record<string, unknown>): string {
  return Object.entries(details ?? {})
    .map(([key, value]) => {
      if (value && typeof value === 'object' && 'before' in (value as object) && 'after' in (value as object)) {
        const { before, after } = value as { before: unknown; after: unknown }
        return `${key}: ${before ?? '—'} → ${after ?? '—'}`
      }
      return `${key}: ${value ?? '—'}`
    })
    .join(' · ')
}

const auditDateFormat = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' })

const DATE_PRESETS: { value: string; label: string }[] = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'last7', label: 'Últimos 7 días' },
  { value: 'all', label: 'Todo' },
]

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function presetRange(preset: string): { from?: Date; to?: Date } {
  const today = startOfDay(new Date())
  if (preset === 'today') return { from: today }
  if (preset === 'yesterday') {
    const from = new Date(today)
    from.setDate(from.getDate() - 1)
    return { from, to: today }
  }
  if (preset === 'last7') {
    const from = new Date(today)
    from.setDate(from.getDate() - 6)
    return { from }
  }
  return {}
}

export function AuditLogSection() {
  const [preset, setPreset] = useState('today')
  const [actionFilter, setActionFilter] = useState<string | null>(null)
  const range = presetRange(preset)
  const { data, isLoading, loadMore } = useAuditLogs({
    from: range.from,
    to: range.to,
    action: actionFilter,
  })

  return (
    <div className="animate-fade-in rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-1 flex items-center gap-2">
        <ShieldIcon className="h-5 w-5 text-brand" />
        <h2 className="font-serif text-lg font-semibold text-brand-dark dark:text-brand-light">
          Auditoría
        </h2>
      </div>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        Quién hizo qué en acciones sensibles: cancelar ventas, cambiar precios, ajustar
        inventario, retiros de caja, y cambios al equipo.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
          {DATE_PRESETS.map((item) => (
            <button
              key={item.value}
              onClick={() => setPreset(item.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150 ${
                preset === item.value
                  ? 'bg-white text-brand-dark shadow-sm dark:bg-gray-700 dark:text-brand-light'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <select
          value={actionFilter ?? ''}
          onChange={(event) => setActionFilter(event.target.value || null)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs focus:border-brand focus:outline-none dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="">Todas las acciones</option>
          {Object.entries(ACTION_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-gray-500 dark:text-gray-400">Cargando…</p>}
        {data?.items.map((entry) => {
          const details = formatAuditDetails(entry.details)
          return (
            <div
              key={entry.id}
              className="rounded-lg border border-gray-200 p-3 text-sm transition-colors duration-150 hover:border-brand/40 dark:border-gray-700"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {ACTION_LABEL[entry.action] ?? entry.action}
                </span>
                <span className="text-xs text-gray-400">
                  {auditDateFormat.format(new Date(entry.createdAt))}
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {entry.actorEmail ?? 'Sistema'}
              </p>
              {details && <p className="mt-1 text-xs text-gray-400">{details}</p>}
            </div>
          )
        })}
        {data?.items.length === 0 && !isLoading && (
          <p className="text-sm text-gray-400">Sin actividad registrada todavía.</p>
        )}
      </div>

      {data?.hasMore && (
        <button
          onClick={loadMore}
          className="mt-4 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition-colors duration-150 hover:border-brand hover:text-brand-dark dark:border-gray-600 dark:text-gray-300"
        >
          Cargar más
        </button>
      )}
    </div>
  )
}
