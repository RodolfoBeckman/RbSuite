-- RB Suite — migración inicial (Etapa 0/1: Core)
-- Negocios, sucursales, membresías y RLS base.
--
-- Nota de diseño: para el MVP los roles quedan fijos (administrador,
-- gerente, vendedor) como un enum, en vez de tablas de roles/permisos
-- granulares. Esa granularidad es una fase posterior (P1) y se puede
-- agregar sin romper nada de lo de aquí.

create extension if not exists "pgcrypto";

create type role_name as enum ('administrador', 'gerente', 'vendedor');

create table businesses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  logo_url text,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table branches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  address text,
  timezone text not null default 'America/Mexico_City',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- branch_id = null significa "todas las sucursales del negocio"
-- (Administrador / Gerente). Un branch_id específico restringe al
-- usuario a esa sucursal (Vendedor). Un usuario pertenece a un solo
-- negocio (unique en user_id).
create table memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_id uuid not null references businesses(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  role role_name not null,
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table businesses enable row level security;
alter table branches enable row level security;
alter table memberships enable row level security;

-- El negocio del usuario se resuelve siempre en el servidor a partir de
-- su membership — nunca se recibe un business_id desde el cliente.
create or replace function current_business_id()
returns uuid
language sql stable
as $$
  select business_id from memberships where user_id = auth.uid()
$$;

-- Sucursales visibles para el usuario actual: todas las del negocio si
-- su membership tiene branch_id nulo, o solo la suya si tiene una fija.
create or replace function current_branch_ids()
returns uuid[]
language sql stable
as $$
  select case
    when (select branch_id from memberships where user_id = auth.uid()) is null
      then (select array_agg(id) from branches where business_id = current_business_id())
    else array[(select branch_id from memberships where user_id = auth.uid())]
  end
$$;

create policy "select_own_business" on businesses
  for select using (id = current_business_id());

create policy "select_branches_in_scope" on branches
  for select using (
    business_id = current_business_id()
    and id = any(current_branch_ids())
  );

create policy "select_own_membership" on memberships
  for select using (user_id = auth.uid());

-- RPC que el frontend llama justo después de iniciar sesión, para saber
-- a qué negocio/sucursal/rol pertenece el usuario autenticado.
create or replace function get_my_membership()
returns table (business_id uuid, branch_id uuid, role role_name)
language sql stable
security definer
as $$
  select business_id, branch_id, role
  from memberships
  where user_id = auth.uid()
$$;
