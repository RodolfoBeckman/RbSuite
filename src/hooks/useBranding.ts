import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

export const DEFAULT_PRIMARY_COLOR = '#2F6FA8'

interface BrandingSettings {
  branding?: { primaryColor?: string }
}

interface BrandingData {
  primaryColor: string
  logoUrl: string | null
}

export function useBranding() {
  const { membership } = useAuth()

  return useQuery({
    queryKey: ['business-branding', membership?.businessId],
    queryFn: async (): Promise<BrandingData> => {
      const { data, error } = await supabase
        .from('businesses')
        .select('logo_url, settings')
        .eq('id', membership!.businessId)
        .single()

      if (error) throw error

      const settings = data?.settings as BrandingSettings | null
      return {
        primaryColor: settings?.branding?.primaryColor ?? DEFAULT_PRIMARY_COLOR,
        logoUrl: data?.logo_url ?? null,
      }
    },
    enabled: !!membership?.businessId,
    staleTime: 60 * 1000,
  })
}

export function useUpdateBrandColor() {
  const { membership } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (primaryColor: string) => {
      const { data: current, error: fetchError } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', membership!.businessId)
        .single()
      if (fetchError) throw fetchError

      const currentSettings = (current?.settings as BrandingSettings) ?? {}
      const nextSettings = {
        ...currentSettings,
        branding: { ...currentSettings.branding, primaryColor },
      }

      const { error } = await supabase
        .from('businesses')
        .update({ settings: nextSettings })
        .eq('id', membership!.businessId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-branding', membership?.businessId] })
    },
  })
}

export function useUploadLogo() {
  const { membership } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      const ext = file.name.split('.').pop() ?? 'png'
      const path = `${membership!.businessId}/logo.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('business-logos')
        .upload(path, file, { upsert: true, cacheControl: '3600' })
      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage.from('business-logos').getPublicUrl(path)
      // Cache-bust: el path es estable (logo.<ext>) y se sobrescribe con
      // upsert, así que sin esto el navegador/CDN podría seguir sirviendo
      // el logo anterior.
      const logoUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`

      const { error } = await supabase
        .from('businesses')
        .update({ logo_url: logoUrl })
        .eq('id', membership!.businessId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-branding', membership?.businessId] })
    },
  })
}
