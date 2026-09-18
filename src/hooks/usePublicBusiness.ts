import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export interface PublicBranch {
  id: string
  name: string
  address: string | null
  phone: string | null
  hours: string | null
}

export interface PublicService {
  id: string
  name: string
  price: number
  durationMinutes: number | null
}

export interface PublicBusiness {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  primaryColor: string
  whatsapp: string | null
  description: string | null
  branches: PublicBranch[]
  services: PublicService[]
}

// Sin sesión: las tres consultas dependen de las políticas RLS
// "public_read_active_*" (ver 0017_public_landing.sql), que solo exponen
// negocios/sucursales/servicios activos.
export function usePublicBusiness(slug: string | undefined) {
  return useQuery({
    queryKey: ['public-business', slug],
    queryFn: async (): Promise<PublicBusiness | null> => {
      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .select('id, slug, name, logo_url, settings')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle()

      if (businessError) throw businessError
      if (!business) return null

      const settings = business.settings as {
        branding?: { primaryColor?: string }
        public?: { whatsapp?: string; description?: string }
      } | null

      const [{ data: branches, error: branchesError }, { data: services, error: servicesError }] =
        await Promise.all([
          supabase
            .from('branches')
            .select('id, name, address, phone, hours')
            .eq('business_id', business.id)
            .eq('active', true)
            .order('name'),
          supabase
            .from('services')
            .select('id, name, price, duration_minutes')
            .eq('business_id', business.id)
            .eq('active', true)
            .order('name'),
        ])

      if (branchesError) throw branchesError
      if (servicesError) throw servicesError

      return {
        id: business.id,
        slug: business.slug,
        name: business.name,
        logoUrl: business.logo_url,
        primaryColor: settings?.branding?.primaryColor ?? '#2F6FA8',
        whatsapp: settings?.public?.whatsapp ?? null,
        description: settings?.public?.description ?? null,
        branches: (branches ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          address: row.address,
          phone: row.phone,
          hours: row.hours,
        })),
        services: (services ?? []).map((row) => ({
          id: row.id,
          name: row.name,
          price: Number(row.price),
          durationMinutes: row.duration_minutes,
        })),
      }
    },
    enabled: !!slug,
  })
}
