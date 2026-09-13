-- RB Suite — Etapa 7: personalización de marca por negocio (color + logo).
--
-- businesses solo tenía policy de select hasta ahora; se necesita update
-- para que el Administrador pueda cambiar su color de marca (guardado en
-- settings.branding.primaryColor) y su logo_url.

create policy "update_own_business_admin_only" on businesses
  for update using (
    id = current_business_id()
    and exists (
      select 1 from memberships
      where user_id = auth.uid() and business_id = businesses.id and role = 'administrador'
    )
  )
  with check (
    id = current_business_id()
    and exists (
      select 1 from memberships
      where user_id = auth.uid() and business_id = businesses.id and role = 'administrador'
    )
  );

-- Bucket público para logos — el logo no es información sensible, y
-- servirlo público evita tener que firmar URLs solo para mostrarlo en la
-- interfaz.
insert into storage.buckets (id, name, public)
values ('business-logos', 'business-logos', true)
on conflict (id) do nothing;

create policy "public_read_business_logos" on storage.objects
  for select using (bucket_id = 'business-logos');

-- Cada archivo debe vivir en la carpeta "<business_id>/...", y solo el
-- Administrador de ese negocio puede subir o reemplazar su propio logo.
create policy "business_admin_upload_own_logo" on storage.objects
  for insert with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = public.current_business_id()::text
    and exists (
      select 1 from memberships
      where user_id = auth.uid() and role = 'administrador'
    )
  );

create policy "business_admin_update_own_logo" on storage.objects
  for update using (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = public.current_business_id()::text
  )
  with check (
    bucket_id = 'business-logos'
    and (storage.foldername(name))[1] = public.current_business_id()::text
  );
