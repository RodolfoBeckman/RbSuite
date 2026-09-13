-- RB Suite — Etapa 5: reportes para el Dashboard.
--
-- Todas estas funciones son de solo lectura y corren como invoker (NO
-- security definer): dependen de que las policies de select ya existentes
-- sobre sales/sale_items/payments/business_products/branches hagan el
-- filtrado por negocio/sucursal, igual que si el frontend hiciera la
-- consulta directo. Solo agrupan/agregan lo que el usuario ya puede ver.

-- "Hoy" en la zona horaria del negocio (México), no en UTC del servidor.
create or replace function local_day_start(p_at timestamptz default now())
returns timestamptz
language sql stable
as $$
  select date_trunc('day', p_at at time zone 'America/Mexico_City') at time zone 'America/Mexico_City'
$$;

create or replace function dashboard_today_summary()
returns table (total numeric, sales_count integer, open_cash_sessions integer)
language sql stable
as $$
  select
    coalesce((select sum(total) from sales
      where status = 'completed' and created_at >= local_day_start()), 0),
    coalesce((select count(*) from sales
      where status = 'completed' and created_at >= local_day_start()), 0)::integer,
    coalesce((select count(*) from cash_sessions cs
      join cash_registers cr on cr.id = cs.cash_register_id
      where cs.status = 'open' and cr.branch_id = any(current_branch_ids())), 0)::integer
$$;

create or replace function dashboard_sales_by_branch(p_days integer default 1)
returns table (branch_id uuid, branch_name text, total numeric)
language sql stable
as $$
  select b.id, b.name, coalesce(sum(s.total), 0)
  from branches b
  left join sales s
    on s.branch_id = b.id
    and s.status = 'completed'
    and s.created_at >= local_day_start() - (p_days - 1) * interval '1 day'
  group by b.id, b.name
  order by b.name
$$;

create or replace function dashboard_sales_trend(p_days integer default 7)
returns table (day date, total numeric)
language sql stable
as $$
  select gs.day::date, coalesce(sum(s.total), 0)
  from generate_series(
    local_day_start() - (p_days - 1) * interval '1 day',
    local_day_start(),
    interval '1 day'
  ) as gs(day)
  left join sales s
    on s.status = 'completed'
    and s.created_at >= gs.day
    and s.created_at < gs.day + interval '1 day'
  group by gs.day
  order by gs.day
$$;

create or replace function dashboard_payment_methods(p_days integer default 7)
returns table (method payment_method, total numeric)
language sql stable
as $$
  select p.method, sum(p.amount)
  from payments p
  join sales s on s.id = p.sale_id
  where s.status = 'completed'
    and s.created_at >= local_day_start() - (p_days - 1) * interval '1 day'
  group by p.method
  order by sum(p.amount) desc
$$;

create or replace function dashboard_top_items(p_days integer default 30, p_limit integer default 5)
returns table (name text, item_type sale_item_type, quantity numeric, total numeric)
language sql stable
as $$
  select
    coalesce(pc.name, sv.name) as name,
    si.item_type,
    sum(si.quantity) as quantity,
    sum(si.subtotal) as total
  from sale_items si
  join sales s on s.id = si.sale_id
  left join business_products bp on bp.id = si.business_product_id
  left join products_catalog pc on pc.id = bp.product_id
  left join services sv on sv.id = si.service_id
  where s.status = 'completed'
    and s.created_at >= local_day_start() - (p_days - 1) * interval '1 day'
  group by coalesce(pc.name, sv.name), si.item_type
  order by sum(si.quantity) desc
  limit p_limit
$$;

create or replace function dashboard_low_stock()
returns table (
  business_product_id uuid, name text, branch_id uuid, branch_name text,
  stock numeric, minimum_stock numeric
)
language sql stable
as $$
  select bp.id, pc.name, b.id, b.name, coalesce(inv.quantity, 0), bp.minimum_stock
  from business_products bp
  join products_catalog pc on pc.id = bp.product_id
  join branches b on b.business_id = bp.business_id
  left join inventory_stock inv
    on inv.business_product_id = bp.id and inv.branch_id = b.id
  where bp.active = true
    and coalesce(inv.quantity, 0) < bp.minimum_stock
  order by pc.name
$$;
