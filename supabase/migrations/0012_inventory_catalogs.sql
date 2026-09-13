-- RB Suite — catálogos reales para marca/unidad/categoría, familias de
-- producto (variantes/presentaciones), y las bases para reutilizar un
-- producto del catálogo compartido entre negocios distintos.
--
-- Antes, products_catalog guardaba brand/category/unit como texto libre —
-- eso permite inconsistencias ("L'Oréal" vs "Loreal") que rompen filtros y
-- reportes, y no deja reutilizar un producto ya dado de alta por otro
-- negocio de forma confiable. Esta migración:
--
-- 1. Crea brands y units como catálogos GLOBALES (compartidos entre todos
--    los negocios, igual que products_catalog) — así una marca/unidad se
--    escribe una sola vez en toda la plataforma.
-- 2. Crea categories como catálogo POR NEGOCIO — cada negocio organiza su
--    catálogo a su manera, a diferencia de marca/unidad.
-- 3. Crea product_families (global) para agrupar presentaciones del mismo
--    producto (ej. Refresco Cola 600ml/1.4L/2.5L) — un producto sin
--    variantes simplemente no usa este nivel (family_id nulo).
-- 4. Migra los valores de texto ya capturados a los catálogos nuevos y
--    reemplaza las columnas de texto libre por llaves foráneas.

create table brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table units (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table product_families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

insert into units (name) values ('pieza'), ('kg'), ('gramo'), ('litro'), ('mililitro'), ('paquete')
  on conflict (name) do nothing;

-- Backfill: lo que ya se haya capturado como texto libre se vuelve una fila
-- real de catálogo antes de tirar las columnas viejas, para no perder nada.
insert into brands (name)
  select distinct brand from products_catalog where brand is not null and brand <> ''
  on conflict (name) do nothing;

insert into units (name)
  select distinct unit from products_catalog
  where unit is not null and unit <> '' and unit not in (select name from units)
  on conflict (name) do nothing;

insert into categories (business_id, name)
  select distinct bp.business_id, pc.category
  from business_products bp
  join products_catalog pc on pc.id = bp.product_id
  where pc.category is not null and pc.category <> ''
  on conflict (business_id, name) do nothing;

alter table products_catalog add column brand_id uuid references brands(id);
alter table products_catalog add column unit_id uuid references units(id);
alter table products_catalog add column family_id uuid references product_families(id);
alter table business_products add column category_id uuid references categories(id);

update products_catalog pc set brand_id = b.id from brands b where b.name = pc.brand;
update products_catalog pc set unit_id = u.id from units u where u.name = pc.unit;
update products_catalog set unit_id = (select id from units where name = 'pieza') where unit_id is null;

update business_products bp set category_id = c.id
  from categories c, products_catalog pc
  where pc.id = bp.product_id and c.business_id = bp.business_id and c.name = pc.category;

alter table products_catalog alter column unit_id set not null;
alter table products_catalog drop column brand;
alter table products_catalog drop column category;
alter table products_catalog drop column unit;

alter table brands enable row level security;
alter table units enable row level security;
alter table product_families enable row level security;
alter table categories enable row level security;

-- brands/units/product_families son catálogo compartido entre negocios,
-- igual que products_catalog (0002): cualquier usuario autenticado puede
-- leer y agregar, nunca editar/borrar (para no romper referencias de otro
-- negocio que ya esté usando esa fila).
create policy "select_brands_authenticated" on brands for select using (auth.uid() is not null);
create policy "insert_brands_authenticated" on brands for insert with check (auth.uid() is not null);

create policy "select_units_authenticated" on units for select using (auth.uid() is not null);
create policy "insert_units_authenticated" on units for insert with check (auth.uid() is not null);

create policy "select_product_families_authenticated" on product_families for select using (auth.uid() is not null);
create policy "insert_product_families_authenticated" on product_families for insert with check (auth.uid() is not null);

-- categories sí es propiedad de un negocio: mismo criterio que
-- business_products (0011) — solo Administrador/Gerente puede agregar.
create policy "select_categories_in_business" on categories
  for select using (business_id = current_business_id());

create policy "insert_categories_in_business" on categories
  for insert with check (
    business_id = current_business_id() and current_membership_role() in ('administrador', 'gerente')
  );

-- create_business_product se reescribe para: aceptar un producto de
-- catálogo ya existente (p_product_id) en vez de crear uno nuevo —
-- reutilización entre negocios del mismo giro —, y usar los catálogos
-- reales de marca/unidad/familia/categoría en vez de texto libre.
create or replace function create_business_product(
  p_product_id uuid,
  p_barcode text,
  p_name text,
  p_brand_id uuid,
  p_unit_id uuid,
  p_family_id uuid,
  p_category_id uuid,
  p_sale_price numeric,
  p_purchase_price numeric,
  p_minimum_stock numeric,
  p_branch_id uuid,
  p_initial_stock numeric
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := current_business_id();
  v_product_id uuid := p_product_id;
  v_business_product_id uuid;
begin
  if current_membership_role() not in ('administrador', 'gerente') then
    raise exception 'No tienes permiso para agregar productos';
  end if;

  if v_product_id is null and p_barcode is not null and p_barcode <> '' then
    select id into v_product_id from products_catalog where barcode = p_barcode;
  end if;

  if v_product_id is not null and exists (
    select 1 from business_products where business_id = v_business_id and product_id = v_product_id
  ) then
    raise exception 'Ese producto ya está registrado en tu negocio';
  end if;

  if v_product_id is null then
    if p_unit_id is null then
      raise exception 'Elige una unidad de medida';
    end if;
    insert into products_catalog (barcode, name, brand_id, unit_id, family_id)
    values (nullif(p_barcode, ''), p_name, p_brand_id, p_unit_id, p_family_id)
    returning id into v_product_id;
  end if;

  if p_category_id is not null and not exists (
    select 1 from categories where id = p_category_id and business_id = v_business_id
  ) then
    raise exception 'La categoría no pertenece a tu negocio';
  end if;

  insert into business_products (business_id, product_id, category_id, sale_price, purchase_price, minimum_stock)
  values (v_business_id, v_product_id, p_category_id, p_sale_price, p_purchase_price, coalesce(p_minimum_stock, 0))
  returning id into v_business_product_id;

  if p_initial_stock is not null and p_initial_stock > 0 then
    if p_branch_id is null then
      raise exception 'Elige una sucursal para el stock inicial';
    end if;
    if not exists (select 1 from branches where id = p_branch_id and business_id = v_business_id) then
      raise exception 'La sucursal no pertenece a este negocio';
    end if;

    insert into inventory_movements (
      business_id, branch_id, business_product_id, type, quantity, reason, created_by_user_id
    ) values (
      v_business_id, p_branch_id, v_business_product_id, 'initial', p_initial_stock, 'Alta de producto', auth.uid()
    );
  end if;

  return v_business_product_id;
end;
$$;
