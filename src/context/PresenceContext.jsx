import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const PresenceContext = createContext(null)

/**
 * Presencia en tiempo real de los miembros conectados.
 * Un canal Realtime de Supabase mantiene el estado de presencia: cada pestaña
 * autenticada hace `track({ user_id })` y el resto recibe el estado completo
 * (sync) para saber quién está conectado. Al cerrar la pestaña o desloguear,
 * el usuario desaparece del canal automáticamente.
 */
export function PresenceProvider({ children }) {
  const [onlineIds, setOnlineIds] = useState(() => new Set())
  const channelRef = useRef(null)

  const syncPresence = useCallback((channel) => {
    const state = channel.presenceState()
    const ids = new Set()
    for (const key in state) {
      for (const presence of state[key] ?? []) {
        if (presence?.user_id) ids.add(presence.user_id)
      }
    }
    setOnlineIds(ids)
  }, [])

  useEffect(() => {
    let active = true
    let userId = null

    // Escucha la sesión: entra/sale del canal según haga login/logout
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user?.id) {
        userId = session.user.id
        if (!channelRef.current) {
          const channel = supabase.channel('online-members')
          channel
            .on('presence', { event: 'sync' }, () => {
              if (active) syncPresence(channel)
            })
            .on('presence', { event: 'join' }, () => {
              if (active) syncPresence(channel)
            })
            .on('presence', { event: 'leave' }, () => {
              if (active) syncPresence(channel)
            })
          channelRef.current = channel
          channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && active) {
              await channel.track({ user_id: userId }).catch(() => {})
            }
          })
        }
      } else if (channelRef.current) {
        // Sin sesión: se sale del canal y se limpia la lista
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
        if (active) setOnlineIds(new Set())
      }
    })

    return () => {
      active = false
      listener?.subscription?.unsubscribe()
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [syncPresence])

  const isOnline = useCallback(
    (userId) => Boolean(userId && onlineIds.has(userId)),
    [onlineIds]
  )

  const value = { onlineIds, isOnline }

  return <PresenceContext.Provider value={value}>{children}</PresenceContext.Provider>
}

export function usePresence() {
  const ctx = useContext(PresenceContext)
  if (!ctx) throw new Error('usePresence debe usarse dentro de <PresenceProvider>')
  return ctx
}
