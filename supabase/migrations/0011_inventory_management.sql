-- RB Suite — gestión administrativa de inventario (retomando Etapa 2).
--
-- El esquema (services, products_catalog, business_products,
-- inventory_movements) ya existía desde 0002_products_inventory.sql, pero
-- nunca se construyó una pantalla para administrarlo — hasta ahora solo lo
-- tocaban el POS (lectura) y create_sale/cancel_sale (RPC security
-- definer, que insertan movimientos sin pasar por las políticas de abajo).
--
-- Esta migración:
-- 1. Agrega current_role(), un helper que faltaba para poder exigir rol en
--    políticas de RLS (0002 solo validaba que el negocio coincidiera, no
--    el rol — un Vendedor podía en teoría cambiar un precio de venta
--    llamando la API de PostgREST directo).
-- 2. Restringe escritura directa de precios/servicios/movimientos a
--    Administrador y Gerente, igual que ya pasa con cancelar una venta.
-- 3. Agrega create_business_product(), la única alta que toca más de una
--    tabla (catálogo compartido + business_products + movimiento inicial
--    opcional), siguiendo el mismo patrón de RPC que el resto del
--    proyecto usa para operaciones multi-tabla.

create or replace function current_role()
returns role_name
language sql stable
as $$
  select role from memberships where user_id = auth.uid()
$$;

drop policy "insert_services_in_business" on services;
drop policy "update_services_in_business" on services;
drop policy "insert_business_products_in_business" on business_products;
drop policy "update_business_products_in_business" on business_products;
drop policy "insert_inventory_movements_in_scope" on inventory_movements;

create policy "insert_services_in_business" on services
  for insert with check (
    business_id = current_business_id() and current_role() in ('administrador', 'gerente')
  );

create policy "update_services_in_business" on services
  for update using (
    business_id = current_business_id() and current_role() in ('administrador', 'gerente')
  )
  with check (
    business_id = current_business_id() and current_role() in ('administrador', 'gerente')
  );

create policy "insert_business_products_in_business" on business_products
  for insert with check (
    business_id = current_business_id() and current_role() in ('administrador', 'gerente')
  );

create policy "update_business_products_in_business" on business_products
  for update using (
    business_id = current_business_id() and current_role() in ('administrador', 'gerente')
  )
  with check (
    business_id = current_business_id() and current_role() in ('administrador', 'gerente')
  );

create policy "insert_inventory_movements_in_scope" on inventory_movements
  for insert with check (
    business_id = current_business_id()
    and branch_id = any(current_branch_ids())
    and created_by_user_id = auth.uid()
    and current_role() in ('administrador', 'gerente')
    and exists (
      select 1 from business_products bp
      where bp.id = business_product_id and bp.business_id = business_id
    )
  );

create or replace function create_business_product(
  p_barcode text,
  p_name text,
  p_brand text,
  p_category text,
  p_unit text,
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
  v_product_id uuid;
  v_business_product_id uuid;
begin
  if current_role() not in ('administrador', 'gerente') then
    raise exception 'No tienes permiso para agregar productos';
  end if;

  if p_barcode is not null and p_barcode <> '' then
    select id into v_product_id from products_catalog where barcode = p_barcode;
  end if;

  if v_product_id is not null and exists (
    select 1 from business_products where business_id = v_business_id and product_id = v_product_id
  ) then
    raise exception 'Ese código de barras ya está registrado en tu negocio';
  end if;

  if v_product_id is null then
    insert into products_catalog (barcode, name, brand, category, unit)
    values (
      nullif(p_barcode, ''),
      p_name,
      nullif(p_brand, ''),
      nullif(p_category, ''),
      coalesce(nullif(p_unit, ''), 'pieza')
    )
    returning id into v_product_id;
  end if;

  insert into business_products (business_id, product_id, sale_price, purchase_price, minimum_stock)
  values (v_business_id, v_product_id, p_sale_price, p_purchase_price, coalesce(p_minimum_stock, 0))
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
