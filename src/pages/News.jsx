import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Newspaper, Share2, Tag, Youtube } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { markSeen, useLiveSection } from '../lib/newContent'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import CommentSection from '../components/ui/CommentSection'
import { useToast } from '../components/ui/Toast'
import { formatShortDate } from '../lib/utils'
import { youtubeEmbedUrl, youtubeVideoId } from './Guides'
import PostActions from '../components/ui/PostActions'
import { buildShareLink, readDeepLink } from '../lib/share'

/**
 * DLC 4 — Noticias del clan (pública para todos los miembros).
 * Las noticias las crean y gestionan gestor/admin/super-admin en Gestión.
 * Cada noticia se abre en un modal con su contenido, enlace externo (si lo
 * tiene) y comentarios en los que participa todo el clan.
 */
export default function News() {
  const { toast } = useToast()
  const [news, setNews] = useState(null)
  const [active, setActive] = useState(null)

  const load = useCallback(() => {
    return supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setNews(data || [])
        // Enlace directo: si se llegó con ?news=<id> (en el hash), se abre esa noticia
        const dl = readDeepLink()
        if (dl?.param === 'news') {
          const found = (data || []).find((n) => n.id === dl.id)
          if (found) setActive(found)
        }
      })
  }, [])

  useEffect(() => {
    markSeen('news')
    load()
  }, [load])

  // Refresco en vivo cuando el staff publica una noticia nueva
  useLiveSection('news', load)

  const cover = (n) =>
    n.image_url ||
    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="400" height="200" fill="%231A1D24"/><rect width="400" height="200" fill="url(%23g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%23FF3E3E" stop-opacity="0.4"/><stop offset="1" stop-color="%23FFB703" stop-opacity="0.25"/></linearGradient></defs></svg>'

  const isVideo = (n) => youtubeVideoId(n.url) && !n.image_url

  // Comparte la noticia (nativo en móvil; en escritorio copia el enlace)
  const shareNews = async (n) => {
    const url = buildShareLink('/noticias', 'news', n.id)
    const data = {
      title: n.title,
      text: n.excerpt || 'Noticia del clan SpFc/Gd',
      url,
    }
    if (navigator.share) {
      try {
        await navigator.share(data)
      } catch {
        // El usuario canceló el cuadro de compartir; no se muestra error
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      toast('Enlace copiado al portapapeles', 'success')
    } catch {
      toast('No se pudo copiar el enlace', 'error')
    }
  }

  return (
    <div>
      <PageHeader
        title="Noticias"
        subtitle="Novedades del clan y del juego: eventos, mecánicas, mods y más."
        icon={Newspaper}
      />

      {!news ? (
        <Spinner label="Cargando noticias..." />
      ) : news.length === 0 ? (
        <EmptyState
          title="Aún no hay noticias"
          hint="El staff publicará aquí las novedades del clan."
          icon={Newspaper}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {news.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActive(n)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActive(n)
                }
              }}
              className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-edge bg-elevated text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            >
              <div
                className="relative h-36 w-full bg-cover bg-center transition group-hover:scale-[1.03]"
                style={{ backgroundImage: `url(${cover(n)})` }}
              >
                {isVideo(n) && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/90 text-white shadow-lg transition group-hover:scale-110">
                      <Youtube size={20} />
                    </span>
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 font-display font-bold text-text transition group-hover:text-primary">
                  {n.title}
                </h3>
                {n.excerpt && (
                  <p className="mt-1 line-clamp-2 text-sm text-soft">{n.excerpt}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(n.categories || []).map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                    >
                      <Tag size={11} />
                      {cat}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-edge pt-3">
                  <PostActions
                    parentType="news"
                    parentId={n.id}
                    shareRoute="/noticias"
                    shareParam="news"
                    shareText={n.title}
                  />
                  <p className="text-[11px] text-soft">
                    Publicado el {formatShortDate(n.created_at)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Noticia completa */}
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title} maxWidth="max-w-2xl">
        {active && (
          <>
            {active.image_url && (
              <img
                src={active.image_url}
                alt={active.title}
                className="mb-4 w-full rounded-xl object-cover"
              />
            )}

            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[11px] text-soft">
                Publicado el {formatShortDate(active.created_at)}
              </p>
              <button
                onClick={() => shareNews(active)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-edge px-3 py-1.5 text-xs font-semibold text-soft transition hover:border-primary hover:bg-primary/10 hover:text-primary"
              >
                <Share2 size={14} />
                Compartir
              </button>
            </div>

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
            </div>

            {active.excerpt && (
              <p className="mb-3 text-sm font-semibold text-secondary">{active.excerpt}</p>
            )}

            {active.url &&
              (youtubeEmbedUrl(active.url) ? (
                <div className="mb-5">
                  <div className="aspect-video w-full overflow-hidden rounded-xl border border-edge bg-black">
                    <iframe
                      src={youtubeEmbedUrl(active.url)}
                      title="Video de la noticia"
                      className="h-full w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      loading="lazy"
                    />
                  </div>
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-soft">
                    <Youtube size={14} className="text-primary" />
                    Video de YouTube
                  </p>
                </div>
              ) : (
                <a
                  href={active.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-5 inline-flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-secondary hover:text-white"
                >
                  <ExternalLink size={16} />
                  Ver fuente / más información
                </a>
              ))}

            <div className="text-text">
              {active.content.split('\n').map((line, i) => (
                <p key={i} className={line.trim() === '' ? 'mb-2' : 'mb-3 leading-relaxed'}>
                  {line}
                </p>
              ))}
            </div>

            <CommentSection parentType="news" parentId={active.id} />
          </>
        )}
      </Modal>
    </div>
  )
}
