// RB Suite — Etapa 7: invitar a un miembro nuevo del equipo.
//
// Crear un usuario de Auth solo se puede hacer con la service role key,
// que nunca debe vivir en el cliente — por eso esto es una Edge Function
// y no una llamada directa desde React. El negocio del que invita se
// resuelve siempre con SU sesión (nunca se recibe un business_id desde el
// body), igual que en el resto del proyecto.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const VALID_ROLES = ['administrador', 'gerente', 'vendedor']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Falta el header de autorización')

    const { email, role, branchId, redirectTo } = await req.json()
    if (!email || !role) throw new Error('Falta correo o rol')
    if (!VALID_ROLES.includes(role)) throw new Error('Rol inválido')
    if (role === 'vendedor' && !branchId) {
      throw new Error('Un vendedor necesita una sucursal asignada')
    }
    const finalBranchId = role === 'vendedor' ? branchId : null

    // Cliente en nombre de quien invita: respeta RLS, resuelve SU propia
    // membership a partir de su JWT — así sabemos su negocio real sin
    // confiar en nada que venga del body.
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: membershipRows, error: membershipError } =
      await callerClient.rpc('get_my_membership')
    if (membershipError) throw membershipError
    const callerMembership = Array.isArray(membershipRows) ? membershipRows[0] : membershipRows
    if (!callerMembership || callerMembership.role !== 'administrador') {
      throw new Error('Solo un administrador puede invitar usuarios')
    }

    if (finalBranchId) {
      const { data: branch, error: branchError } = await callerClient
        .from('branches')
        .select('id')
        .eq('id', finalBranchId)
        .maybeSingle()
      if (branchError) throw branchError
      if (!branch) throw new Error('La sucursal no pertenece a este negocio')
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: invited, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      redirectTo ? { redirectTo } : undefined,
    )
    if (inviteError) throw inviteError

    const { error: insertError } = await adminClient.from('memberships').insert({
      user_id: invited.user.id,
      business_id: callerMembership.business_id,
      branch_id: finalBranchId,
      role,
    })
    if (insertError) {
      // El usuario de Auth ya quedó creado (la invitación se envió); si el
      // membership falla (ej. ya tenía uno en otro negocio, por el unique
      // en user_id) no lo dejamos a medias sin avisar.
      throw new Error(`Invitación enviada, pero no se pudo asignar al equipo: ${insertError.message}`)
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
