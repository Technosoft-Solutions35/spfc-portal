import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Globe } from 'lucide-react'
import { supabase, supabaseAnonKey } from '../lib/supabase'

const RSS_PROXY = `${supabase.supabaseUrl}/functions/v1/fetch-rss`
const ANON_KEY = supabaseAnonKey
const CACHE_KEY = 'pokemmo-forum-rss'
const CACHE_TTL = 30 * 60 * 1000

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora mismo'
  if (mins < 60) return `Hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `Hace ${days}d`
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Banner del Dashboard que muestra la última noticia del foro PokeMMO.
 * Solo muestra contenido — las push notifications las maneja la Edge Function
 * check-forum-rss ejecutada por pg_cron cada 30 minutos.
 */
export default function ForumNewsBanner() {
  const [item, setItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
        if (cached && Date.now() - cached.ts < CACHE_TTL && cached.items?.length) {
          setItem(cached.items[0])
          setLoading(false)
          return
        }
      } catch { /* ignorar */ }

      try {
        const res = await fetch(RSS_PROXY, { headers: { apikey: ANON_KEY } })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        const items = data.items || []
        if (items.length) setItem(items[0])
        localStorage.setItem(CACHE_KEY, JSON.stringify({ items, ts: Date.now() }))
      } catch {
        try {
          const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
          if (cached?.items?.length) setItem(cached.items[0])
        } catch { /* ignorar */ }
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading || !item) return null

  return (
    <motion.a
      href={item.link}
      target="_blank"
      rel="noreferrer"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative mt-4 block overflow-hidden rounded-2xl border border-edge bg-elevated transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card"
    >
      <div className="flex items-start gap-4 p-5 sm:p-6">
        {item.image && (
          <img
            src={item.image}
            alt=""
            className="h-14 w-14 flex-shrink-0 rounded-xl object-cover sm:h-16 sm:w-16"
          />
        )}
        <div className="min-w-0 flex-1">
          <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
            <Globe size={12} /> Última noticia del foro
          </span>
          <h3 className="line-clamp-2 font-display text-lg font-extrabold text-text transition group-hover:text-primary sm:text-xl">
            {item.title}
          </h3>
          {item.description && (
            <p className="mt-1 line-clamp-2 max-w-3xl text-sm text-soft">
              {item.description}
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <p className="text-xs text-soft">{timeAgo(item.pubDate)}</p>
            <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition group-hover:opacity-100">
              Ver en foro <ExternalLink size={12} />
            </span>
          </div>
        </div>
      </div>
    </motion.a>
  )
}
