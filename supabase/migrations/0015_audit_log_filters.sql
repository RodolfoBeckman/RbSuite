-- Filtros de fecha y tipo de acción para Configuración → Auditoría, del
-- lado del servidor para que escale cuando haya muchos registros (en vez
-- de traer todo y filtrar en el cliente).
--
-- Se dropea la versión anterior de 2 parámetros porque agregar parámetros
-- a create or replace function crea un overload nuevo en vez de
-- reemplazarla — sin el drop quedarían las dos firmas coexistiendo.
drop function if exists list_audit_logs(int, int);

create or replace function list_audit_logs(
  p_limit int default 50,
  p_offset int default 0,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_action text default null
)
returns table (
  id uuid,
  actor_email text,
  action text,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select al.id, u.email, al.action, al.entity_type, al.entity_id, al.details, al.created_at
  from audit_logs al
  left join auth.users u on u.id = al.actor_user_id
  where al.business_id = current_business_id()
    and current_membership_role() = 'administrador'
    and (p_from is null or al.created_at >= p_from)
    and (p_to is null or al.created_at < p_to)
    and (p_action is null or al.action = p_action)
  order by al.created_at desc
  limit p_limit offset p_offset
$$;
