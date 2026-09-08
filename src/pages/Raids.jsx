import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Swords, Tag, Youtube } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { markSeen, useLiveSection } from '../lib/newContent'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { formatShortDate } from '../lib/utils'
import { youtubeThumbUrl, youtubeEmbedUrl } from './Guides'
import PostActions from '../components/ui/PostActions'
import { readDeepLink } from '../lib/share'

/**
 * Raids: guías de incursiones legendarias del clan.
 * Mismo patrón de Guías y Buildeos pero con su propia tabla.
 */

export default function Raids() {
  const [raids, setRaids] = useState(null)
  const [active, setActive] = useState(null)
  const [catFilter, setCatFilter] = useState(null)
  const deepHandled = useRef(false)

  const allCategories = raids
    ? [...new Set(raids.flatMap((g) => g.categories || []))].sort()
    : []

  const load = useCallback(() => {
    return supabase
      .from('raids')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRaids(data || [])
        const dl = readDeepLink()
        if (dl?.param === 'raid' && !deepHandled.current) {
          deepHandled.current = true
          const found = (data || []).find((g) => g.id === dl.id)
          if (found) setActive(found)
        }
      })
  }, [])

  useEffect(() => {
    markSeen('raids')
    load()
  }, [load])

  // Refresco en vivo cuando el staff publica una guía de raid nueva
  useLiveSection('raids', load)

  const filtered = catFilter
    ? raids?.filter((g) => (g.categories || []).includes(catFilter)) ?? []
    : raids

  return (
    <div>
      <PageHeader
        title="Raids"
        subtitle="Estrategias, equipos y movimientos explicados paso a paso para conquistar cada incursión legendaria."
        icon={Swords}
      />

      {/* Filtro por categoría */}
      {!raids && <Spinner label="Cargando raids..." />}
      {raids && allCategories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCatFilter(null)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
              !catFilter
                ? 'bg-primary text-white shadow'
                : 'border border-edge bg-surface text-soft hover:border-primary/40 hover:text-text'
            }`}
          >
            Todas
          </button>
          {allCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCatFilter(cat === catFilter ? null : cat)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                catFilter === cat
                  ? 'bg-primary text-white shadow'
                  : 'border border-edge bg-surface text-soft hover:border-primary/40 hover:text-text'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {!raids ? (
        null
      ) : filtered.length === 0 ? (
        <EmptyState title="Sin resultados" hint="No hay guías de raid con este filtro." icon={Tag} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((g, i) => {
            const cover =
              g.image_url ||
              youtubeThumbUrl(g.video_url) ||
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="400" height="200" fill="%231A1D24"/><rect width="400" height="200" fill="url(%23g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%23FF3E3E" stop-opacity="0.4"/><stop offset="1" stop-color="%23FFB703" stop-opacity="0.25"/></linearGradient></defs></svg>'
            const isVideoCover = !g.image_url && youtubeThumbUrl(g.video_url)
            return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActive(g)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActive(g)
                }
              }}
              className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-edge bg-elevated text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            >
              <div
                className="relative h-36 w-full bg-cover bg-center transition group-hover:scale-[1.03]"
                style={{ backgroundImage: `url(${cover})` }}
              >
                {isVideoCover && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/90 text-white shadow-lg transition group-hover:scale-110">
                      <Youtube size={20} />
                    </span>
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 font-display font-bold text-text transition group-hover:text-primary">
                  {g.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-soft">{g.excerpt}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(g.categories || []).map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                    >
                      <Tag size={11} />
                      {cat}
                    </span>
                  ))}
                  {(g.tags || []).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-semibold text-secondary"
                    >
                      <Tag size={11} />
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-edge pt-3">
                  <PostActions
                    parentType="raid"
                    parentId={g.id}
                    shareRoute="/raids"
                    shareParam="raid"
                    shareText={g.title}
                  />
                  <p className="text-[11px] text-soft">
                    {g.created_at ? `Publicado el ${formatShortDate(g.created_at)}` : ''}
                  </p>
                </div>
              </div>
            </motion.div>
            )
          })}
        </div>
      )}

      {/* Guía completa */}
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title}>
        {active && (
          <>
            {active.image_url && (
              <img
                src={active.image_url}
                alt={active.title}
                className="mb-4 w-full rounded-xl object-cover"
              />
            )}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(active.categories || []).map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary"
                >
                  <Tag size={11} />
                  {cat}
                </span>
              ))}
              {(active.tags || []).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-xs font-semibold text-secondary"
                >
                  <Tag size={11} />
                  {tag}
                </span>
              ))}
            </div>

            {(() => {
              const embed = youtubeEmbedUrl(active.video_url)
              return embed ? (
                <div className="mb-5">
                  <div className="aspect-video w-full overflow-hidden rounded-xl border border-edge bg-black">
                    <iframe
                      src={embed}
                      title="Video de referencia"
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                </div>
              ) : null
            })()}

            <div className="text-text whitespace-pre-wrap">
              {active.content}
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}