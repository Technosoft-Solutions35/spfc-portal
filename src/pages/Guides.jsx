import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, FileText, Paperclip, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { formatShortDate } from '../lib/utils'

/**
 * Guías y buildeos del clan. Las guías se abren en un modal con su contenido.
 */
export default function Guides() {
  const [guides, setGuides] = useState(null)
  const [active, setActive] = useState(null)

  useEffect(() => {
    supabase
      .from('guides')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setGuides(data || []))
  }, [])

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
          {guides.map((g, i) => (
            <motion.button
              key={g.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActive(g)}
              className="group flex flex-col overflow-hidden rounded-2xl border border-edge bg-elevated text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            >
              <div
                className="h-36 w-full bg-cover bg-center transition group-hover:scale-[1.03]"
                style={{
                  backgroundImage: `url(${
                    g.image_url ||
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="400" height="200" fill="%231A1D24"/><rect width="400" height="200" fill="url(%23g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%23FF3E3E" stop-opacity="0.4"/><stop offset="1" stop-color="%23FFB703" stop-opacity="0.25"/></linearGradient></defs></svg>'
                  })`,
                }}
              />
              <div className="flex-1 p-4">
                <h3 className="font-display font-bold text-text transition group-hover:text-primary">
                  {g.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-soft">{g.excerpt}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
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
                <p className="mt-3 text-[11px] text-soft">
                  Publicado el {formatShortDate(g.created_at)}
                </p>
                {g.documents?.length > 0 && (
                  <span className="mt-1 flex items-center gap-1 text-[11px] text-soft">
                    <Paperclip size={11} />
                    {g.documents.length} documento{g.documents.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </motion.button>
          ))}
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
                    <li key={i}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 rounded-xl border border-edge bg-background px-3 py-2 text-sm font-medium text-text transition hover:border-primary/40 hover:text-primary"
                      >
                        <FileText size={15} className="shrink-0 text-primary" />
                        <span className="truncate">{doc.name}</span>
                      </a>
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
