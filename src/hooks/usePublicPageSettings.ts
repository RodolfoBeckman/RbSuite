import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

interface PublicPageSettingsShape {
  public?: { whatsapp?: string; description?: string }
}

export interface PublicPageSettings {
  slug: string
  whatsapp: string
  description: string
}

// Igual patrón que useBranding: se guarda dentro de businesses.settings
// (clave "public") en vez de columnas propias, siguiendo la convención ya
// usada para branding/labels.
export function usePublicPageSettings() {
  const { membership } = useAuth()

  return useQuery({
    queryKey: ['business-public-settings', membership?.businessId],
    queryFn: async (): Promise<PublicPageSettings> => {
      const { data, error } = await supabase
        .from('businesses')
        .select('slug, settings')
        .eq('id', membership!.businessId)
        .single()

      if (error) throw error

      const settings = data?.settings as PublicPageSettingsShape | null
      return {
        slug: data?.slug ?? '',
        whatsapp: settings?.public?.whatsapp ?? '',
        description: settings?.public?.description ?? '',
      }
    },
    enabled: !!membership?.businessId,
  })
}

export function useUpdatePublicPageSettings() {
  const { membership } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { whatsapp: string; description: string }) => {
      const { data: current, error: fetchError } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', membership!.businessId)
        .single()
      if (fetchError) throw fetchError

      const currentSettings = (current?.settings as PublicPageSettingsShape) ?? {}
      const nextSettings = {
        ...currentSettings,
        public: { whatsapp: input.whatsapp || undefined, description: input.description || undefined },
      }

      const { error } = await supabase
        .from('businesses')
        .update({ settings: nextSettings })
        .eq('id', membership!.businessId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['business-public-settings', membership?.businessId],
      })
    },
  })
}
