-- RB Suite — Etapa 4: caja.
--
-- Igual que con las ventas, el cliente nunca calcula expected_amount ni
-- inserta cash_movements directo: todo pasa por open_cash_session /
-- close_cash_session (o por create_sale, para el movimiento de una venta
-- en efectivo).

create type cash_session_status as enum ('open', 'closed');
create type cash_movement_type as enum ('sale', 'cash_in', 'cash_out', 'adjustment');

create table cash_registers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table cash_sessions (
  id uuid primary key default gen_random_uuid(),
  cash_register_id uuid not null references cash_registers(id) on delete cascade,
  opened_by_user_id uuid not null references auth.users(id),
  opening_amount numeric(12, 2) not null check (opening_amount >= 0),
  opened_at timestamptz not null default now(),
  closed_by_user_id uuid references auth.users(id),
  closed_at timestamptz,
  expected_amount numeric(12, 2),
  counted_amount numeric(12, 2),
  difference numeric(12, 2),
  status cash_session_status not null default 'open'
);

-- Solo una sesión abierta por caja a la vez.
create unique index cash_sessions_one_open_per_register
  on cash_sessions (cash_register_id)
  where status = 'open';

-- Ledger de movimientos de la sesión: nunca se edita, solo se inserta.
-- Convención de signo (igual que inventory_movements): sale/cash_in > 0,
-- cash_out < 0, adjustment libre.
create table cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references cash_sessions(id) on delete cascade,
  type cash_movement_type not null,
  amount numeric(12, 2) not null check (amount <> 0),
  reason text,
  reference_sale_id uuid references sales(id),
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint cash_movements_sign check (
    (type in ('sale', 'cash_in') and amount > 0)
    or (type = 'cash_out' and amount < 0)
    or (type = 'adjustment')
  )
);

alter table sales
  add constraint sales_cash_session_id_fkey
  foreign key (cash_session_id) references cash_sessions(id);

alter table cash_registers enable row level security;
alter table cash_sessions enable row level security;
alter table cash_movements enable row level security;

create policy "select_cash_registers_in_scope" on cash_registers
  for select using (branch_id = any(current_branch_ids()));

create policy "insert_cash_registers_in_scope" on cash_registers
  for insert with check (branch_id = any(current_branch_ids()));

create policy "update_cash_registers_in_scope" on cash_registers
  for update using (branch_id = any(current_branch_ids()))
  with check (branch_id = any(current_branch_ids()));

create policy "select_cash_sessions_in_scope" on cash_sessions
  for select using (
    exists (
      select 1 from cash_registers cr
      where cr.id = cash_sessions.cash_register_id
        and cr.branch_id = any(current_branch_ids())
    )
  );

create policy "select_cash_movements_in_scope" on cash_movements
  for select using (
    exists (
      select 1 from cash_sessions cs
      join cash_registers cr on cr.id = cs.cash_register_id
      where cs.id = cash_movements.cash_session_id
        and cr.branch_id = any(current_branch_ids())
    )
  );

create or replace function open_cash_session(p_cash_register_id uuid, p_opening_amount numeric)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session_id uuid;
begin
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

  insert into cash_sessions (cash_register_id, opened_by_user_id, opening_amount)
  values (p_cash_register_id, auth.uid(), p_opening_amount)
  returning id into v_session_id;

  return v_session_id;
end;
$$;

create or replace function close_cash_session(p_session_id uuid, p_counted_amount numeric)
returns table (expected_amount numeric, difference numeric)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session cash_sessions%rowtype;
  v_expected numeric(12, 2);
begin
  select cs.* into v_session
  from cash_sessions cs
  join cash_registers cr on cr.id = cs.cash_register_id
  where cs.id = p_session_id and cr.branch_id = any(current_branch_ids());

  if not found then
    raise exception 'Sesión de caja no encontrada';
  end if;

  if v_session.status = 'closed' then
    raise exception 'Esta sesión ya está cerrada';
  end if;

  select v_session.opening_amount + coalesce(sum(amount), 0) into v_expected
  from cash_movements
  where cash_session_id = p_session_id;

  update cash_sessions
  set
    status = 'closed',
    closed_by_user_id = auth.uid(),
    closed_at = now(),
    expected_amount = v_expected,
    counted_amount = p_counted_amount,
    difference = p_counted_amount - v_expected
  where id = p_session_id;

  return query select v_expected, p_counted_amount - v_expected;
end;
$$;

-- Movimientos manuales de caja (retiro/entrada de efectivo, ajuste) fuera
-- de una venta. El tipo 'sale' está reservado para create_sale — aquí no
-- se permite. El monto siempre se manda positivo desde el cliente; el
-- signo real (cash_out negativo) lo decide el servidor según el tipo.
create or replace function register_cash_movement(
  p_session_id uuid,
  p_type cash_movement_type,
  p_amount numeric,
  p_reason text default null
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

  insert into cash_movements (cash_session_id, type, amount, reason, created_by_user_id)
  values (p_session_id, p_type, v_signed_amount, p_reason, auth.uid())
  returning id into v_movement_id;

  return v_movement_id;
end;
$$;

-- create_sale (v2): igual que en la Etapa 3, pero ahora ata la venta a la
-- sesión de caja abierta de la sucursal (si hay una) y registra el
-- movimiento de caja correspondiente a la parte pagada en efectivo. Si el
-- pago incluye efectivo y no hay caja abierta, la venta se rechaza — no se
-- puede meter efectivo a un cajón que no está abierto.
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

  insert into branch_sale_folio_counters (branch_id, last_folio)
  values (v_branch_id, 1)
  on conflict (branch_id)
    do update set last_folio = branch_sale_folio_counters.last_folio + 1
  returning last_folio into v_folio;

  insert into sales (
    business_id, branch_id, cashier_user_id, cash_session_id,
    folio, subtotal, discount_total, total
  )
  values (
    v_business_id, v_branch_id, v_cashier_id, v_cash_session_id,
    v_folio, v_subtotal, v_discount_total, v_total
  )
  returning id into v_sale_id;

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
