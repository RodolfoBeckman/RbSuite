-- RB Suite — permisos granulares por miembro (P1, antes explícitamente
-- diferido — ver comentario en 0014_audit_logs.sql).
--
-- Los 3 roles fijos (administrador/gerente/vendedor) siguen existiendo tal
-- cual: esto NO es un sistema de permisos libre, es un set fijo de
-- acciones sensibles con un default por rol que el Administrador puede
-- sobreescribir por persona (ej. un Vendedor de confianza con permiso de
-- cancelar venta, o un Gerente que puede dar de alta productos pero no
-- editar precios). El Administrador siempre tiene todos los permisos —
-- nunca se puede degradar al dueño de la cuenta por accidente.
--
-- Deliberadamente fuera de este alcance: invitar/quitar miembros del
-- equipo se queda administrador-only tal cual estaba (vive en Edge
-- Functions con su propio check, no solo RLS) — no vale la pena el riesgo
-- de tocar aprovisionamiento de cuentas de Auth en este primer corte.

alter table memberships add column permission_overrides jsonb not null default '{}'::jsonb;

-- Permisos reconocidos y su default por rol. No es una tabla porque el set
-- es fijo y chico; si esto crece a >10 permisos vale la pena moverlo a una
-- tabla real.
create or replace function role_default_permission(p_role role_name, p_permission text)
returns boolean
language sql
immutable
as $$
  select case
    when p_role = 'administrador' then true
    when p_permission in ('create_products', 'edit_products', 'cancel_sale') then p_role = 'gerente'
    else false
  end
$$;

-- Administrador siempre true, sin importar overrides (no se puede
-- autolimitar al dueño de la cuenta por error). Para los demás roles: el
-- override explícito manda si existe, si no, el default del rol.
create or replace function current_membership_has_permission(p_permission text)
returns boolean
language sql stable
as $$
  select case
    when current_membership_role() = 'administrador' then true
    else coalesce(
      (select (m.permission_overrides ->> p_permission)::boolean
       from memberships m where m.user_id = auth.uid()),
      role_default_permission(current_membership_role(), p_permission)
    )
  end
$$;

-- 1. Inventario: crear vs. editar quedan como dos permisos distintos
--    (ej. un Gerente puede dar de alta productos pero no tocar precios ya
--    capturados).
drop policy "insert_services_in_business" on services;
drop policy "update_services_in_business" on services;
drop policy "insert_business_products_in_business" on business_products;
drop policy "update_business_products_in_business" on business_products;
drop policy "insert_inventory_movements_in_scope" on inventory_movements;
drop policy "insert_categories_in_business" on categories;

create policy "insert_services_in_business" on services
  for insert with check (
    business_id = current_business_id() and current_membership_has_permission('create_products')
  );

create policy "update_services_in_business" on services
  for update using (
    business_id = current_business_id() and current_membership_has_permission('edit_products')
  )
  with check (
    business_id = current_business_id() and current_membership_has_permission('edit_products')
  );

create policy "insert_business_products_in_business" on business_products
  for insert with check (
    business_id = current_business_id() and current_membership_has_permission('create_products')
  );

create policy "update_business_products_in_business" on business_products
  for update using (
    business_id = current_business_id() and current_membership_has_permission('edit_products')
  )
  with check (
    business_id = current_business_id() and current_membership_has_permission('edit_products')
  );

create policy "insert_inventory_movements_in_scope" on inventory_movements
  for insert with check (
    business_id = current_business_id()
    and branch_id = any(current_branch_ids())
    and created_by_user_id = auth.uid()
    and current_membership_has_permission('edit_products')
    and exists (
      select 1 from business_products bp
      where bp.id = business_product_id and bp.business_id = business_id
    )
  );

create policy "insert_categories_in_business" on categories
  for insert with check (
    business_id = current_business_id() and current_membership_has_permission('create_products')
  );

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
  if not current_membership_has_permission('create_products') then
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

-- 2. Cancelar venta.
create or replace function cancel_sale(p_sale_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale sales%rowtype;
  v_item sale_items%rowtype;
begin
  if not current_membership_has_permission('cancel_sale') then
    raise exception 'No tienes permiso para cancelar ventas';
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
      business_id, branch_id, business_product_id, type, quantity, reason,
      reference_sale_id, created_by_user_id
    ) values (
      v_sale.business_id, v_sale.branch_id, v_item.business_product_id, 'in', v_item.quantity,
      'Cancelación de venta', p_sale_id, auth.uid()
    );
  end loop;
end;
$$;

