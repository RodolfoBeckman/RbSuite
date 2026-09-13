-- Fix: current_business_id() y current_branch_ids() no eran security definer,
-- así que al ejecutarse dentro de una policy de RLS sobre `branches`
-- (select_branches_in_scope), su propio `select ... from branches` volvía a
-- disparar esa misma policy → recursión infinita → error 500 de Postgres.
--
-- security definer hace que la consulta interna corra con los privilegios
-- del dueño de la función (postgres), que no está sujeto a RLS, rompiendo
-- el ciclo. set search_path fijo es buena práctica recomendada por Supabase
-- para funciones security definer (evita search_path hijacking).

create or replace function current_business_id()
returns uuid
language sql stable
security definer
set search_path = public
as $$
  select business_id from memberships where user_id = auth.uid()
$$;

create or replace function current_branch_ids()
returns uuid[]
language sql stable
security definer
set search_path = public
as $$
  select case
    when (select branch_id from memberships where user_id = auth.uid()) is null
      then (select array_agg(id) from branches where business_id = current_business_id())
    else array[(select branch_id from memberships where user_id = auth.uid())]
  end
$$;
