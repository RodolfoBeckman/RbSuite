-- Etapa 11 (seguimiento): dos reportes más para el rango de fechas
-- personalizado de /reportes — mismos datos que ya existen en el
-- Dashboard (dashboard_payment_methods, dashboard_sales_by_branch), solo
-- que por rango arbitrario en vez de "últimos N días". Las funciones del
-- dashboard no se tocan.

create or replace function report_payment_methods(p_from date, p_to date)
returns table (method payment_method, total numeric)
language sql
stable
security definer
set search_path = public
as $$
  select p.method, coalesce(sum(p.amount), 0) as total
  from payments p
  join sales s on s.id = p.sale_id
  where s.business_id = current_business_id()
    and s.branch_id = any(current_branch_ids())
    and s.status = 'completed'
    and s.created_at >= p_from
    and s.created_at < (p_to + 1)
  group by p.method
  order by total desc
$$;

create or replace function report_sales_by_branch(p_from date, p_to date)
returns table (branch_id uuid, branch_name text, total numeric)
language sql
stable
security definer
set search_path = public
as $$
  select b.id as branch_id, b.name as branch_name, coalesce(sum(s.total), 0) as total
  from branches b
  left join sales s
    on s.branch_id = b.id
    and s.status = 'completed'
    and s.created_at >= p_from
    and s.created_at < (p_to + 1)
  where b.business_id = current_business_id()
    and b.id = any(current_branch_ids())
  group by b.id, b.name
  order by total desc
$$;
