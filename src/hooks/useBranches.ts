import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { Branch } from '../types'

// RLS ya limita esto a las sucursales del negocio actual (y, si el usuario
// tiene branch_id fijo, a esa única sucursal vía current_branch_ids()).
export function useBranches() {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async (): Promise<Branch[]> => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, business_id, name')
        .eq('active', true)
        .order('name')

      if (error) throw error

      return (data ?? []).map((row) => ({
        id: row.id,
        businessId: row.business_id,
        name: row.name,
      }))
    },
  })
}
