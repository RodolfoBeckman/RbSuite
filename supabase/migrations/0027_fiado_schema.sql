-- Fiado, paso 2 de 3. Requiere que 0026 ya haya corrido (y haya
-- terminado su propia transacción) antes de este archivo.

create table customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  name text not null,
  phone text,
  notes text,
  credit_limit numeric(12, 2),
  balance numeric(12, 2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table customer_account_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references businesses(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  branch_id uuid not null references branches(id),
  type text not null check (type in ('charge', 'payment', 'adjustment')),
  amount numeric(12, 2) not null,
  sale_id uuid references sales(id),
  payment_method payment_method,
  cash_session_id uuid references cash_sessions(id),
  reason text,
  client_generated_id uuid not null unique,
  created_by_user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table branch_payment_methods (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  payment_method payment_method not null,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (branch_id, payment_method)
);

-- El saldo es una caché derivada del ledger — solo las funciones
-- security definer (create_sale, record_customer_payment,
-- adjust_customer_balance) pueden tocarlo, marcando la transacción con
-- este flag local justo antes de escribirlo. Un UPDATE directo del
-- cliente que intente cambiar el balance se rechaza.
create or replace function prevent_direct_balance_write()
returns trigger
language plpgsql
as $$
begin
  if new.balance is distinct from old.balance
     and coalesce(current_setting('rb.internal_write', true), '') <> 'true' then
    raise exception 'El saldo del cliente no se puede editar directamente';
  end if;
  return new;
end;
$$;

create trigger trg_prevent_direct_balance_write
before update on customers
for each row execute function prevent_direct_balance_write();

alter table customers enable row level security;
alter table customer_account_movements enable row level security;
alter table branch_payment_methods enable row level security;

create policy "select_customers_in_business" on customers
  for select using (business_id = current_business_id());

create policy "insert_customers_in_business" on customers
  for insert with check (business_id = current_business_id());

create policy "update_customers_in_business" on customers
  for update using (business_id = current_business_id())
  with check (business_id = current_business_id());

-- Ledger append-only: nunca se edita ni se borra, y nunca se inserta
-- directo desde el cliente — toda escritura pasa por create_sale /
-- record_customer_payment / adjust_customer_balance (todas security
-- definer), igual que sales/payments.
create policy "select_customer_account_movements_in_scope" on customer_account_movements
  for select using (
    business_id = current_business_id()
    and branch_id = any(current_branch_ids())
  );

create policy "select_branch_payment_methods_in_scope" on branch_payment_methods
  for select using (branch_id = any(current_branch_ids()));

create policy "update_branch_payment_methods_in_scope" on branch_payment_methods
  for update using (
    branch_id = any(current_branch_ids()) and current_membership_role() in ('administrador', 'gerente')
  )
  with check (
    branch_id = any(current_branch_ids()) and current_membership_role() in ('administrador', 'gerente')
  );

-- Backfill: sucursales existentes arrancan con cash/card/transfer
-- activos (comportamiento actual, sin cambios) y fiado desactivado por
-- default — cada negocio lo prende a propósito, no aparece ya
-- encendido.
insert into branch_payment_methods (branch_id, payment_method, is_enabled)
select b.id, m.method::payment_method, (m.method != 'fiado')
from branches b
cross join (values ('cash'), ('card'), ('transfer'), ('fiado')) as m(method)
on conflict (branch_id, payment_method) do nothing;
