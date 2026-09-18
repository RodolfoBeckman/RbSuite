import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

// Módulos activables por negocio (P1) — pensado para cuando existan
// negocios de otro giro: una ferretería puede no necesitar "servicios", un
// negocio que no maneja efectivo puede no necesitar "caja". Todos truthy
// por default para no cambiar nada en negocios ya existentes (Estética Ly
// usa los tres). Vive en businesses.settings.modules, mismo patrón jsonb
// que branding/labels/pos_layout.
export interface BusinessModules {
  caja: boolean
  inventario: boolean
  servicios: boolean
}

const DEFAULT_MODULES: BusinessModules = { caja: true, inventario: true, servicios: true }

interface ModulesSettingsShape {
  modules?: Partial<BusinessModules>
}

// Cualquier miembro (no solo Administrador) necesita saber qué módulos
// están activos para que la navegación se ajuste — a diferencia de
// branding/pos_layout, que solo lee Configuración.
export function useBusinessModules() {
  const { membership } = useAuth()

  return useQuery({
    queryKey: ['business-modules', membership?.businessId],
    queryFn: async (): Promise<BusinessModules> => {
      const { data, error } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', membership!.businessId)
        .single()

      if (error) throw error

      const settings = data?.settings as ModulesSettingsShape | null
      return { ...DEFAULT_MODULES, ...settings?.modules }
    },
    enabled: !!membership?.businessId,
    staleTime: 60 * 1000,
  })
}

export function useUpdateBusinessModules() {
  const { membership } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (modules: BusinessModules) => {
      const { data: current, error: fetchError } = await supabase
        .from('businesses')
        .select('settings')
        .eq('id', membership!.businessId)
        .single()
      if (fetchError) throw fetchError

      const currentSettings = (current?.settings as ModulesSettingsShape) ?? {}
      const nextSettings = { ...currentSettings, modules }

      const { error } = await supabase
        .from('businesses')
        .update({ settings: nextSettings })
        .eq('id', membership!.businessId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-modules', membership?.businessId] })
    },
  })
}
