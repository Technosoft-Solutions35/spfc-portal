// ═══════════════════════════════════════════════════════════════════════════
// Edge Function: send-push
// Reparte una notificación Web Push a todos los suscritos de push_subscriptions.
// Se ejecuta en Supabase (NO en GitHub Pages), solo autenticados y con rol staff.
//
// Secrets necesarios en Supabase → Edge Functions → Manage → Secrets:
//   VAPID_PUBLIC_KEY  (pública, también va en el frontend)
//   VAPID_PRIVATE_KEY (privada — NUNCA se sube al repositorio)
//   VAPID_SUBJECT     (mailto genérico, sin datos personales)
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:no-reply@spfc.gd'

// CORS: la app vive en GitHub Pages (dominio distinto a la Edge Function),
// así que el navegador exige cabeceras CORS en el preflight y en cada respuesta.
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  // Preflight CORS: el navegador lo envía antes del POST (por Authorization)
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // Solo POST con cuerpo JSON
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // Faltan las claves VAPID configuradas
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    return json(
      'Faltan las variables VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY en las Secrets de la Edge Function',
      500
    )
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'No autorizado' }, 401)
  }

  // Cliente con el token del usuario para comprobar su rol
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: user } = await userClient.auth.getUser()
  if (!user?.user) {
    return json({ error: 'Sesión inválida' }, 401)
  }

  let payload
  try {
    payload = await req.json()
  } catch {
    return json({ error: 'JSON inválido' }, 400)
  }

  // Permisos: el staff (super-admin/admin/gestor) puede enviar avisos globales
  // o dirigidos. Un miembro normal SOLO puede enviar avisos dirigidos (con
  // `roles` o `userId`), como avisar al staff de un nuevo reporte shiny. Sin
  // esto, el push del reporte (enviado desde el navegador del miembro) moría
  // aquí con un 403 y nunca llegaba a la bandeja del staff.
  const { data: isStaff } = await userClient.rpc('is_staff')
  const targeted =
    !!payload.userId || (Array.isArray(payload.roles) && payload.roles.length > 0)
  if (!isStaff && !targeted) {
    return json({ error: 'No tienes permisos para enviar notificaciones' }, 403)
  }

  const type = String(payload.type || 'noticia')
  const title = String(payload.title || 'Nuevo contenido')

  // Etiqueta amigable por tipo, tanto para el título de la notificación como
  // para el mensaje por defecto cuando no se pasa `message` personalizado.
  const TYPE_LABELS = {
    news: { label: 'Noticias', text: '¡Nuevas noticias! Ven a echarles un ojo.' },
    events: { label: 'Eventos', text: '¡Nuevo evento! Ven a echarle un ojo.' },
    tournaments: { label: 'Torneos', text: '¡Nuevo torneo! Ven a echarle un ojo.' },
    guides: { label: 'Guías y Buildeos', text: '¡Nueva guía! Ven a echarle un ojo.' },
    reporte: { label: 'Shiny', text: '¡Nuevo reporte shiny! Ven a revisarlo.' },
    maintenance: { label: 'Mantenimiento', text: 'Aviso de mantenimiento del portal.' },
  }
  const friendly = TYPE_LABELS[type] || { label: type, text: '' }

  // Mensaje personalizado (avisos dirigidos) o texto generado por defecto
  const message =
    payload.message || friendly.text || `Nuevo ${type}: ${title}`

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

  // Cliente con service_role para leer todas las suscripciones (salta RLS)
  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Destinatarios:
  //  - `userId`: solo ese usuario (avisos personales).
  //  - `roles`: todos los suscritos cuyo perfil tenga alguno de esos roles
  //    (p. ej. avisar al staff de un nuevo reporte shiny por aprobar).
  //  - ninguno: todos los suscritos (avisos globales).
  let query = serviceClient
    .from('push_subscriptions')
    .select('endpoint, keys, user_id, profiles!inner(role)')
  if (payload.userId) {
    query = query.eq('user_id', payload.userId)
  }
  if (Array.isArray(payload.roles) && payload.roles.length) {
    query = query.in('profiles.role', payload.roles)
  }
  const { data: subscriptions, error } = await query

  if (error) {
    return json({ error: 'Error leyendo suscripciones: ' + error.message }, 500)
  }

  const TYPE_URL = {
    reporte: '/#/revisar-shinies',
    maintenance: '/#/mantenimiento',
  }
  const results = { total: (subscriptions || []).length, sent: 0, failed: 0, errors: [] }
  const pushPayload = JSON.stringify({
    title: `SpFc/Gd · ${friendly.label}`,
    body: message,
    url: TYPE_URL[type] || `/#/${type}`,
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
        // Guarda el código y mensaje del primer error para diagnosticar
        if (results.errors.length < 3) {
          results.errors.push(
            `HTTP ${e?.statusCode || '?'}: ${(e?.message || '').slice(0, 80)}`
          )
        }
        // 404/410 = suscripción obsoleta: se limpia de la base
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          await serviceClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
      }
    })
  )

  return json(results, 200)
})
