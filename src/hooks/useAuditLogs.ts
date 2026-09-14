import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

export interface AuditLogEntry {
  id: string
  actorEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  details: Record<string, unknown>
  createdAt: string
}

interface AuditLogRow {
  id: string
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: string | null
  details: Record<string, unknown> | null
  created_at: string
}

export interface AuditLogFilters {
  from?: Date
  to?: Date
  action: string | null
}

const PAGE_SIZE = 50

export function useAuditLogs(filters: AuditLogFilters) {
  const { membership } = useAuth()
  const [pages, setPages] = useState(1)
  const filterKey = `${filters.from?.toISOString() ?? ''}|${filters.to?.toISOString() ?? ''}|${filters.action ?? ''}`

  // Cada vez que cambian los filtros, se vuelve a empezar desde la
  // primera página en vez de seguir acumulando "cargar más" sobre un
  // conjunto de resultados distinto.
  useEffect(() => {
    setPages(1)
  }, [filterKey])

  const query = useQuery({
    queryKey: ['audit-logs', membership?.businessId, filterKey, pages],
    queryFn: async (): Promise<{ items: AuditLogEntry[]; hasMore: boolean }> => {
      const limit = PAGE_SIZE * pages
      const { data, error } = await supabase.rpc('list_audit_logs', {
        p_limit: limit + 1,
        p_offset: 0,
        p_from: filters.from ? filters.from.toISOString() : null,
        p_to: filters.to ? filters.to.toISOString() : null,
        p_action: filters.action,
      })
      if (error) throw error

      const rows = (data ?? []) as AuditLogRow[]
      const hasMore = rows.length > limit

      return {
        items: rows.slice(0, limit).map((row) => ({
          id: row.id,
          actorEmail: row.actor_email,
          action: row.action,
          entityType: row.entity_type,
          entityId: row.entity_id,
          details: row.details ?? {},
          createdAt: row.created_at,
        })),
        hasMore,
      }
    },
    enabled: !!membership?.businessId,
  })

  return { ...query, loadMore: () => setPages((p) => p + 1) }
}
