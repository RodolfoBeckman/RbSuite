-- RB Suite — Etapa 7: gestión de equipo (ver, reasignar rol/sucursal y
-- quitar acceso). El alta de un usuario nuevo no pasa por aquí: requiere
-- crear su cuenta de Auth, algo que solo se puede hacer con la service
-- role key — eso vive en la Edge Function `invite-team-member`, nunca en
-- el cliente. Esta migración cubre lo que sí puede hacerse con RLS normal
-- una vez que el membership ya existe.
--
-- memberships no tiene (ni tendrá) policies de insert/update/delete para
-- el cliente: todo pasa por estas funciones security definer, que
-- verifican explícitamente que quien llama es administrador del mismo
-- negocio antes de tocar la fila de otro usuario.

create or replace function list_team_members()
returns table (
  user_id uuid,
  email text,
  role role_name,
  branch_id uuid,
  branch_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select m.user_id, u.email, m.role, m.branch_id, b.name
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

-- Un Vendedor siempre debe quedar con una sucursal fija (nunca null, que
-- significaría "todas") — Administrador/Gerente siempre con null (ven
-- todas). Se fuerza aquí para no depender de que el cliente lo mande bien.
create or replace function update_team_member(
  p_target_user_id uuid,
  p_role role_name,
  p_branch_id uuid
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

  update memberships
  set role = p_role, branch_id = v_branch_id
  where user_id = p_target_user_id and business_id = v_business_id;

  if not found then
    raise exception 'No se encontró ese miembro en tu negocio';
  end if;
end;
$$;

create or replace function remove_team_member(p_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := current_business_id();
  v_caller_role role_name;
begin
  if p_target_user_id = auth.uid() then
    raise exception 'No puedes quitarte acceso a ti mismo';
  end if;

  select role into v_caller_role from memberships where user_id = auth.uid();
  if v_caller_role is distinct from 'administrador' then
    raise exception 'Solo un administrador puede quitar acceso';
  end if;

  delete from memberships where user_id = p_target_user_id and business_id = v_business_id;

  if not found then
    raise exception 'No se encontró ese miembro en tu negocio';
  end if;
end;
$$;
