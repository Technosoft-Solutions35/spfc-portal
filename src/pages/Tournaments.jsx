import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ClipboardList, Swords, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import CommentSection from '../components/ui/CommentSection'

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
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: false })
      .then(({ data }) => setTournaments(data || []))
  }, [])

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
            const open = expanded === t.id
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex flex-col overflow-hidden rounded-2xl border border-edge bg-elevated"
              >
                {/* Cabecera */}
                <div className="p-5 pb-3">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="rounded-xl bg-primary/10 p-2 text-primary">
                      <Trophy size={18} />
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.class}`}>
                      {status.label}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-extrabold text-text">{t.title}</h3>
                  <p className="mt-1 text-sm text-soft">{t.description}</p>

                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-2">
                      <CalendarDays size={13} className="text-primary" />
                      <span className="text-soft">Inicio</span>
                      <span className="ml-auto font-semibold text-text">{formatDate(t.start_date)}</span>
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
                    <button
                      onClick={() => setExpanded(open ? null : t.id)}
                      className="mt-2 text-xs font-semibold text-primary hover:underline"
                    >
                      {open ? 'Ocultar reglas' : 'Ver reglas'}
                    </button>
                  )}
                  {open && t.rules && (
                    <p className="mt-2 whitespace-pre-wrap rounded-xl bg-background p-3 text-sm leading-relaxed text-text">
                      {t.rules}
                    </p>
                  )}
                </div>

                {/* Inscripciones */}
                <div className="mt-auto px-5 pb-5">
                  <CommentSection parentType="tournament" parentId={t.id} />
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
