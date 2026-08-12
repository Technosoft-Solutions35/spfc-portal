// ═══════════════════════════════════════════════════════════════════════════
// Edge Function: send-push
// Reparte una notificación Web Push a todos los suscritos de push_subscriptions.
// Se ejecuta en Supabase (NO en GitHub Pages), solo autenticados y con rol staff.
//
// Secrets necesarios en Supabase → Edge Functions → Manage → Secrets:
//   VAPID_PUBLIC_KEY  (pública, también va en el frontend)
//   VAPID_PRIVATE_KEY (privada — NUNCA se sube al repositorio)
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:crawfordpokemmo@gmail.com'

Deno.serve(async (req) => {
  // Solo POST con cuerpo JSON
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Faltan las claves VAPID configuradas
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return new Response(
      'Faltan las variables VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en las Secrets de la Edge Function',
      { status: 500 }
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('No autorizado', { status: 401 })
  }

  // Cliente con el token del usuario para comprobar su rol
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: user } = await userClient.auth.getUser()
  if (!user?.user) {
    return new Response('Sesión inválida', { status: 401 })
  }

  // Solo el staff (super-admin/admin/gestor) puede enviar avisos globales
  const { data: isStaff } = await userClient.rpc('is_staff')
  if (!isStaff) {
    return new Response('No tienes permisos para enviar notificaciones', { status: 403 })
  }

  let payload
  try {
    payload = await req.json()
  } catch {
    return new Response('JSON inválido', { status: 400 })
  }

  const type = String(payload.type || 'noticia')
  const title = String(payload.title || 'Nuevo contenido')
  const message = `Nuevo ${type}: ${title}${payload.username ? ` · ${payload.username}` : ''}`

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

  // Cliente con service_role para leer todas las suscripciones (salta RLS)
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  const { data: subscriptions, error } = await serviceClient
    .from('push_subscriptions')
    .select('endpoint, keys')

  if (error) {
    return new Response('Error leyendo suscripciones: ' + error.message, { status: 500 })
  }

  const results = { sent: 0, failed: 0 }
  const pushPayload = JSON.stringify({
    title: 'SpFc/Gd · ' + type,
    body: message,
    url: `/#/${type}`,
    tag: 'spfc-' + type,
  })

  await Promise.all(
    (subscriptions || []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          pushPayload
        )
        results.sent++
      } catch (e) {
        results.failed++
        // 404/410 = suscripción obsoleta: se limpia de la base
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          await serviceClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    })
  )

  return new Response(JSON.stringify(results), {
    headers: { 'Content-Type': 'application/json' },
    status: 200,
  })
})
