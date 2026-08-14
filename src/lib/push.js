import { supabase } from './supabase'

// Llave pública VAPID del par generado para el proyecto. La privada vive solo
// como secreto en la Edge Function send-push (no se sube al repositorio).
export const VAPID_PUBLIC_KEY =
  import.meta.env.VITE_VAPID_PUBLIC_KEY ||
  'BN-EnpDyNVPYvELtSFEwXhzruU2t3zvM4NMTBhTqHESq1eKc0P8Jde8-5epObGBNqmH0tr87CfNn3XkY0GEBIGM'

// URL de la Edge Function que envía los pushes a todos los suscritos.
const EDGE_FUNCTION_URL = `${
  import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
}/functions/v1/send-push`

export const isPushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window

// El PushManager espera la llave VAPID como bytes; convierte base64url → Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

// ¿El usuario ya tiene una suscripción push guardada en esta página/navegador?
export async function getCurrentSubscription() {
  if (!isPushSupported()) return null
  try {
    const reg = await navigator.serviceWorker.getRegistration()
    return (await reg?.pushManager.getSubscription()) || null
  } catch {
    return null
  }
}

// Pide permiso y suscribe este navegador, guardando la suscripción en la base.
export async function subscribeToPush() {
  if (!isPushSupported()) return { ok: false, reason: 'unsupported' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: permission }

  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const { data: user } = await supabase.auth.getUser()
    const json = sub.toJSON()

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: user?.user?.id,
        endpoint: json.endpoint,
        keys: json.keys,
      },
      { onConflict: 'endpoint' }
    )

    if (error) return { ok: false, reason: error.message }
    return { ok: true, subscription: sub }
  } catch (e) {
    return { ok: false, reason: e?.name === 'NotAllowedError' ? 'denied' : (e?.message || 'error') }
  }
}

// Cancela la suscripción de este navegador y la borra de la base.
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return { ok: true }

  const sub = await getCurrentSubscription()
  if (!sub) return { ok: true }

  const endpoint = sub.endpoint
  await sub.unsubscribe().catch(() => {})
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

// Cuando el navegador renueva la suscripción, la vuelve a guardar.
export function handlePushSubscriptionChange() {
  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data?.type === 'push-subscription-changed') {
      subscribeToPush()
    }
  })
}

// Envía la notificación push al publicar contenido (lo recibe la Edge Function,
// que la reparte a todos los suscritos aunque tengan el navegador cerrado).
// Si se pasa `userId`, el push solo llega a las suscripciones de ese usuario.
// Si se pasa `roles`, solo a los suscritos cuyo perfil tenga alguno de esos
// roles (p. ej. avisar al staff de un nuevo reporte shiny por aprobar).
// Devuelve el resultado para que la UI pueda avisar si el push falló.
export async function sendPushNotification({ type, title, username, message, userId, roles }) {
  try {
    const { data: session } = await supabase.auth.getSession()
    const token = session?.session?.access_token
    if (!token) return { ok: false, reason: 'sin-sesion' }
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, title, username, message, userId, roles }),
    })
    const body = await res.json().catch(() => null)
    return { ok: res.ok, status: res.status, results: body }
  } catch (e) {
    return { ok: false, reason: e?.message || 'network' }
  }
}
