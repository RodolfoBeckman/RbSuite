-- RB Suite — capa de configuración para textos de UI personalizables por
-- negocio (ej. una ferretería podría no querer "Servicios" en el menú).
-- Vive como JSON en businesses.settings en vez de una tabla dedicada:
-- para el volumen de configuración de un negocio, una tabla aparte sería
-- sobreingeniería. El frontend la consume vía useLabels(), nunca strings
-- sueltos en los componentes.

alter table businesses
  add column settings jsonb not null default '{}'::jsonb;