-- 3. Sucursales.
drop policy "insert_branches_admin_only" on branches;
drop policy "update_branches_admin_only" on branches;

create policy "insert_branches_admin_only" on branches
  for insert with check (
    business_id = current_business_id() and current_membership_has_permission('manage_branches')
  );

create policy "update_branches_admin_only" on branches
  for update using (
    business_id = current_business_id() and current_membership_has_permission('manage_branches')
  )
  with check (
    business_id = current_business_id() and current_membership_has_permission('manage_branches')
  );

-- 4. Marca / página pública / punto de venta (todo vive en businesses.*).
drop policy "update_own_business_admin_only" on businesses;

create policy "update_own_business_admin_only" on businesses
  for update using (
    id = current_business_id() and current_membership_has_permission('manage_branding')
  )
  with check (
    id = current_business_id() and current_membership_has_permission('manage_branding')
  );

-- 5. Auditoría.
drop policy "select_audit_logs_admin" on audit_logs;

create policy "select_audit_logs_admin" on audit_logs
  for select using (
    business_id = current_business_id() and current_membership_has_permission('view_audit_log')
  );

drop function if exists list_audit_logs(int, int, timestamptz, timestamptz, text);

create or replace function list_audit_logs(
  p_limit int default 50,
  p_offset int default 0,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_action text default null
)
returns table (
  id uuid,
  actor_email text,
  action text,
  entity_type text,
  entity_id uuid,
  details jsonb,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select al.id, u.email, al.action, al.entity_type, al.entity_id, al.details, al.created_at
  from audit_logs al
  left join auth.users u on u.id = al.actor_user_id
  where al.business_id = current_business_id()
    and current_membership_has_permission('view_audit_log')
    and (p_from is null or al.created_at >= p_from)
    and (p_to is null or al.created_at < p_to)
    and (p_action is null or al.action = p_action)
  order by al.created_at desc
  limit p_limit offset p_offset
$$;

-- 6. Exponer permission_overrides al frontend: sesión propia (para saber
--    qué puede hacer uno mismo) y lista de equipo (para que el
--    Administrador vea/edite los overrides de cada persona).
drop function if exists get_my_membership();

create or replace function get_my_membership()
returns table (business_id uuid, branch_id uuid, role role_name, permission_overrides jsonb)
language sql stable
security definer
as $$
  select business_id, branch_id, role, permission_overrides
  from memberships
  where user_id = auth.uid()
$$;

drop function if exists list_team_members();

create or replace function list_team_members()
returns table (
  user_id uuid,
  email text,
  role role_name,
  branch_id uuid,
  branch_name text,
  permission_overrides jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, u.email, m.role, m.branch_id, b.name, m.permission_overrides
  from memberships m
  join auth.users u on u.id = m.user_id
  left join branches b on b.id = m.branch_id
  where m.business_id = current_business_id()
    and exists (
      select 1 from memberships admin_m
      where admin_m.user_id = auth.uid()
        and admin_m.business_id = current_business_id()
        and admin_m.role = 'administrador'
    )
  order by u.email
$$;

drop function if exists update_team_member(uuid, role_name, uuid);

create or replace function update_team_member(
  p_target_user_id uuid,
  p_role role_name,
  p_branch_id uuid,
  p_permission_overrides jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := current_business_id();
  v_caller_role role_name;
  v_branch_id uuid := case when p_role = 'vendedor' then p_branch_id else null end;
  v_key text;
begin
  select role into v_caller_role from memberships where user_id = auth.uid();
  if v_caller_role is distinct from 'administrador' then
    raise exception 'Solo un administrador puede editar el equipo';
  end if;

  if p_role = 'vendedor' and v_branch_id is null then
    raise exception 'Un vendedor necesita una sucursal asignada';
  end if;

  if v_branch_id is not null and not exists (
    select 1 from branches where id = v_branch_id and business_id = v_business_id
  ) then
    raise exception 'La sucursal no pertenece a este negocio';
  end if;

  if p_permission_overrides is not null then
    for v_key in select jsonb_object_keys(p_permission_overrides) loop
      if v_key not in (
        'create_products', 'edit_products', 'cancel_sale',
        'manage_branches', 'manage_branding', 'view_audit_log'
      ) then
        raise exception 'Permiso desconocido: %', v_key;
      end if;
    end loop;
  end if;

  update memberships
  set
    role = p_role,
    branch_id = v_branch_id,
    permission_overrides = coalesce(p_permission_overrides, permission_overrides)
  where user_id = p_target_user_id and business_id = v_business_id;

  if not found then
    raise exception 'No se encontró ese miembro en tu negocio';
  end if;
end;
$$;
