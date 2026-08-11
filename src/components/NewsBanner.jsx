import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Newspaper } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatShortDate } from '../lib/utils'
import Modal from './ui/Modal'
import Spinner from './ui/Spinner'

/**
 * Banner superior del Dashboard: vista previa visual de la última noticia
 * publicada por el admin/gestor. Al pulsar "Leer más" abre la noticia completa.
 */
export default function NewsBanner() {
  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('news')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setNews(data || null)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Spinner label="Cargando noticias..." />
  if (!news) return null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-edge bg-elevated"
      >
        {/* Imagen de la noticia o fondo genérico */}
        <div
          className="h-56 w-full bg-cover bg-center sm:h-64"
          style={{
            backgroundImage: `url(${
              news.image_url ||
              'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 400"><rect width="800" height="400" fill="%231A1D24"/><rect width="800" height="400" fill="url(%23g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%23FF3E3E" stop-opacity="0.35"/><stop offset="1" stop-color="%23FFB703" stop-opacity="0.25"/></linearGradient></defs></svg>'
            })`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
            <span className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
              <Newspaper size={13} /> Última noticia
            </span>
            <h3 className="font-display text-2xl font-extrabold text-white sm:text-3xl">
              {news.title}
            </h3>
            <p className="mt-1 line-clamp-2 max-w-3xl text-sm text-white/80">
              {news.excerpt}
            </p>
            <p className="mt-2 text-xs font-medium text-white/60">
              {formatShortDate(news.created_at)}
            </p>
          </div>
        </div>

        {/* Botón leer más */}
        <button
          onClick={() => setOpen(true)}
          className="absolute right-4 top-4 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
        >
          Leer más
        </button>
      </motion.div>

      {/* Modal con la noticia completa */}
      <Modal open={open} onClose={() => setOpen(false)} title={news.title}>
        {news.image_url && (
          <img
            src={news.image_url}
            alt={news.title}
            className="mb-4 w-full rounded-xl object-cover"
          />
        )}
        <p className="mb-3 text-xs font-medium text-soft">
          Publicado el {formatShortDate(news.created_at)}
        </p>
        <div className="prose prose-sm max-w-none text-text">
          {news.content.split('\n').map((line, i) => (
            <p key={i} className={line.trim() === '' ? 'mb-2' : 'mb-3 leading-relaxed'}>
              {line}
            </p>
          ))}
        </div>
      </Modal>
    </>
  )
}
