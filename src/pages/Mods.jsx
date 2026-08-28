import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Box, Download, ExternalLink, Search, Sparkles, Tag } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { markSeen, useLiveSection } from '../lib/newContent'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { formatShortDate } from '../lib/utils'
import PostActions from '../components/ui/PostActions'
import { readDeepLink } from '../lib/share'

// Categorías fijas + las que existan en la BD
const FIXED_CATEGORIES = ['Sprites', 'Funcionalidades', 'Themes', 'Música', 'Otros']

/**
 * DLC 16: Biblioteca de MODs (acceso: todos los miembros).
 * Muestra una cuadrícula de MODs con portada, descripción y enlace de descarga.
 * Filtro por categoría en pills, idéntico al de Guías.
 */
export default function Mods() {
  const [mods, setMods] = useState(null)
  const [active, setActive] = useState(null)
  const [catFilter, setCatFilter] = useState(null)
  const deepHandled = useRef(false)

  const allCategories = mods
    ? [...new Set([...FIXED_CATEGORIES, ...mods.flatMap((m) => m.categories || [])])].sort()
    : []

  const load = useCallback(() => {
    return supabase
      .from('mods')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setMods(data || [])
        const dl = readDeepLink()
        if (dl?.param === 'mod' && !deepHandled.current) {
          deepHandled.current = true
          const found = (data || []).find((m) => m.id === dl.id)
          if (found) setActive(found)
        }
      })
  }, [])

  useEffect(() => {
    markSeen('mods')
    load()
  }, [load])

  useLiveSection('mods', load)

  const filtered = catFilter
    ? mods?.filter((m) => (m.categories || []).includes(catFilter)) ?? []
    : mods

  return (
    <div>
      <PageHeader
        title="Biblioteca de MODs"
        subtitle="MODs, themes, sprites y más para PokeMMO. Descarga lo que necesites."
        icon={Box}
      />

      {/* Filtro por categoría */}
      {!mods && <Spinner label="Cargando MODs..." />}
      {mods && allCategories.length > 0 && (
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
            Todos
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

      {!mods ? (
        null
      ) : filtered.length === 0 ? (
        catFilter ? (
          <EmptyState title="Sin resultados" hint={`No hay MODs en la categoría «${catFilter}».`} icon={Tag} />
        ) : (
          <EmptyState
            title="Aún no hay MODs"
            hint="El staff compartirá aquí MODs, themes y utilidades para el clan."
            icon={Box}
          />
        )
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActive(m)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActive(m)
                }
              }}
              className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-edge bg-elevated text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            >
              <div
                className="relative h-36 w-full bg-cover bg-center transition group-hover:scale-[1.03]"
                style={{
                  backgroundImage: `url(${m.image_url || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="400" height="200" fill="%231A1D24"/><rect width="400" height="200" fill="url(%23g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%238B5CF6" stop-opacity="0.4"/><stop offset="1" stop-color="%2306B6D4" stop-opacity="0.25"/></linearGradient></defs></svg>'})`,
                }}
              >
                {m.download_url && (
                  <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-lg bg-primary/90 px-2 py-1 text-[11px] font-bold text-white shadow-lg transition group-hover:scale-105">
                    <Download size={12} />
                    Descargar
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 font-display font-bold text-text transition group-hover:text-primary">
                  {m.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-soft">{m.excerpt}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(m.categories || []).map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary"
                    >
                      <Tag size={11} />
                      {cat}
                    </span>
                  ))}
                  {(m.tags || []).map((tag) => (
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
                    parentType="mod"
                    parentId={m.id}
                    shareRoute="/mods"
                    shareParam="mod"
                    shareText={m.title}
                  />
                  <p className="text-[11px] text-soft">
                    {formatShortDate(m.created_at)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal: detalle del MOD */}
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

            {/* Botón de descarga prominente */}
            {active.download_url && (
              <a
                href={active.download_url}
                target="_blank"
                rel="noreferrer"
                className="mb-5 flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary hover:text-white"
              >
                <Download size={18} />
                Descargar MOD
                <ExternalLink size={14} className="ml-auto opacity-60" />
              </a>
            )}

            <div className="text-text">
              {(active.content || '').split('\n').map((line, i) => (
                <p key={i} className={line.trim() === '' ? 'mb-2' : 'mb-3 leading-relaxed'}>
                  {line}
                </p>
              ))}
            </div>

            <p className="mt-5 text-[11px] text-soft">
              Publicado el {formatShortDate(active.created_at)}
            </p>
          </>
        )}
      </Modal>
    </div>
  )
}
