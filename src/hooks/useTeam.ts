import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { RoleName } from '../types'

export interface TeamMember {
  userId: string
  email: string
  role: RoleName
  branchId: string | null
  branchName: string | null
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
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useUpdateTeamMember() {
  const invalidate = useInvalidateTeam()

  return useMutation({
    mutationFn: async (input: { userId: string; role: RoleName; branchId: string | null }) => {
      const { error } = await supabase.rpc('update_team_member', {
        p_target_user_id: input.userId,
        p_role: input.role,
        p_branch_id: input.branchId,
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
      const { error } = await supabase.rpc('remove_team_member', { p_target_user_id: userId })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}
