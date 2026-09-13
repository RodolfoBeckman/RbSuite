-- RB Suite — Etapa 3: ventas / POS.
--
-- create_sale es la única forma de registrar una venta: agrupa
-- sale_items + payments + los movimientos de inventario correspondientes
-- en una sola transacción, con folio consecutivo por sucursal. El cliente
-- nunca inserta directo en sales/sale_items/payments (por eso estas tablas
-- solo tienen policies de select) — toda escritura pasa por create_sale /
-- cancel_sale, ambas security definer.
--
-- Nota: sales.cash_session_id se deja sin FK por ahora porque cash_sessions
-- se crea hasta la Etapa 4; ahí se agrega la referencia con un ALTER TABLE.

create type sale_status as enum ('completed', 'cancelled');
create type sale_item_type as enum ('product', 'service');
create type payment_method as enum ('cash', 'card', 'transfer');

-- Contador de folio por sucursal. El upsert de más abajo toma un lock de
-- fila en el UPDATE de ON CONFLICT, así que dos ventas concurrentes en la
-- misma sucursal nunca reciben el mismo folio.
create table branch_sale_folio_counters (
  branch_id uuid primary key references branches(id) on delete cascade,
  last_folio integer not null default 0
);

alter table branch_sale_folio_counters enable row level security;

create table sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  cashier_user_id uuid not null references auth.users(id),
  cash_session_id uuid,
  folio integer not null,
  status sale_status not null default 'completed',
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount_total numeric(12, 2) not null default 0 check (discount_total >= 0),
  total numeric(12, 2) not null check (total >= 0),
  cancelled_at timestamptz,
  cancelled_by_user_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (branch_id, folio)
);

create table sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  item_type sale_item_type not null,
  business_product_id uuid references business_products(id),
  service_id uuid references services(id),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  sold_by_user_id uuid not null references auth.users(id),
  constraint sale_items_item_reference check (
    (item_type = 'product' and business_product_id is not null and service_id is null)
    or (item_type = 'service' and service_id is not null and business_product_id is null)
  )
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  method payment_method not null,
  amount numeric(12, 2) not null check (amount > 0)
);

alter table sales enable row level security;
alter table sale_items enable row level security;
alter table payments enable row level security;

create policy "select_sales_in_scope" on sales
  for select using (
    business_id = current_business_id()
    and branch_id = any(current_branch_ids())
  );

create policy "select_sale_items_in_scope" on sale_items
  for select using (
    exists (
      select 1 from sales s
      where s.id = sale_items.sale_id
        and s.business_id = current_business_id()
        and s.branch_id = any(current_branch_ids())
    )
  );

create policy "select_payments_in_scope" on payments
  for select using (
    exists (
      select 1 from sales s
      where s.id = payments.sale_id
        and s.business_id = current_business_id()
        and s.branch_id = any(current_branch_ids())
    )
  );

-- payload esperado:
-- {
--   "branch_id": "uuid",
--   "items": [
--     { "item_type": "product", "business_product_id": "uuid", "quantity": 2,
--       "unit_price": 180.00, "discount_amount": 0, "sold_by_user_id": "uuid" },
--     { "item_type": "service", "service_id": "uuid", "quantity": 1,
--       "unit_price": 150.00, "discount_amount": 0 }
--   ],
--   "payments": [ { "method": "cash", "amount": 330.00 } ]
-- }
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

  insert into branch_sale_folio_counters (branch_id, last_folio)
  values (v_branch_id, 1)
  on conflict (branch_id)
    do update set last_folio = branch_sale_folio_counters.last_folio + 1
  returning last_folio into v_folio;

  insert into sales (business_id, branch_id, cashier_user_id, folio, subtotal, discount_total, total)
  values (v_business_id, v_branch_id, v_cashier_id, v_folio, v_subtotal, v_discount_total, v_total)
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

  return v_sale_id;
end;
$$;

-- Solo Gerente o Administrador pueden cancelar una venta (control estándar
-- contra fraude interno en retail). Revierte el inventario con un
-- movimiento de entrada nuevo — nunca se edita ni se borra el movimiento
-- original de la venta.
create or replace function cancel_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role role_name;
  v_sale sales%rowtype;
  v_item sale_items%rowtype;
begin
  select role into v_role from memberships where user_id = auth.uid();

  if v_role is null or v_role not in ('administrador', 'gerente') then
    raise exception 'Solo Administrador o Gerente pueden cancelar una venta';
  end if;

  select * into v_sale from sales
  where id = p_sale_id and business_id = current_business_id();

  if not found then
    raise exception 'Venta no encontrada';
  end if;

  if v_sale.status = 'cancelled' then
    raise exception 'La venta ya estaba cancelada';
  end if;

  update sales
  set status = 'cancelled', cancelled_at = now(), cancelled_by_user_id = auth.uid()
  where id = p_sale_id;

  for v_item in select * from sale_items where sale_id = p_sale_id and item_type = 'product'
  loop
    insert into inventory_movements (
      business_id, branch_id, business_product_id, type, quantity,
      reason, reference_sale_id, created_by_user_id
    )
    values (
      v_sale.business_id, v_sale.branch_id, v_item.business_product_id, 'in',
      v_item.quantity,
      'Cancelación de venta folio ' || v_sale.folio, p_sale_id, auth.uid()
    );
  end loop;
end;
$$;
