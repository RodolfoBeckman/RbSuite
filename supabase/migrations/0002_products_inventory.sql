-- RB Suite — Etapa 2: productos, servicios e inventario.
--
-- Sigue el mismo patrón de RLS que 0001_init.sql: el negocio/sucursal del
-- usuario se resuelve siempre en el servidor con current_business_id() /
-- current_branch_ids(), nunca se recibe desde el cliente.

create type inventory_movement_type as enum (
  'in', 'out', 'adjustment', 'initial', 'transfer_in', 'transfer_out'
);

create table services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  duration_minutes integer check (duration_minutes > 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Catálogo compartido de productos (código de barras, nombre, marca): no es
-- propiedad de un negocio en particular, por eso no lleva business_id.
-- El precio, el stock mínimo y el stock real sí son por negocio y viven en
-- business_products / inventory_movements. No hay deduplicación automática
-- de catálogo entre negocios distintos (sobreingeniería para el MVP).
create table products_catalog (
  id uuid primary key default gen_random_uuid(),
  barcode text unique,
  name text not null,
  brand text,
  category text,
  unit text not null default 'pieza',
  created_at timestamptz not null default now()
);

create table business_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  product_id uuid not null references products_catalog(id) on delete restrict,
  sale_price numeric(12, 2) not null check (sale_price >= 0),
  purchase_price numeric(12, 2) check (purchase_price >= 0),
  minimum_stock numeric(12, 2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (business_id, product_id)
);

-- Ledger de movimientos: nunca se actualiza un campo de stock directamente,
-- inventory_stock (abajo) se deriva siempre sumando estos movimientos.
-- Convención de signo: in/initial/transfer_in > 0, out/transfer_out < 0;
-- adjustment puede ir en cualquier dirección (por eso no se restringe su
-- signo en el constraint).
create table inventory_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  branch_id uuid not null references branches(id) on delete cascade,
  business_product_id uuid not null references business_products(id) on delete cascade,
  type inventory_movement_type not null,
  quantity numeric(12, 2) not null check (quantity <> 0),
  reason text,
  reference_sale_id uuid,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  constraint inventory_movements_sign check (
    (type in ('in', 'initial', 'transfer_in') and quantity > 0)
    or (type in ('out', 'transfer_out') and quantity < 0)
    or (type = 'adjustment')
  )
);

create view inventory_stock as
  select
    business_product_id,
    branch_id,
    sum(quantity) as quantity
  from inventory_movements
  group by business_product_id, branch_id;

alter table services enable row level security;
alter table products_catalog enable row level security;
alter table business_products enable row level security;
alter table inventory_movements enable row level security;

create policy "select_services_in_business" on services
  for select using (business_id = current_business_id());

create policy "insert_services_in_business" on services
  for insert with check (business_id = current_business_id());

create policy "update_services_in_business" on services
  for update using (business_id = current_business_id())
  with check (business_id = current_business_id());

-- products_catalog es de lectura/escritura compartida entre negocios (no
-- hay dueño): cualquier usuario autenticado con membership puede leerlo y
-- agregar un producto nuevo al escanear un código de barras que no existía.
-- No se permite update/delete para no pisar datos que otro negocio ya usa.
create policy "select_products_catalog_authenticated" on products_catalog
  for select using (auth.uid() is not null);

create policy "insert_products_catalog_authenticated" on products_catalog
  for insert with check (auth.uid() is not null);

create policy "select_business_products_in_business" on business_products
  for select using (business_id = current_business_id());

create policy "insert_business_products_in_business" on business_products
  for insert with check (business_id = current_business_id());

create policy "update_business_products_in_business" on business_products
  for update using (business_id = current_business_id())
  with check (business_id = current_business_id());

-- Los movimientos son un ledger append-only: solo select + insert, nunca
-- update/delete (para corregir algo se inserta un movimiento de tipo
-- 'adjustment', no se edita el historial).
create policy "select_inventory_movements_in_scope" on inventory_movements
  for select using (
    business_id = current_business_id()
    and branch_id = any(current_branch_ids())
  );

create policy "insert_inventory_movements_in_scope" on inventory_movements
  for insert with check (
    business_id = current_business_id()
    and branch_id = any(current_branch_ids())
    and created_by_user_id = auth.uid()
    and exists (
      select 1 from business_products bp
      where bp.id = business_product_id and bp.business_id = business_id
    )
  );

-- RPC placeholder — se implementa completa en la Etapa 3 (transacción que
-- registra sales + sale_items + payments + inventory_movements +
-- cash_movements, con folio consecutivo por sucursal). Se deja declarada
-- desde ya para que el frontend del POS pueda referenciarla sin romper.
create or replace function create_sale(payload jsonb)
returns uuid
language plpgsql
security definer
as $$
begin
  raise exception 'create_sale aún no está implementada (Etapa 3)';
end;
$$;
