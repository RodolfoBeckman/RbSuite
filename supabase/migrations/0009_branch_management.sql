-- RB Suite — Etapa 7: gestión de sucursales desde la app.
--
-- branches solo tenía policy de select hasta ahora (las sucursales se
-- creaban a mano por SQL). Se agrega insert/update para que el
-- Administrador pueda dar de alta sucursales nuevas y editarlas (incluida
-- la baja lógica vía "active", nunca delete — mismo patrón que
-- services/business_products).

create policy "insert_branches_admin_only" on branches
  for insert with check (
    business_id = current_business_id()
    and exists (
      select 1 from memberships
      where user_id = auth.uid() and business_id = branches.business_id and role = 'administrador'
    )
  );

create policy "update_branches_admin_only" on branches
  for update using (
    business_id = current_business_id()
    and exists (
      select 1 from memberships
      where user_id = auth.uid() and business_id = branches.business_id and role = 'administrador'
    )
  )
  with check (
    business_id = current_business_id()
    and exists (
      select 1 from memberships
      where user_id = auth.uid() and business_id = branches.business_id and role = 'administrador'
    )
  );
