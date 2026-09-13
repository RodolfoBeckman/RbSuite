# RB Suite — scaffold inicial (Etapa 0/1)

Este es el punto de partida real del proyecto: Vite + React + TypeScript +
Tailwind, cliente de Supabase, autenticación y el modelo de negocio /
sucursal / membresía con Row Level Security.

## Qué incluye

- Login con Supabase Auth (correo y contraseña).
- `AuthContext`: además de la sesión, resuelve el negocio, la sucursal y el
  rol del usuario llamando a la función `get_my_membership()`.
- Rutas protegidas (`ProtectedRoute`) y un layout con navegación a
  Dashboard, Punto de venta y Caja.
- Migración SQL (`supabase/migrations/0001_init.sql`) con `businesses`,
  `branches`, `memberships`, el enum de roles y las políticas de RLS.
- Páginas de Dashboard / POS / Caja como placeholders: ahí se porta lo que
  ya vimos en el prototipo visual, conectado a datos reales.

## Cómo correrlo

1. Instala las dependencias:

   ```bash
   npm install
   ```

2. Crea un proyecto en [supabase.com](https://supabase.com) (el plan
   gratuito alcanza para esta etapa).

3. Copia el archivo de variables de entorno y complétalo con los datos de
   tu proyecto (Project Settings → API):

   ```bash
   cp .env.example .env
   ```

4. Corre la migración. Con la CLI de Supabase:

   ```bash
   supabase link --project-ref tu-project-ref
   supabase db push
   ```

   O, si prefieres no instalar la CLI todavía, copia el contenido de
   `supabase/migrations/0001_init.sql` y pégalo directamente en el
   SQL Editor del panel de Supabase.

5. Crea tu primer usuario de prueba desde Authentication → Users en el
   panel de Supabase, y luego insértale su membership manualmente en la
   tabla `memberships` (negocio, sucursal si aplica, y rol
   `administrador`) para poder iniciar sesión con datos reales.

6. Levanta el proyecto:

   ```bash
   npm run dev
   ```

## Siguiente paso

Con esto corriendo, lo que sigue es la Etapa 2 del roadmap: la migración
de productos e inventario, y portar la pantalla de POS del prototipo a un
componente real conectado a la función `create_sale`.
