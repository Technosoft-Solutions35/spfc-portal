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

// Se suscribe a los avisos; devuelve una función para desuscribirse.
export function subscribeContentCreated(cb) {
  listeners.add(cb)
  ensureChannel()
  return () => listeners.delete(cb)
}
