-- 0019_offline_idempotency.sql added a "select exists → return early"
-- check before each insert to make retries safe. That check-then-insert
-- is not atomic: two calls with the same client-supplied id that reach
-- the check at nearly the same moment can both see "not exists" and both
-- proceed. In practice `create_sale` mostly avoided a real double-charge
-- because the folio-counter row lock happens to serialize concurrent
-- calls first — but that's an accident of unrelated code, not a
-- guarantee, and it doesn't apply the same way to the other two
-- functions. Make all three explicitly safe under real concurrency by
-- catching the primary-key violation on the insert itself and returning
-- the existing row's id instead of raising.

create or replace function open_cash_session(
  p_cash_register_id uuid,
  p_opening_amount numeric,
  p_session_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
  if p_session_id is not null and exists (select 1 from cash_sessions where id = p_session_id) then
    return p_session_id;
  end if;

  if not exists (
    select 1 from cash_registers
    where id = p_cash_register_id and branch_id = any(current_branch_ids())
  ) then
    raise exception 'Caja inválida o fuera de tu alcance';
  end if;

  if exists (
    select 1 from cash_sessions where cash_register_id = p_cash_register_id and status = 'open'
  ) then
    raise exception 'Esta caja ya tiene una sesión abierta';
  end if;

  begin
    insert into cash_sessions (id, cash_register_id, opened_by_user_id, opening_amount)
    values (coalesce(p_session_id, gen_random_uuid()), p_cash_register_id, auth.uid(), p_opening_amount)
    returning id into v_session_id;
  exception when unique_violation then
    return p_session_id;
  end;

  return v_session_id;
end;
$$;

create or replace function register_cash_movement(
  p_session_id uuid,
  p_type cash_movement_type,
  p_amount numeric,
  p_reason text default null,
  p_movement_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_movement_id uuid;
  v_signed_amount numeric(12, 2);
begin
  if p_movement_id is not null and exists (select 1 from cash_movements where id = p_movement_id) then
    return p_movement_id;
  end if;

  if p_type = 'sale' then
    raise exception 'El tipo sale solo lo registra create_sale';
  end if;

  if p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  if not exists (
    select 1 from cash_sessions cs
    join cash_registers cr on cr.id = cs.cash_register_id
    where cs.id = p_session_id
      and cs.status = 'open'
      and cr.branch_id = any(current_branch_ids())
  ) then
    raise exception 'Sesión de caja no encontrada o ya cerrada';
  end if;

  v_signed_amount := case when p_type = 'cash_out' then -1 * p_amount else p_amount end;

  begin
    insert into cash_movements (id, cash_session_id, type, amount, reason, created_by_user_id)
    values (coalesce(p_movement_id, gen_random_uuid()), p_session_id, p_type, v_signed_amount, p_reason, auth.uid())
    returning id into v_movement_id;
  exception when unique_violation then
    return p_movement_id;
  end;

  return v_movement_id;
end;
$$;

create or replace function create_sale(payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := current_business_id();
  v_branch_id uuid := (payload->>'branch_id')::uuid;
  v_cashier_id uuid := auth.uid();
  v_client_sale_id uuid := nullif(payload->>'id', '')::uuid;
  v_cash_session_id uuid;
  v_has_cash_payment boolean;
  v_sale_id uuid;
  v_folio integer;
  v_subtotal numeric(12, 2) := 0;
  v_discount_total numeric(12, 2) := 0;
  v_total numeric(12, 2) := 0;
  v_payments_total numeric(12, 2) := 0;
  v_item jsonb;
  v_line_subtotal numeric(12, 2);
  v_current_stock numeric(12, 2);
begin
  if v_client_sale_id is not null and exists (select 1 from sales where id = v_client_sale_id) then
    return v_client_sale_id;
  end if;

  if v_business_id is null then
    raise exception 'El usuario no tiene una membresía activa';
  end if;

  if v_branch_id is null or not (v_branch_id = any(current_branch_ids())) then
    raise exception 'Sucursal inválida o fuera de tu alcance';
  end if;

  if coalesce(jsonb_array_length(payload->'items'), 0) = 0 then
    raise exception 'La venta necesita al menos un producto o servicio';
  end if;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    v_subtotal := v_subtotal + (v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric;
    v_discount_total := v_discount_total + coalesce((v_item->>'discount_amount')::numeric, 0);
  end loop;

  v_total := v_subtotal - v_discount_total;

  select coalesce(sum((p->>'amount')::numeric), 0) into v_payments_total
  from jsonb_array_elements(payload->'payments') as p;

  if v_payments_total < v_total then
    raise exception 'El pago (%) no cubre el total de la venta (%)', v_payments_total, v_total;
  end if;

  select exists (
    select 1 from jsonb_array_elements(payload->'payments') as p where (p->>'method') = 'cash'
  ) into v_has_cash_payment;

  select cs.id into v_cash_session_id
  from cash_sessions cs
  join cash_registers cr on cr.id = cs.cash_register_id
  where cr.branch_id = v_branch_id and cs.status = 'open'
  order by cs.opened_at desc
  limit 1;

  if v_has_cash_payment and v_cash_session_id is null then
    raise exception 'Abre la caja antes de cobrar en efectivo';
  end if;

  -- El insert de `sales` con el id que manda el cliente es lo que de
  -- verdad protege contra una doble venta en una llamada repetida (por
  -- reintento o por dos disparos casi simultáneos del flush offline): si
  -- ya existe una fila con ese id, este insert falla con unique_violation
  -- ANTES de tocar el folio o el inventario, así que no hay nada que
  -- deshacer — se atrapa el error y se devuelve el id ya existente.
  begin
    insert into branch_sale_folio_counters (branch_id, last_folio)
    values (v_branch_id, 1)
    on conflict (branch_id)
      do update set last_folio = branch_sale_folio_counters.last_folio + 1
    returning last_folio into v_folio;

    insert into sales (
      id, business_id, branch_id, cashier_user_id, cash_session_id,
      folio, subtotal, discount_total, total
    )
    values (
      coalesce(v_client_sale_id, gen_random_uuid()), v_business_id, v_branch_id, v_cashier_id, v_cash_session_id,
      v_folio, v_subtotal, v_discount_total, v_total
    )
    returning id into v_sale_id;
  exception when unique_violation then
    return v_client_sale_id;
  end;

  for v_item in select * from jsonb_array_elements(payload->'items')
  loop
    if (v_item->>'item_type') = 'product' then
      if not exists (
        select 1 from business_products
        where id = (v_item->>'business_product_id')::uuid and business_id = v_business_id
      ) then
        raise exception 'Producto fuera de tu negocio';
      end if;
    else
      if not exists (
        select 1 from services
        where id = (v_item->>'service_id')::uuid and business_id = v_business_id
      ) then
        raise exception 'Servicio fuera de tu negocio';
      end if;
    end if;

    v_line_subtotal := (v_item->>'quantity')::numeric * (v_item->>'unit_price')::numeric
      - coalesce((v_item->>'discount_amount')::numeric, 0);

    insert into sale_items (
      sale_id, item_type, business_product_id, service_id,
      quantity, unit_price, discount_amount, subtotal, sold_by_user_id
    )
    values (
      v_sale_id,
      (v_item->>'item_type')::sale_item_type,
      nullif(v_item->>'business_product_id', '')::uuid,
      nullif(v_item->>'service_id', '')::uuid,
      (v_item->>'quantity')::numeric,
      (v_item->>'unit_price')::numeric,
      coalesce((v_item->>'discount_amount')::numeric, 0),
      v_line_subtotal,
      coalesce(nullif(v_item->>'sold_by_user_id', '')::uuid, v_cashier_id)
    );

    if (v_item->>'item_type') = 'product' then
      select coalesce(quantity, 0) into v_current_stock
      from inventory_stock
      where business_product_id = (v_item->>'business_product_id')::uuid
        and branch_id = v_branch_id;

      if coalesce(v_current_stock, 0) < (v_item->>'quantity')::numeric then
        raise exception 'Stock insuficiente para el producto %', v_item->>'business_product_id';
      end if;

      insert into inventory_movements (
        business_id, branch_id, business_product_id, type, quantity,
        reason, reference_sale_id, created_by_user_id
      )
      values (
        v_business_id, v_branch_id, (v_item->>'business_product_id')::uuid, 'out',
        -1 * (v_item->>'quantity')::numeric,
        'Venta folio ' || v_folio, v_sale_id, v_cashier_id
      );
    end if;
  end loop;

  insert into payments (sale_id, method, amount)
  select v_sale_id, (p->>'method')::payment_method, (p->>'amount')::numeric
  from jsonb_array_elements(payload->'payments') as p;

  if v_cash_session_id is not null then
    insert into cash_movements (cash_session_id, type, amount, reference_sale_id, created_by_user_id)
    select v_cash_session_id, 'sale', (p->>'amount')::numeric, v_sale_id, v_cashier_id
    from jsonb_array_elements(payload->'payments') as p
    where (p->>'method') = 'cash';
  end if;

  return v_sale_id;
end;
$$;
