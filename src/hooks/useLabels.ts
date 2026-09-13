import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { DEFAULT_LABELS, type Labels } from '../labels/defaultLabels'

interface BusinessSettings {
  labels?: Partial<Labels>
}

// Textos de UI resueltos: los que el negocio haya personalizado en
// businesses.settings.labels, con DEFAULT_LABELS como respaldo para
// cualquier clave que no haya configurado.
export function useLabels(): Labels {
  const { membership } = useAuth()

  const { data } = useQuery({
    queryKey: ['business-labels', membership?.businessId],
    queryFn: async (): Promise<Partial<Labels>> => {
      const { data, error } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', membership!.businessId)
        .single()

      if (error) throw error

      const settings = data?.settings as BusinessSettings | null
      return settings?.labels ?? {}
    },
    enabled: !!membership?.businessId,
    staleTime: 5 * 60 * 1000,
  })

  return { ...DEFAULT_LABELS, ...data }
}

// Solo guarda las claves que se le pasen — se mergea con lo que ya exista
// en settings.branding, nunca lo pisa.
export function useUpdateLabels() {
  const { membership } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (labels: Partial<Labels>) => {
      const { data: current, error: fetchError } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', membership!.businessId)
        .single()
      if (fetchError) throw fetchError

      const currentSettings = (current?.settings as BusinessSettings) ?? {}
      const nextSettings = {
        ...currentSettings,
        labels: { ...currentSettings.labels, ...labels },
      }

      const { error } = await supabase
        .from('businesses')
        .update({ settings: nextSettings })
        .eq('id', membership!.businessId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-labels', membership?.businessId] })
    },
  })
}
