import { supabase } from './supabase'

// Sistema de avisos en tiempo real basado en Realtime Broadcast.
// Cuando el staff crea contenido, se emite un evento por el canal y todos los
// usuarios con la página abierta lo reciben al instante (mostrado como toast).
//
// Se usa un único canal compartido por la app: así quien publica (admin)
// también está suscrito y puede emitir, y el receptor no pierde mensajes.

const CHANNEL = 'content-notifications'
const EVENT = 'content:created'

let channel = null
const listeners = new Set()

function ensureChannel() {
  if (channel) return channel
  channel = supabase.channel(CHANNEL)
  channel
    .on('broadcast', { event: EVENT }, ({ payload }) => {
      listeners.forEach((cb) => {
        try {
          cb(payload)
        } catch {
          // un listener con error no debe tumbar a los demás
        }
      })
    })
    .subscribe()
  return channel
}

// Emite el aviso de contenido nuevo. `payload`: { type, title, uid }
// Si se pasa `forUserId`, el aviso solo se muestra a ese usuario (avisos
// personales, p. ej. "tu reporte fue aprobado"). Sin `forUserId`, es global.
export async function publishContentCreated(payload) {
  try {
    const { data } = await supabase.auth.getUser()
    await ensureChannel().send({
      type: 'broadcast',
      event: EVENT,
      payload: { ...payload, uid: data.user?.id || null, ts: Date.now() },
    })
  } catch {
    // Si falla el broadcast no bloquea la creación del contenido
  }
}

// Aviso personal dirigido a un único usuario (revisión de reportes de shinies).
// Combina el broadcast en tiempo real (pestaña abierta) con el push dirigido.
export async function notifyUser({ userId, message, pushPayload = {} }) {
  await publishContentCreated({ type: 'personal', message, forUserId: userId })
  // El push se envía solo si el módulo está cargado (evita circular imports).
  const { sendPushNotification } = await import('./push')
  await sendPushNotification({ ...pushPayload, message, userId })
}

// Se suscribe a los avisos; devuelve una función para desuscribirse.
export function subscribeContentCreated(cb) {
  listeners.add(cb)
  ensureChannel()
  return () => listeners.delete(cb)
}
