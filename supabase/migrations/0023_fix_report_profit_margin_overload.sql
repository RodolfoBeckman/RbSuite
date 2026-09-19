-- 0022 added a third parameter to report_profit_margin via `create or
-- replace function`, but Postgres only replaces a function when the
-- parameter types match exactly — a different parameter count is a
-- different signature, so 0022 actually left TWO overloaded versions of
-- report_profit_margin in the database (the old 2-arg one from 0021, and
-- the new 3-arg one) instead of replacing it. list_team_members hit this
-- same trap back in 0018 and was fixed the same way: drop the old
-- signature explicitly before recreating.
drop function if exists report_profit_margin(date, date);

create or replace function report_profit_margin(
  p_from date,
  p_to date,
  p_employee_user_id uuid default null
)
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
    and (p_employee_user_id is null or s.cashier_user_id = p_employee_user_id)
  group by coalesce(pc.name, sv.name, 'Producto/servicio'), si.item_type
  order by profit desc
$$;
