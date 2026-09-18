import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import type { PosLayout } from '../types'

export function usePosLayout() {
  const { membership } = useAuth()

  return useQuery({
    queryKey: ['business-pos-layout', membership?.businessId],
    queryFn: async (): Promise<PosLayout> => {
      const { data, error } = await supabase
        .from('businesses')
        .select('pos_layout')
        .eq('id', membership!.businessId)
        .single()

      if (error) throw error
      return (data?.pos_layout as PosLayout) ?? 'catalogo'
    },
    enabled: !!membership?.businessId,
    staleTime: 60 * 1000,
  })
}

export function useUpdatePosLayout() {
  const { membership } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (posLayout: PosLayout) => {
      const { error } = await supabase
        .from('businesses')
        .update({ pos_layout: posLayout })
        .eq('id', membership!.businessId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-pos-layout', membership?.businessId] })
    },
  })
}
