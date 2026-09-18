import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { PermissionAction, RoleName } from '../types'

export interface TeamMember {
  userId: string
  email: string
  role: RoleName
  branchId: string | null
  branchName: string | null
  permissionOverrides: Partial<Record<PermissionAction, boolean>>
}

export function useTeamMembers() {
  const { membership } = useAuth()

  return useQuery({
    queryKey: ['team-members', membership?.businessId],
    queryFn: async (): Promise<TeamMember[]> => {
      const { data, error } = await supabase.rpc('list_team_members')
      if (error) throw error

      return (data ?? []).map((row: Record<string, unknown>) => ({
        userId: row.user_id as string,
        email: row.email as string,
        role: row.role as RoleName,
        branchId: (row.branch_id as string | null) ?? null,
        branchName: (row.branch_name as string | null) ?? null,
        permissionOverrides:
          (row.permission_overrides as Partial<Record<PermissionAction, boolean>> | null) ?? {},
      }))
    },
    enabled: !!membership?.businessId,
  })
}

function useInvalidateTeam() {
  const queryClient = useQueryClient()
  const { membership } = useAuth()
  return () => queryClient.invalidateQueries({ queryKey: ['team-members', membership?.businessId] })
}

// supabase.functions.invoke() solo da un mensaje genérico
// ("Edge Function returned a non-2xx status code") — el mensaje real que
// arma la función vive en el body de la respuesta, que hay que leer aparte.
const FRIENDLY_FUNCTION_ERRORS: Record<string, string> = {
  'email rate limit exceeded': 'Llegaste al límite de envíos de correo, intenta más tarde.',
  'user already registered':
    'Ese correo ya tiene una cuenta. Quítale el acceso desde el equipo antes de volver a invitarlo.',
}

async function functionErrorMessage(error: unknown, fallback: string): Promise<string> {
  let raw: string | undefined
  const context = (error as { context?: unknown } | undefined)?.context
  if (context instanceof Response) {
    try {
      const body = await context.clone().json()
      if (typeof body?.error === 'string') raw = body.error
    } catch {
      // el body no era JSON, seguimos con el fallback
    }
  }
  if (!raw && error instanceof Error) raw = error.message

  if (!raw) return fallback
  const key = Object.keys(FRIENDLY_FUNCTION_ERRORS).find((k) => raw!.toLowerCase().includes(k))
  return key ? FRIENDLY_FUNCTION_ERRORS[key] : raw
}

export function useInviteTeamMember() {
  const invalidate = useInvalidateTeam()

  return useMutation({
    mutationFn: async (input: { email: string; role: RoleName; branchId: string | null }) => {
      const { error } = await supabase.functions.invoke('invite-team-member', {
        body: {
          email: input.email,
          role: input.role,
          branchId: input.branchId,
          redirectTo: `${window.location.origin}/invitacion`,
        },
      })
      if (error) throw new Error(await functionErrorMessage(error, 'No se pudo enviar la invitación'))
    },
    onSuccess: invalidate,
  })
}

export function useUpdateTeamMember() {
  const invalidate = useInvalidateTeam()

  return useMutation({
    mutationFn: async (input: {
      userId: string
      role: RoleName
      branchId: string | null
      permissionOverrides: Partial<Record<PermissionAction, boolean>>
    }) => {
      const { error } = await supabase.rpc('update_team_member', {
        p_target_user_id: input.userId,
        p_role: input.role,
        p_branch_id: input.branchId,
        p_permission_overrides: input.permissionOverrides,
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useRemoveTeamMember() {
  const invalidate = useInvalidateTeam()

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.functions.invoke('remove-team-member', {
        body: { userId },
      })
      if (error) throw new Error(await functionErrorMessage(error, 'No se pudo quitar el acceso'))
    },
    onSuccess: invalidate,
  })
}
