import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import CommentSection from '../components/ui/CommentSection'

/**
 * Eventos del clan: próximos primero, con sus comentarios.
 */
export default function Events() {
  const [events, setEvents] = useState(null)

  useEffect(() => {
    supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
      .then(({ data }) => setEvents(data || []))
  }, [])

  const now = new Date()
  const upcoming = (events || []).filter((e) => new Date(e.date) >= now)
  const past = (events || []).filter((e) => new Date(e.date) < now)

  const EventCard = ({ e, i }) => (
    <motion.div
      key={e.id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      className="overflow-hidden rounded-2xl border border-edge bg-elevated"
    >
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-xl bg-secondary/10 p-2 text-secondary">
            <CalendarDays size={18} />
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
              new Date(e.date) >= now
                ? 'bg-success/15 text-success'
                : 'bg-edge text-soft'
            }`}
          >
            {new Date(e.date) >= now ? 'Próximo' : 'Finalizado'}
          </span>
        </div>
        <h3 className="mt-2 font-display text-lg font-extrabold text-text">{e.title}</h3>
        <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-soft">
          {e.description}
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5 font-semibold text-text">
            <CalendarDays size={13} className="text-primary" />
            {formatDate(e.date)}
          </span>
          {e.location && (
            <span className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5 font-semibold text-text">
              <MapPin size={13} className="text-secondary" />
              {e.location}
            </span>
          )}
        </div>
      </div>
      <div className="px-5 pb-5">
        <CommentSection parentType="event" parentId={e.id} />
      </div>
    </motion.div>
  )

  return (
    <div>
      <PageHeader
        title="Eventos"
        subtitle="Quedadas, capturas de shiny en equipo y demás actividades del clan."
        icon={CalendarDays}
      />

      {!events ? (
        <Spinner label="Cargando eventos..." />
      ) : events.length === 0 ? (
        <EmptyState
          title="No hay eventos publicados"
          hint="El staff publicará aquí los próximos eventos del clan."
          icon={CalendarDays}
        />
      ) : (
        <div className="space-y-5">
          {upcoming.length > 0 && (
            <div className="grid gap-5 lg:grid-cols-2">
              {upcoming.map((e, i) => (
                <EventCard key={e.id} e={e} i={i} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <>
              <h3 className="pt-2 font-display font-bold text-soft">
                Eventos pasados
              </h3>
              <div className="grid gap-5 opacity-70 lg:grid-cols-2">
                {past.map((e, i) => (
                  <EventCard key={e.id} e={e} i={i} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
