-- Fiado, paso 3 de 3. Requiere 0026 y 0027 ya corridos.
--
-- create_sale no cambia de firma (sigue siendo solo `payload jsonb`) ni
-- de tipo de retorno (sigue devolviendo uuid) — el saldo actualizado del
-- cliente, si la UI lo necesita para avisar sobre el límite de crédito,
-- se pide aparte con un select normal a `customers` después de la venta,
-- en vez de cambiar el contrato de esta función y arriesgar romper a
-- todos los que ya la llaman (web y mobile).

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
  v_customer_id uuid := nullif(payload->>'customer_id', '')::uuid;
  v_cash_session_id uuid;
  v_has_cash_payment boolean;
  v_has_fiado_payment boolean;
  v_fiado_amount numeric(12, 2) := 0;
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

  select exists (
    select 1 from jsonb_array_elements(payload->'payments') as p where (p->>'method') = 'fiado'
  ) into v_has_fiado_payment;

  if v_has_fiado_payment then
    if v_customer_id is null then
      raise exception 'La venta a crédito necesita un cliente';
    end if;
    if not exists (select 1 from customers where id = v_customer_id and business_id = v_business_id) then
      raise exception 'Cliente fuera de tu alcance';
    end if;
    select coalesce(sum((p->>'amount')::numeric), 0) into v_fiado_amount
    from jsonb_array_elements(payload->'payments') as p
    where (p->>'method') = 'fiado';
  end if;

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

  -- El cargo a cuenta usa el id de la venta como client_generated_id: un
  -- cargo es 1:1 con su venta, y create_sale ya solo llega hasta aquí una
  -- vez por venta real (los reintentos salen por el early-return de
  -- arriba), así que no hace falta generar un id aparte.
  if v_has_fiado_payment then
    insert into customer_account_movements (
      business_id, customer_id, branch_id, type, amount, sale_id, client_generated_id, created_by_user_id
    )
    values (
      v_business_id, v_customer_id, v_branch_id, 'charge', v_fiado_amount, v_sale_id, v_sale_id, v_cashier_id
    );

    perform set_config('rb.internal_write', 'true', true);
    update customers set balance = balance + v_fiado_amount, updated_at = now() where id = v_customer_id;
  end if;

  return v_sale_id;
end;
$$;

-- Registra un abono de un cliente. p_branch_id no está en la lista de
-- parámetros del spec original pero customer_account_movements.branch_id
-- es NOT NULL (necesario para el scoping de current_branch_ids()) — se
-- agrega explícito en vez de asumirlo.
create or replace function record_customer_payment(
  p_customer_id uuid,
  p_branch_id uuid,
  p_amount numeric,
  p_payment_method payment_method,
  p_cash_session_id uuid default null,
  p_client_generated_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := current_business_id();
  v_movement_id uuid;
begin
  if p_client_generated_id is not null
     and exists (select 1 from customer_account_movements where client_generated_id = p_client_generated_id) then
    return (select id from customer_account_movements where client_generated_id = p_client_generated_id);
  end if;

  if v_business_id is null then
    raise exception 'El usuario no tiene una membresía activa';
  end if;

  if p_branch_id is null or not (p_branch_id = any(current_branch_ids())) then
    raise exception 'Sucursal inválida o fuera de tu alcance';
  end if;

  if not exists (select 1 from customers where id = p_customer_id and business_id = v_business_id) then
    raise exception 'Cliente fuera de tu alcance';
  end if;

  if p_amount <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  if p_payment_method = 'fiado' then
    raise exception 'Un abono no puede pagarse con fiado';
  end if;

  if p_payment_method = 'cash' and p_cash_session_id is null then
    raise exception 'Abre la caja antes de registrar un abono en efectivo';
  end if;

  begin
    insert into customer_account_movements (
      business_id, customer_id, branch_id, type, amount,
      payment_method, cash_session_id, client_generated_id, created_by_user_id
    )
    values (
      v_business_id, p_customer_id, p_branch_id, 'payment', -1 * p_amount,
      p_payment_method, p_cash_session_id, coalesce(p_client_generated_id, gen_random_uuid()), auth.uid()
    )
    returning id into v_movement_id;
  exception when unique_violation then
    return (select id from customer_account_movements where client_generated_id = p_client_generated_id);
  end;

  perform set_config('rb.internal_write', 'true', true);
  update customers set balance = balance - p_amount, updated_at = now() where id = p_customer_id;

  if p_payment_method = 'cash' then
    insert into cash_movements (cash_session_id, type, amount, reason, created_by_user_id)
    values (p_cash_session_id, 'cash_in', p_amount, 'Abono de cliente', auth.uid());
  end if;

  return v_movement_id;
end;
$$;

-- Condonar/ajustar saldo — solo Administrador/Gerente, motivo obligatorio.
create or replace function adjust_customer_balance(
  p_customer_id uuid,
  p_amount numeric,
  p_reason text,
  p_client_generated_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := current_business_id();
  v_branch_id uuid;
  v_movement_id uuid;
begin
  if p_client_generated_id is not null
     and exists (select 1 from customer_account_movements where client_generated_id = p_client_generated_id) then
    return (select id from customer_account_movements where client_generated_id = p_client_generated_id);
  end if;

  if current_membership_role() not in ('administrador', 'gerente') then
    raise exception 'No tienes permiso para ajustar el saldo de un cliente';
  end if;

  if v_business_id is null then
    raise exception 'El usuario no tiene una membresía activa';
  end if;

  if not exists (select 1 from customers where id = p_customer_id and business_id = v_business_id) then
    raise exception 'Cliente fuera de tu alcance';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'El motivo del ajuste es obligatorio';
  end if;

  if p_amount = 0 then
    raise exception 'El ajuste no puede ser cero';
  end if;

  select b into v_branch_id from unnest(current_branch_ids()) as b limit 1;

  begin
    insert into customer_account_movements (
      business_id, customer_id, branch_id, type, amount, reason, client_generated_id, created_by_user_id
    )
    values (
      v_business_id, p_customer_id, v_branch_id, 'adjustment', p_amount, p_reason,
      coalesce(p_client_generated_id, gen_random_uuid()), auth.uid()
    )
    returning id into v_movement_id;
  exception when unique_violation then
    return (select id from customer_account_movements where client_generated_id = p_client_generated_id);
  end;

  perform set_config('rb.internal_write', 'true', true);
  update customers set balance = balance + p_amount, updated_at = now() where id = p_customer_id;

  return v_movement_id;
end;
$$;

-- Cuentas por cobrar: clientes con saldo pendiente.
create or replace function report_customer_balances()
returns table (customer_id uuid, name text, phone text, balance numeric)
language sql
stable
security definer
set search_path = public
as $$
  select id, name, phone, balance
  from customers
  where business_id = current_business_id()
    and balance > 0
  order by balance desc
$$;
