-- RB Suite — Etapa 8: landing pública por negocio.
--
-- La landing vive en rbsuite.mx/negocio/<slug> (sin subdominio todavía, eso
-- queda para cuando se configure Cloudflare). Necesita lectura anónima de
-- datos ya existentes (negocio, sucursales, servicios), pero solo lo
-- mínimo que ya era público de facto (nombre, logo, color, dirección,
-- horario, teléfono, servicios activos) — nunca ventas, inventario ni
-- información de otros negocios inactivos.
--
-- Las políticas de RLS son permisivas (se combinan con OR), así que agregar
-- estas no afecta el acceso ya existente de usuarios autenticados.

alter table branches
  add column phone text,
  add column hours text;

create policy "public_read_active_businesses" on businesses
  for select using (status = 'active');

create policy "public_read_active_branches" on branches
  for select using (
    active = true
    and exists (
      select 1 from businesses b where b.id = branches.business_id and b.status = 'active'
    )
  );

create policy "public_read_active_services" on services
  for select using (
    active = true
    and exists (
      select 1 from businesses b where b.id = services.business_id and b.status = 'active'
    )
  );
