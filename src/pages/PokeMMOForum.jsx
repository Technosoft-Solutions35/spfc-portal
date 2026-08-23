import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Globe, Heart, MessageSquare, Newspaper, Share2 } from 'lucide-react'
import { supabase, supabaseAnonKey } from '../lib/supabase'
import { useLike } from '../hooks/useLike'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'

const FORUM_URL = 'https://forums.pokemmo.com'
const RSS_PROXY = `${supabase.supabaseUrl}/functions/v1/fetch-rss`
const ANON_KEY = supabaseAnonKey
const CACHE_TTL = 30 * 60 * 1000 // 30 minutos

const FEEDS = [
  { key: 'announcements', label: 'Anuncios', icon: Newspaper },
  { key: 'general', label: 'Discusión General', icon: MessageSquare },
  { key: 'suggestions', label: 'Sugerencias', icon: Globe },
  { key: 'bug-reports', label: 'Bug Reports', icon: MessageSquare },
]

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

function ForumNewsItem({ item }) {
  const { toast } = useToast()
  const { count, liked, toggle } = useLike('pokemmo-forum', item.link)

  const handleShare = (e) => {
    e.stopPropagation()
    if (navigator.share) {
      navigator.share({ title: item.title, text: item.title, url: item.link }).catch(() => {})
      return
    }
    navigator.clipboard
      ?.writeText(item.link)
      .then(() => toast('Enlace copiado al portapapeles', 'success'))
      .catch(() => toast('No se pudo copiar el enlace', 'error'))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
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
        <a
          href={item.link}
          target="_blank"
          rel="noreferrer"
          className="line-clamp-2 font-display font-bold text-text transition hover:text-primary"
        >
          {item.title}
        </a>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-sm text-soft">
            {item.description}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2">
          <p className="text-[11px] text-soft">
            {timeAgo(item.pubDate)}
          </p>
          <span className="text-soft">·</span>
          <a
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary transition hover:underline"
          >
            Ver en foro
            <ExternalLink size={11} />
          </a>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggle() }}
            title={liked ? 'Quitar me gusta' : 'Me gusta'}
            aria-pressed={liked}
            className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-background px-3 py-1.5 text-xs font-semibold text-soft transition hover:border-primary/40 hover:text-primary"
          >
            <Heart size={13} className={liked ? 'fill-current text-primary' : ''} />
            <span className="tabular-nums">{count}</span>
          </button>
          <button
            type="button"
            onClick={handleShare}
            title="Compartir"
            className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-background px-3 py-1.5 text-xs font-semibold text-soft transition hover:border-primary/40 hover:text-primary"
          >
            <Share2 size={13} />
            Compartir
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function PokeMMOForum() {
  const [feed, setFeed] = useState('announcements')
  const [items, setItems] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cacheKey = `pokemmo-forum-rss-${feed}`

    async function load() {
      setLoading(true)
      setItems(null)
      setError(null)

      // Intentar cache primero
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
        if (cached && Date.now() - cached.ts < CACHE_TTL) {
          setItems(cached.items)
          setLoading(false)
          return
        }
      } catch { /* ignorar */ }

      try {
        const res = await fetch(`${RSS_PROXY}?feed=${feed}`, {
          headers: { apikey: ANON_KEY },
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        setItems(data.items || [])
        localStorage.setItem(cacheKey, JSON.stringify({ items: data.items, ts: Date.now() }))
      } catch (err) {
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null')
          if (cached?.items) {
            setItems(cached.items)
            setLoading(false)
            return
          }
        } catch { /* ignorar */ }
        setError(err.message)
      }
      setLoading(false)
    }
    load()
  }, [feed])

  return (
    <div>
      <PageHeader
        title="Foro PokeMMO"
        subtitle="Últimas publicaciones del foro oficial de PokeMMO. Notificaciones automáticas cada 30 minutos."
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

      {/* Feed tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FEEDS.map((f) => {
          const Icon = f.icon
          const active = feed === f.key
          return (
            <button
              key={f.key}
              onClick={() => setFeed(f.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? 'bg-primary text-white shadow-glow'
                  : 'border border-edge bg-elevated text-soft hover:text-text'
              }`}
            >
              <Icon size={15} />
              {f.label}
            </button>
          )
        })}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red/30 bg-red/10 p-4 text-sm text-red">
          Error al cargar el RSS: {error}
        </div>
      )}

      {loading && <Spinner label="Cargando publicaciones..." />}

      {!loading && items && items.length === 0 && (
        <EmptyState
          title="Sin publicaciones"
          hint="No se encontraron publicaciones en este feed."
          icon={MessageSquare}
        />
      )}

      {!loading && items && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, i) => (
            <ForumNewsItem key={item.link || i} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
