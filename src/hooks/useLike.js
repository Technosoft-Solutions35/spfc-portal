import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Canal único de Realtime para todos los likes: cuando alguien da/quita un like,
// se avisa a los contadores abiertos de ese mismo anuncio y se refrescan solos.
let channel = null
const listeners = new Set()

function ensureChannel() {
  if (channel) return channel
  channel = supabase
    .channel('likes-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'likes' }, (payload) => {
      const row = payload.new || payload.old
      if (!row) return
      listeners.forEach((cb) => {
        if (cb.parentType === row.parent_type && cb.parentId === row.parent_id) {
          cb.refetch()
        }
      })
    })
    .subscribe()
  return channel
}

/**
 * Hook de "me gusta" para un anuncio concreto.
 * - Cuenta los likes del anuncio y si el usuario actual ya le dio like.
 * - Se actualiza en tiempo real cuando otro miembro da/quita un like.
 * - `toggle()` da o quita el like de forma optimista.
 */
export function useLike(parentType, parentId) {
  const { user } = useAuth()
  const [count, setCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const toggling = useRef(false)

  const fetchState = useCallback(async () => {
    if (!parentId) return
    const { data } = await supabase
      .from('likes')
      .select('user_id')
      .eq('parent_type', parentType)
      .eq('parent_id', parentId)
    setCount(data?.length || 0)
    setLiked(!!data?.some((l) => l.user_id === user?.id))
  }, [parentType, parentId, user?.id])

  useEffect(() => {
    setCount(0)
    setLiked(false)
    fetchState()
    const cb = { parentType, parentId, refetch: fetchState }
    listeners.add(cb)
    ensureChannel()
    return () => listeners.delete(cb)
  }, [fetchState, parentType, parentId])

  const toggle = useCallback(async () => {
    if (!parentId || !user || toggling.current) return
    toggling.current = true
    // Aplicación optimista: la UI cambia al instante; si falla, se revierte.
    const next = !liked
    setLiked(next)
    setCount((c) => Math.max(0, c + (next ? 1 : -1)))
    const query = { user_id: user.id, parent_type: parentType, parent_id: parentId }
    const { error } = next
      ? await supabase.from('likes').insert(query)
      : await supabase.from('likes').delete().match(query)
    if (error) fetchState() // revierte a los valores reales del servidor
    toggling.current = false
  }, [parentType, parentId, user, liked, fetchState])

  return { count, liked, toggle }
}
