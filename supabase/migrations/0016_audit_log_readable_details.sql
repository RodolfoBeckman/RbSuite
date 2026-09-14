-- Los detalles de auditoría mostraban un UUID crudo de sucursal
-- (branch_id) en vez de su nombre — nada legible para un humano viendo la
-- pantalla de Configuración → Auditoría. Se resuelve el nombre al momento
-- de insertar el registro (una foto de cómo se llamaba en ese momento,
-- igual que ya se hace con el folio/total de una venta), no al leerlo.

create or replace function audit_inventory_adjustment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_branch_name text;
begin
  if NEW.type = 'adjustment' then
    select name into v_branch_name from branches where id = NEW.branch_id;
    perform log_audit_event(
      NEW.business_id, NEW.created_by_user_id, 'adjust_stock', 'inventory_movement', NEW.id,
      jsonb_build_object(
        'cantidad', NEW.quantity,
        'motivo', NEW.reason,
        'sucursal', coalesce(v_branch_name, 'Desconocida')
      )
    );
  end if;
  return NEW;
end;
$$;

create or replace function audit_memberships()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_old_branch_name text;
  v_new_branch_name text;
begin
  if TG_OP = 'INSERT' then
    select name into v_new_branch_name from branches where id = NEW.branch_id;
    perform log_audit_event(
      NEW.business_id, coalesce(auth.uid(), NEW.created_by_user_id), 'invite_team_member',
      'membership', NEW.id,
      jsonb_build_object('rol', NEW.role, 'sucursal', coalesce(v_new_branch_name, 'Todas las sucursales'))
    );
  elsif TG_OP = 'UPDATE' and (NEW.role is distinct from OLD.role or NEW.branch_id is distinct from OLD.branch_id) then
    select name into v_old_branch_name from branches where id = OLD.branch_id;
    select name into v_new_branch_name from branches where id = NEW.branch_id;
    perform log_audit_event(
      NEW.business_id, auth.uid(), 'update_team_member', 'membership', NEW.id,
      jsonb_build_object(
        'rol', jsonb_build_object('before', OLD.role, 'after', NEW.role),
        'sucursal', jsonb_build_object(
          'before', coalesce(v_old_branch_name, 'Todas las sucursales'),
          'after', coalesce(v_new_branch_name, 'Todas las sucursales')
        )
      )
    );
  elsif TG_OP = 'DELETE' then
    perform log_audit_event(
      OLD.business_id, auth.uid(), 'remove_team_member', 'membership', OLD.id,
      jsonb_build_object('rol', OLD.role)
    );
  end if;
  return coalesce(NEW, OLD);
end;
$$;
