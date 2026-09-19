-- RB Suite — Etapa 11: Reportes avanzados.
--
-- El Dashboard (Etapa 5) ya cubre "hoy" y "últimos N días" con ventanas
-- fijas. Estas funciones son deliberadamente separadas (no se tocan las
-- de dashboard_*) porque aceptan un rango de fechas arbitrario elegido
-- por el usuario, que es lo que pidió el cliente: cualquier periodo, no
-- solo los últimos 7/30 días.
--
-- p_from/p_to son fechas (sin hora); p_to se trata como inclusivo todo el
-- día, igual que el resto del sistema no usa zona horaria explícita para
-- estos cortes (mismo criterio que ya usa dashboard_sales_trend).

create or replace function report_sales_summary(p_from date, p_to date)
returns table (total numeric, sales_count integer, avg_ticket numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(sum(s.total), 0) as total,
    count(*)::integer as sales_count,
    case when count(*) > 0 then coalesce(sum(s.total), 0) / count(*) else 0 end as avg_ticket
  from sales s
  where s.business_id = current_business_id()
    and s.branch_id = any(current_branch_ids())
    and s.status = 'completed'
    and s.created_at >= p_from
    and s.created_at < (p_to + 1)
$$;

create or replace function report_sales_trend(p_from date, p_to date)
returns table (day date, total numeric)
language sql
stable
security definer
set search_path = public
as $$
  select d::date as day, coalesce(sum(s.total), 0) as total
  from generate_series(p_from, p_to, interval '1 day') as d
  left join sales s
    on s.created_at >= d
    and s.created_at < d + interval '1 day'
    and s.business_id = current_business_id()
    and s.branch_id = any(current_branch_ids())
    and s.status = 'completed'
  group by d
  order by d
$$;

-- Ventas por empleado (cajero) en el rango — email en vez de nombre
-- porque el sistema no guarda un display_name propio (mismo criterio que
-- list_team_members).
create or replace function report_sales_by_employee(p_from date, p_to date)
returns table (user_id uuid, email text, total numeric, sales_count integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.cashier_user_id as user_id,
    u.email,
    coalesce(sum(s.total), 0) as total,
    count(*)::integer as sales_count
  from sales s
  join auth.users u on u.id = s.cashier_user_id
  where s.business_id = current_business_id()
    and s.branch_id = any(current_branch_ids())
    and s.status = 'completed'
    and s.created_at >= p_from
    and s.created_at < (p_to + 1)
  group by s.cashier_user_id, u.email
  order by total desc
$$;

-- Utilidad/margen por producto o servicio. Los servicios no tienen un
-- costo capturado en el sistema (no hay insumo/material asociado), así
-- que su costo se trata como 0 — toda su venta es utilidad. Un producto
-- sin purchase_price capturado (columna nullable desde el inicio) también
-- cae en costo 0 en vez de romper el reporte; queda visible porque
-- profit == revenue delata que falta capturar el costo de compra.
create or replace function report_profit_margin(p_from date, p_to date)
returns table (
  item_name text,
  item_type sale_item_type,
  quantity numeric,
  revenue numeric,
  cost numeric,
  profit numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(pc.name, sv.name, 'Producto/servicio') as item_name,
    si.item_type,
    sum(si.quantity) as quantity,
    sum(si.subtotal) as revenue,
    sum(case when si.item_type = 'product' then coalesce(bp.purchase_price, 0) * si.quantity else 0 end) as cost,
    sum(si.subtotal) - sum(case when si.item_type = 'product' then coalesce(bp.purchase_price, 0) * si.quantity else 0 end) as profit
  from sale_items si
  join sales s on s.id = si.sale_id
  left join business_products bp on bp.id = si.business_product_id
  left join products_catalog pc on pc.id = bp.product_id
  left join services sv on sv.id = si.service_id
  where s.business_id = current_business_id()
    and s.branch_id = any(current_branch_ids())
    and s.status = 'completed'
    and s.created_at >= p_from
    and s.created_at < (p_to + 1)
  group by coalesce(pc.name, sv.name, 'Producto/servicio'), si.item_type
  order by profit desc
$$;
