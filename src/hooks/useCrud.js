import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Caché en memoria por tabla + orden: al volver a una pestaña ya visitada
// los datos aparecen al instante y se revalida en segundo plano si expiró.
const cache = new Map()
const TTL = 30_000 // 30 s

function cacheKey(table, orderBy) {
  return `${table}|${orderBy.column}|${orderBy.ascending}`
}

/**
 * Hook genérico de CRUD contra una tabla de Supabase.
 * Expone: listado, crear, actualizar y eliminar con refresco automático.
 * El listado usa caché con TTL para no re-consultar en cada montaje.
 */
export function useCrud(table, { orderBy = { column: 'created_at', ascending: false } } = {}) {
  const key = cacheKey(table, orderBy)

  const [items, setItems] = useState(() => cache.get(key)?.data ?? null)
  const [loading, setLoading] = useState(() => !cache.has(key))
  const [stale, setStale] = useState(false)

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy.column, { ascending: orderBy.ascending })
    if (!error) {
      cache.set(key, { data: data || [], at: Date.now() })
      setItems(data || [])
      setLoading(false)
      setStale(false)
    }
  }, [table, orderBy.column, orderBy.ascending, key])

  useEffect(() => {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.at < TTL) {
      // Datos frescos: sin spinner ni re-consulta.
      setItems(cached.data)
      setLoading(false)
      return
    }
    if (cached) {
      // Caché expirada: muestra los datos mientras revalida en segundo plano.
      setStale(true)
      setItems(cached.data)
      setLoading(false)
    }
    refresh()
  }, [refresh, key])

  // Invalida la caché al mutar para que el próximo refresh sea de datos nuevos.
  const bump = useCallback(() => {
    cache.delete(key)
    setStale(false)
  }, [key])

  const create = useCallback(
    async (values) => {
      const { data, error } = await supabase.from(table).insert(values).select().single()
      if (!error) {
        bump()
        refresh()
      }
      return { data, error }
    },
    [table, refresh, bump]
  )

  const update = useCallback(
    async (id, values) => {
      const { data, error } = await supabase
        .from(table)
        .update(values)
        .eq('id', id)
        .select()
        .single()
      if (!error) {
        bump()
        refresh()
      }
      return { data, error }
    },
    [table, refresh, bump]
  )

  const remove = useCallback(
    async (id) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (!error) {
        bump()
        refresh()
      }
      return { error }
    },
    [table, refresh, bump]
  )

  return { items, loading, stale, refresh, create, update, remove }
}

// Permite invalidar la caché desde fuera (ej: tras crear un miembro en profiles).
export function invalidateCrudCache() {
  cache.clear()
}
