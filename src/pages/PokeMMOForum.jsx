import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Globe, MessageSquare, Newspaper } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

const FORUM_URL = 'https://forums.pokemmo.com/index.php?/forum/1-updates-announcements/'
const RSS_PROXY = `${supabase.supabaseUrl}/functions/v1/fetch-rss`
const ANON_KEY = supabase.supabaseKey
const CACHE_KEY = 'pokemmo-forum-rss'
const CACHE_TTL = 30 * 60 * 1000 // 30 minutos

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

export default function PokeMMOForum() {
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      // Intentar cache primero
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
          setItems(cached.items)
          return
        }
      } catch { /* ignorar */ }

      try {
        const res = await fetch(RSS_PROXY, {
          headers: { apikey: ANON_KEY },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setItems(data.items || [])
        localStorage.setItem(CACHE_KEY, JSON.stringify({ items: data.items, ts: Date.now() }))
      } catch (err) {
        // Si hay cache viejo, usarlo como fallback
        try {
          const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null')
          if (cached?.items) {
            setItems(cached.items)
            return
          }
        } catch { /* ignorar */ }
        setError(err.message)
      }
    }
    load()
  }, [])

  return (
    <div>
      <PageHeader
        title="Foro PokeMMO"
        subtitle="Últimas actualizaciones y anuncios del foro oficial de PokeMMO."
        icon={Newspaper}
      />

      {/* Botón: ir al foro */}
      <a
        href={FORUM_URL}
        target="_blank"
        rel="noreferrer"
        className="mb-6 inline-flex items-center gap-2 rounded-xl bg-primary/10 px-5 py-3 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
      >
        <Globe size={18} />
        Ir al foro de PokeMMO
        <ExternalLink size={14} className="opacity-60" />
      </a>

      {error && (
        <div className="mb-6 rounded-xl border border-red/30 bg-red/10 p-4 text-sm text-red">
          Error al cargar el RSS: {error}
        </div>
      )}

      {!items && !error && <Spinner label="Cargando noticias del foro..." />}

      {items && items.length === 0 && (
        <EmptyState
          title="Sin noticias"
          hint="No se encontraron publicaciones en el feed RSS."
          icon={MessageSquare}
        />
      )}

      {items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, i) => (
            <motion.a
              key={item.link || i}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-4 rounded-xl border border-edge bg-elevated p-4 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            >
              {item.image && (
                <img
                  src={item.image}
                  alt=""
                  className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <h3 className="line-clamp-2 font-display font-bold text-text transition group-hover:text-primary">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-soft">
                    {item.description}
                  </p>
                )}
                <p className="mt-2 text-[11px] text-soft">
                  {timeAgo(item.pubDate)}
                </p>
              </div>
              <ExternalLink size={16} className="mt-1 flex-shrink-0 text-soft" />
            </motion.a>
          ))}
        </div>
      )}
    </div>
  )
}
