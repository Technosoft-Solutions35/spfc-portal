import { useEffect, useState } from 'react'
import { Bell, BellOff, CheckCircle2, AlertTriangle } from 'lucide-react'
import {
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  handlePushSubscriptionChange,
} from '../../lib/push'

/**
 * Tarjeta del Dashboard para activar/desactivar las notificaciones push.
 * Muestra el estado real de la suscripción de este navegador.
 */
export default function PushNotificationsCard() {
  const [supported] = useState(() => isPushSupported())
  const [state, setState] = useState('checking') // checking | enabled | disabled | unsupported
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    async function init() {
      if (!supported) {
        setState('unsupported')
        return
      }
      const sub = await getCurrentSubscription()
      if (mounted) setState(sub ? 'enabled' : 'disabled')
    }
    init()
    handlePushSubscriptionChange()
    return () => {
      mounted = false
    }
  }, [supported])

  async function onToggle() {
    setBusy(true)
    setError('')
    if (state === 'enabled') {
      const res = await unsubscribeFromPush()
      if (res.ok) setState('disabled')
      else setError(res.reason)
    } else {
      const res = await subscribeToPush()
      if (res.ok) setState('enabled')
      else {
        setState('disabled')
        setError(
          res.reason === 'denied'
            ? 'Permiso denegado. Habilítalo desde los ajustes del navegador.'
            : res.reason === 'unsupported'
              ? 'Este navegador no soporta notificaciones push.'
              : `No se pudo activar: ${res.reason}`
        )
      }
    }
    setBusy(false)
  }

  if (state === 'unsupported') return null

  const enabled = state === 'enabled'

  return (
    <div className="rounded-2xl border border-edge bg-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`rounded-xl p-2.5 ${enabled ? 'bg-primary/10 text-primary' : 'bg-edge text-soft'}`}>
            {enabled ? <Bell size={22} /> : <BellOff size={22} />}
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-text">Notificaciones push</h3>
            <p className="text-sm text-soft">
              {enabled
                ? 'Activas: recibirás avisos aunque la web esté cerrada.'
                : 'Avísame cuando haya contenido nuevo, incluso con la web cerrada.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
            enabled ? 'bg-primary' : 'bg-edge'
          } ${busy ? 'cursor-wait opacity-60' : 'cursor-pointer'}`}
          aria-label={enabled ? 'Desactivar notificaciones' : 'Activar notificaciones'}
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-2 text-sm text-primary">
          <AlertTriangle size={16} />
          {error}
        </p>
      )}
      {enabled && (
        <p className="mt-3 flex items-center gap-2 text-sm text-success">
          <CheckCircle2 size={16} />
          Este navegador está suscrito.
        </p>
      )}
    </div>
  )
}
