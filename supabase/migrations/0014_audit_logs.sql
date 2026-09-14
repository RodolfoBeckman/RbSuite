-- RB Suite — Etapa 6: auditoría de acciones sensibles.
--
-- Los permisos granulares por rol siguen explícitamente diferidos a P1
-- (rb-suite-contexto-claude-code.md) — los 3 roles fijos actuales no
-- cambian. Esta migración es solo el registro de quién hizo qué en las
-- acciones que ya se consideraban sensibles desde el diseño original:
-- cancelar venta, cambiar precio, ajustar inventario, retiros de caja,
-- crear/quitar usuarios y cambiar su rol.
--
-- Se implementa con triggers en vez de tocar cada RPC/insert existente:
-- así queda cubierto tanto lo que ya pasa por una función security
-- definer (cancel_sale, update_team_member, register_cash_movement...)
-- como lo que se escribe directo desde el cliente bajo RLS (precio de
-- producto) — y cualquier código nuevo que toque estas tablas queda
-- auditado automáticamente sin tener que acordarse de llamarlo ahí.

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  actor_user_id uuid references auth.users(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_business_created_idx on audit_logs (business_id, created_at desc);

alter table audit_logs enable row level security;

-- Solo Administrador ve el historial de auditoría de su negocio. Nadie
-- inserta/edita/borra desde el cliente — solo los triggers de abajo, que
-- corren como dueños de la función y no necesitan policy de insert.
create policy "select_audit_logs_admin" on audit_logs
  for select using (
    business_id = current_business_id() and current_membership_role() = 'administrador'
  );

create or replace function log_audit_event(
  p_business_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_details jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (business_id, actor_user_id, action, entity_type, entity_id, details)
  values (p_business_id, p_actor_user_id, p_action, p_entity_type, p_entity_id, p_details);
end;
$$;

-- 1. Ventas: solo la cancelación es sensible (el alta es rutina normal).
create or replace function audit_sales()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'UPDATE' and NEW.status = 'cancelled' and OLD.status is distinct from 'cancelled' then
    perform log_audit_event(
      NEW.business_id, NEW.cancelled_by_user_id, 'cancel_sale', 'sale', NEW.id,
      jsonb_build_object('folio', NEW.folio, 'total', NEW.total)
    );
  end if;
  return NEW;
end;
$$;

create trigger trg_audit_sales
  after update on sales
  for each row execute function audit_sales();

-- 2. Productos: alta y cambio de precio/stock mínimo/estatus.
create or replace function audit_business_products()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform log_audit_event(
      NEW.business_id, auth.uid(), 'create_business_product', 'business_product', NEW.id,
      jsonb_build_object('sale_price', NEW.sale_price)
    );
  elsif TG_OP = 'UPDATE' and (
    NEW.sale_price is distinct from OLD.sale_price
    or NEW.purchase_price is distinct from OLD.purchase_price
    or NEW.minimum_stock is distinct from OLD.minimum_stock
    or NEW.active is distinct from OLD.active
  ) then
    perform log_audit_event(
      NEW.business_id, auth.uid(), 'update_business_product', 'business_product', NEW.id,
      jsonb_build_object(
        'sale_price', jsonb_build_object('before', OLD.sale_price, 'after', NEW.sale_price),
        'purchase_price', jsonb_build_object('before', OLD.purchase_price, 'after', NEW.purchase_price),
        'minimum_stock', jsonb_build_object('before', OLD.minimum_stock, 'after', NEW.minimum_stock),
        'active', jsonb_build_object('before', OLD.active, 'after', NEW.active)
      )
    );
  end if;
  return NEW;
end;
$$;

create trigger trg_audit_business_products
  after insert or update on business_products
  for each row execute function audit_business_products();

-- 3. Inventario: solo ajustes manuales (compra/merma/conteo) — las
--    entradas/salidas que ya arrastra una venta o un alta de producto no
--    son "ajustes", son consecuencia de otra acción que se audita aparte.
create or replace function audit_inventory_adjustment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.type = 'adjustment' then
    perform log_audit_event(
      NEW.business_id, NEW.created_by_user_id, 'adjust_stock', 'inventory_movement', NEW.id,
      jsonb_build_object('quantity', NEW.quantity, 'reason', NEW.reason, 'branch_id', NEW.branch_id)
    );
  end if;
  return NEW;
end;
$$;

create trigger trg_audit_inventory_adjustment
  after insert on inventory_movements
  for each row execute function audit_inventory_adjustment();

-- 4. Caja: solo retiros (cash_out) — no se audita venta/entrada/ajuste de
--    caja, sacar dinero es lo sensible.
create or replace function audit_cash_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid;
begin
  if NEW.type = 'cash_out' then
    select b.business_id into v_business_id
    from cash_sessions cs
    join cash_registers cr on cr.id = cs.cash_register_id
    join branches b on b.id = cr.branch_id
    where cs.id = NEW.cash_session_id;

    perform log_audit_event(
      v_business_id, NEW.created_by_user_id, 'cash_withdrawal', 'cash_movement', NEW.id,
      jsonb_build_object('amount', NEW.amount, 'reason', NEW.reason)
    );
  end if;
  return NEW;
end;
$$;

create trigger trg_audit_cash_movement
  after insert on cash_movements
  for each row execute function audit_cash_movement();

-- 5. Equipo: alta, cambio de rol/sucursal, y baja de un miembro.
-- created_by_user_id: quien invitó — la Edge Function invite-team-member
-- inserta con la service role key (sin JWT de usuario), así que auth.uid()
-- no sirve ahí; se manda explícito desde el llamador antes de cambiar de
-- cliente. update_team_member/remove_team_member sí corren con la sesión
-- del admin, ahí auth.uid() resuelve bien.
alter table memberships add column created_by_user_id uuid references auth.users(id);

create or replace function audit_memberships()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform log_audit_event(
      NEW.business_id, coalesce(auth.uid(), NEW.created_by_user_id), 'invite_team_member',
      'membership', NEW.id,
      jsonb_build_object('role', NEW.role, 'branch_id', NEW.branch_id)
    );
  elsif TG_OP = 'UPDATE' and (NEW.role is distinct from OLD.role or NEW.branch_id is distinct from OLD.branch_id) then
    perform log_audit_event(
      NEW.business_id, auth.uid(), 'update_team_member', 'membership', NEW.id,
      jsonb_build_object(
        'role', jsonb_build_object('before', OLD.role, 'after', NEW.role),
        'branch_id', jsonb_build_object('before', OLD.branch_id, 'after', NEW.branch_id)
      )
    );
  elsif TG_OP = 'DELETE' then
    perform log_audit_event(
      OLD.business_id, auth.uid(), 'remove_team_member', 'membership', OLD.id,
      jsonb_build_object('role', OLD.role)
    );
  end if;
  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_audit_memberships
  after insert or update or delete on memberships
  for each row execute function audit_memberships();

-- Lectura paginada para la pantalla de Configuración → Auditoría. Igual
-- que list_team_members, el propio WHERE hace de guarda de rol: si quien
-- llama no es administrador, simplemente no devuelve filas.
create or replace function list_audit_logs(p_limit int default 50, p_offset int default 0)
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
    and current_membership_role() = 'administrador'
  order by al.created_at desc
  limit p_limit offset p_offset
$$;
