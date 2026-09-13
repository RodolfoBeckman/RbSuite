// RB Suite — Etapa 7: quitar acceso a un miembro del equipo.
//
// Borrar la cuenta de Auth solo se puede hacer con la service role key, por
// eso esto es una Edge Function y no una llamada directa desde React. Las
// validaciones (solo admin, mismo negocio, no auto-eliminarse) ya viven en
// el RPC `remove_team_member`, así que lo llamamos primero con el cliente
// del que invoca (respeta RLS) y solo si eso pasa borramos la cuenta de
// Auth — la fila de membership ya se cae sola por el "on delete cascade"
// en user_id, pero si alguien vuelve a invitar ese correo antes de esto,
// se topa con "ya existe" porque la cuenta de Auth seguía viva.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Falta el header de autorización')

    const { userId } = await req.json()
    if (!userId) throw new Error('Falta el id del usuario')

    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    // Aquí viven todos los checks (admin, mismo negocio, no auto-eliminarse);
    // si algo no cuadra, esto tira excepción antes de tocar Auth.
    const { error: rpcError } = await callerClient.rpc('remove_team_member', {
      p_target_user_id: userId,
    })
    if (rpcError) throw rpcError

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteError) {
      // El acceso ya quedó revocado (la membership se borró); esto solo
      // deja huérfana la cuenta de Auth si vuelve a fallar la próxima vez.
      throw new Error(`Acceso revocado, pero no se pudo borrar la cuenta: ${deleteError.message}`)
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }
})
