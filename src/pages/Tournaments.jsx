import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronDown, ClipboardList, Network, Swords, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { markSeen, useLiveSection } from '../lib/newContent'
import { formatDate, sortTournaments } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import CommentSection from '../components/ui/CommentSection'
import RsvpBox from '../components/ui/RsvpBox'
import PostActions from '../components/ui/PostActions'
import { readDeepLink } from '../lib/share'

const STATUS_META = {
  open: { label: 'Inscripciones abiertas', class: 'bg-success/15 text-success' },
  in_progress: { label: 'En curso', class: 'bg-secondary/15 text-secondary' },
  finished: { label: 'Finalizado', class: 'bg-edge text-soft' },
}

/**
 * Torneos del clan con sus inscripciones (comentarios).
 */
export default function Tournaments() {
  const [tournaments, setTournaments] = useState(null)
  const [expanded, setExpanded] = useState(() => new Set()) // cards abiertas
  const [rulesExpanded, setRulesExpanded] = useState(null) // reglas de una card

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const load = useCallback(() => {
    return supabase
      .from('tournaments')
      .select('*')
      .then(({ data }) => setTournaments(sortTournaments(data || [])))
  }, [])

  useEffect(() => {
    markSeen('tournaments')
    load()
  }, [load])

  // Refresco en vivo cuando el staff publica un torneo nuevo
  useLiveSection('tournaments', load)

  // Enlace directo: si se llegó con ?tournament=<id> (en el hash), se desplaza hasta ese torneo
  useEffect(() => {
    if (!tournaments) return
    const dl = readDeepLink()
    if (dl?.param === 'tournament') {
      const el = document.querySelector(`[data-item-id="${dl.id}"]`)
      if (el) {
        setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150)
      }
    }
  }, [tournaments])

  return (
    <div>
      <PageHeader
        title="Torneos"
        subtitle="Competiciones del clan: inscríbete en los comentarios de cada torneo."
        icon={Swords}
      />

      {!tournaments ? (
        <Spinner label="Cargando torneos..." />
      ) : tournaments.length === 0 ? (
        <EmptyState
          title="No hay torneos publicados"
          hint="El staff publicará aquí los próximos torneos del clan."
          icon={Swords}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {tournaments.map((t, i) => {
            const status = STATUS_META[t.status] || STATUS_META.open
            const open = expanded.has(t.id)
            const rulesOpen = rulesExpanded === t.id
            const secondary = [formatDate(t.start_date), t.prize].filter(Boolean).join(' · ')
            return (
              <motion.div
                key={t.id}
                data-item-id={t.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl border border-edge bg-elevated"
              >
                {/* Tupla compacta: se abre para ver todo */}
                <button
                  type="button"
                  onClick={() => toggle(t.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-background"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Trophy size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 truncate font-display text-sm font-extrabold text-text">{t.title}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${status.class}`}>
                        {status.label}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-soft">{secondary}</span>
                  </span>
                  <span className={`shrink-0 text-soft transition-transform ${open ? 'rotate-180' : ''}`}>
                    <ChevronDown size={18} />
                  </span>
                </button>

                {/* Detalle expandido: toda la información + acciones */}
                {open && (
                  <div className="space-y-4 border-t border-edge px-4 pb-4 pt-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{t.description}</p>

                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-2">
                        <CalendarDays size={13} className="text-primary" />
                        <span className="text-soft">Inicio</span>
                        <span className="ml-auto text-right font-semibold text-text">
                          {formatDate(t.start_date)}
                          <span className="ml-1 font-normal text-soft">· hora local</span>
                        </span>
                      </div>
                      {t.prize && (
                        <div className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-2">
                          <Trophy size={13} className="text-secondary" />
                          <span className="text-soft">Premio</span>
                          <span className="ml-auto truncate font-semibold text-text">{t.prize}</span>
                        </div>
                      )}
                      {t.format && (
                        <div className="col-span-2 flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-2">
                          <ClipboardList size={13} className="text-secondary" />
                          <span className="text-soft">Formato</span>
                          <span className="ml-auto truncate font-semibold text-text">{t.format}</span>
                        </div>
                      )}
                    </dl>

                    {t.rules && (
                      <>
                        <button
                          onClick={() => setRulesExpanded(rulesOpen ? null : t.id)}
                          className="text-xs font-semibold text-primary hover:underline"
                        >
                          {rulesOpen ? 'Ocultar reglas' : 'Ver reglas'}
                        </button>
                        {rulesOpen && t.rules && (
                          <p className="whitespace-pre-wrap rounded-xl bg-background p-3 text-sm leading-relaxed text-text">
                            {t.rules}
                          </p>
                        )}
                      </>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <PostActions
                        parentType="tournament"
                        parentId={t.id}
                        shareRoute="/torneos"
                        shareParam="tournament"
                        shareText={t.title}
                      />
                      {t.bracket_ready && (
                        <a
                          href={`#/brackets?brackets=${t.id}`}
                          className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-xs font-bold text-soft transition hover:border-secondary hover:text-secondary"
                        >
                          <Network size={14} />
                          Ver llaves
                        </a>
                      )}
                    </div>

                    <RsvpBox parentType="tournament" parentId={t.id} />
                    <CommentSection parentType="tournament" parentId={t.id} />
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
