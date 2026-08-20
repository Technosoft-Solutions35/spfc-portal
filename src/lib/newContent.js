import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'
import { subscribeContentCreated } from './notifications'

// Puntos luminosos del menú: avisan cuando hay contenido nuevo (noticias,
// eventos, torneos, guías) que el usuario aún no ha visto. Se guarda por
// dispositivo la última vez que se abrió cada sección (localStorage).

const STORAGE_KEY = 'spfc_seen_sections'

// Sección del menú → tabla de Supabase donde vive su contenido
export const SECTION_TABLES = {
  news: 'news',
  events: 'events',
  guides: 'guides',
  mods: 'mods',
}

function getSeen() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
  } catch {
    return {}
  }
}

// Marca una sección como vista (se llama al abrir su página).
export function markSeen(section) {
  if (!SECTION_TABLES[section]) return
  const seen = getSeen()
  seen[section] = new Date().toISOString()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(seen))
  window.dispatchEvent(new CustomEvent('spfc:seen', { detail: { section } }))
}

// Comprueba si hay novedades: la fecha del contenido más reciente de cada
// sección debe ser posterior a la última vez que el usuario la abrió.
async function fetchFlags() {
  const seen = getSeen()
  const next = {}
  await Promise.all(
    Object.entries(SECTION_TABLES).map(async ([key, table]) => {
      const { data } = await supabase
        .from(table)
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
      const latest = data?.[0]?.created_at
      next[key] =
        !!latest && (!seen[key] || new Date(latest).getTime() > new Date(seen[key]).getTime())
    })
  )
  return next
}

// Refresco en vivo de una sección: cuando el staff publica contenido nuevo de
// ese tipo, se vuelve a cargar la lista (sin necesidad de recargar la página).
export function useLiveSection(section, load) {
  useEffect(() => {
    return subscribeContentCreated((payload) => {
      if (payload?.type === section) load()
    })
  }, [section, load])
}

// ¿Hay reportes de shinies pendientes de revisión? (foco en "Revisar shinies")
async function fetchPendingReports() {
  const { count } = await supabase
    .from('shiny_reports')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  return (count || 0) > 0
}

// Canal realtime compartido: solo se suscribe UNA vez aunque haya sidebar y
// menú móvil montados a la vez (mismo cliente Supabase).
let reportChannelActive = false
const reportRefreshCallbacks = new Set()

function ensureReportChannel(refresh) {
  reportRefreshCallbacks.add(refresh)
  if (!reportChannelActive) {
    reportChannelActive = true
    supabase
      .channel('nav-pending-reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shiny_reports' },
        () => reportRefreshCallbacks.forEach((cb) => cb())
      )
      .subscribe()
  }
  return () => reportRefreshCallbacks.delete(refresh)
}

// Hook para los menús (sidebar y móvil): devuelve `hasNew` con las secciones
// que tienen novedades y `pendingReports` (hay reportes sin revisar). Se
// refresca al volver a la pestaña, cada 30 s y en tiempo real.
export function useNewContent() {
  const [hasNew, setHasNew] = useState({
    news: false,
    events: false,
    tournaments: false,
    guides: false,
    mods: false,
  })
  const [pendingReports, setPendingReports] = useState(false)

  const refresh = useCallback(async () => {
    const [flags, hasPending] = await Promise.all([fetchFlags(), fetchPendingReports()])
    setHasNew(flags)
    setPendingReports(hasPending)
  }, [])

  useEffect(() => {
    refresh()
    window.addEventListener('focus', refresh)
    const interval = setInterval(refresh, 30000)
    const unsub = subscribeContentCreated(() => refresh())
    const unsubReports = ensureReportChannel(refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      clearInterval(interval)
      unsub()
      unsubReports()
    }
  }, [refresh])

  // Al abrir una sección su punto desaparece de inmediato
  useEffect(() => {
    const onSeen = (e) => {
      const { section } = e.detail || {}
      if (SECTION_TABLES[section]) {
        setHasNew((prev) => ({ ...prev, [section]: false }))
      }
    }
    window.addEventListener('spfc:seen', onSeen)
    return () => window.removeEventListener('spfc:seen', onSeen)
  }, [])

  return { hasNew, pendingReports }
}
