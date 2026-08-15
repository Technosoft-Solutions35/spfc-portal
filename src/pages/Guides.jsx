import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Download, FileText, Paperclip, Tag, Youtube } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { markSeen, useLiveSection } from '../lib/newContent'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { formatShortDate } from '../lib/utils'
import PostActions from '../components/ui/PostActions'
import { readDeepLink } from '../lib/share'

// Convierte cualquier formato de enlace de YouTube a la URL embebible.
export function youtubeVideoId(url = '') {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})/)
  return m ? m[1] : null
}

export function youtubeEmbedUrl(url = '') {
  const id = youtubeVideoId(url)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

// Miniatura oficial de YouTube (hqdefault) para usarla como portada de la guía
// cuando no se sube imagen propia.
export function youtubeThumbUrl(url = '') {
  const id = youtubeVideoId(url)
  return id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : null
}

/**
 * Guías y buildeos del clan. Las guías se abren en un modal con su contenido.
 */
export default function Guides() {
  const [guides, setGuides] = useState(null)
  const [active, setActive] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const deepHandled = useRef(false)

  // Descarga el documento sin abrirlo (fetch → blob → enlace con download).
  // No usamos el atributo download del <a> directo porque los archivos están
  // en otro dominio (Supabase Storage) y el navegador ignoraría el nombre.
  const downloadDoc = async (doc) => {
    if (downloading) return
    setDownloading(doc.url)
    try {
      const res = await fetch(doc.url)
      if (!res.ok) throw new Error('HTTP ' + res.status)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.name || 'documento'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // Si el fetch cruzado falla, abre el archivo en otra pestaña
      window.open(doc.url, '_blank', 'noopener,noreferrer')
    } finally {
      setDownloading(null)
    }
  }

  const load = useCallback(() => {
    return supabase
      .from('guides')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setGuides(data || [])
        // Enlace directo: si se llegó con ?guide=<id> (en el hash), se abre esa guía
        // solo la primera vez; si no, cada refresco en vivo reabriría el modal.
        const dl = readDeepLink()
        if (dl?.param === 'guide' && !deepHandled.current) {
          deepHandled.current = true
          const found = (data || []).find((g) => g.id === dl.id)
          if (found) setActive(found)
        }
      })
  }, [])

  useEffect(() => {
    markSeen('guides')
    load()
  }, [load])

  // Refresco en vivo cuando el staff publica una guía nueva
  useLiveSection('guides', load)

  return (
    <div>
      <PageHeader
        title="Guías y Buildeos"
        subtitle="Consejos, buildeos y estrategias del clan para dominar PokeMMO."
        icon={BookOpen}
      />

      {!guides ? (
        <Spinner label="Cargando guías..." />
      ) : guides.length === 0 ? (
        <EmptyState
          title="Aún no hay guías"
          hint="El staff compartirá aquí buildeos y guías para el clan."
          icon={BookOpen}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {guides.map((g, i) => {
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
                    parentType="guide"
                    parentId={g.id}
                    shareRoute="/guias"
                    shareParam="guide"
                    shareText={g.title}
                  />
                  <div className="text-right">
                    {g.documents?.length > 0 && (
                      <span className="flex items-center justify-end gap-1 text-[11px] text-soft">
                        <Paperclip size={11} />
                        {g.documents.length} documento{g.documents.length > 1 ? 's' : ''}
                      </span>
                    )}
                    <p className="text-[11px] text-soft">
                      Publicado el {formatShortDate(g.created_at)}
                    </p>
                  </div>
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
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs text-soft">
                    <Youtube size={14} className="text-primary" />
                    Video de referencia de la guía
                  </p>
                </div>
              ) : (
                active.video_url && (
                  <a
                    href={active.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mb-5 flex items-center gap-2 rounded-xl bg-secondary/10 px-4 py-2.5 text-sm font-semibold text-secondary transition hover:bg-secondary hover:text-white"
                  >
                    <Youtube size={16} />
                    Ver video de referencia en YouTube
                  </a>
                )
              )
            })()}

            <div className="text-text">
              {active.content.split('\n').map((line, i) => (
                <p key={i} className={line.trim() === '' ? 'mb-2' : 'mb-3 leading-relaxed'}>
                  {line}
                </p>
              ))}
            </div>
            {active.documents?.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-text">
                  <Paperclip size={15} className="text-primary" />
                  Documentos adjuntos
                </p>
                <ul className="space-y-2">
                  {active.documents.map((doc, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 rounded-xl border border-edge bg-background px-3 py-2"
                    >
                      <FileText size={15} className="shrink-0 text-primary" />
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="min-w-0 flex-1 truncate text-sm font-medium text-text transition hover:text-primary"
                      >
                        {doc.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => downloadDoc(doc)}
                        disabled={downloading === doc.url}
                        className="flex items-center gap-1.5 rounded-lg bg-secondary/10 px-2.5 py-1.5 text-xs font-bold text-secondary transition hover:bg-secondary hover:text-white disabled:opacity-50"
                      >
                        <Download size={14} />
                        {downloading === doc.url ? 'Descargando...' : 'Descargar'}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}
