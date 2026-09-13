-- Deja preparado (sin construir todavía) el campo que en el futuro elegirá
-- el layout del punto de venta según el giro del negocio — ej. una
-- ferretería querría una tabla densa por departamentos en vez del
-- catálogo en tarjetas actual, que es el que usa Estética Ly. Por ahora
-- todos los negocios usan 'catalogo' y no hay UI para cambiarlo; el
-- frontend no lee esta columna todavía.
alter table businesses add column pos_layout text not null default 'catalogo';
