import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { markSeen, useLiveSection } from '../lib/newContent'
import { formatDate, sortByCreatedDesc } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import CommentSection from '../components/ui/CommentSection'
import RsvpBox from '../components/ui/RsvpBox'
import PostActions from '../components/ui/PostActions'
import { readDeepLink } from '../lib/share'

/**
 * Eventos del clan: próximos primero, con sus comentarios.
 */
export default function Events() {
  const [events, setEvents] = useState(null)
  const [expanded, setExpanded] = useState(() => new Set())

  const toggle = (id) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const load = useCallback(() => {
    return supabase
      .from('events')
      .select('*')
      .then(({ data }) => setEvents(sortByCreatedDesc(data || [])))
  }, [])

  useEffect(() => {
    markSeen('events')
    load()
  }, [load])

  // Refresco en vivo cuando el staff publica un evento nuevo
  useLiveSection('events', load)

  // Enlace directo: si se llegó con ?event=<id> (en el hash), se desplaza hasta ese evento
  useEffect(() => {
    if (!events) return
    const dl = readDeepLink()
    if (dl?.param === 'event') {
      const el = document.querySelector(`[data-item-id="${dl.id}"]`)
      if (el) {
        setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 150)
      }
    }
  }, [events])

  const now = new Date()
  const upcoming = (events || []).filter((e) => new Date(e.date) >= now)
  const past = (events || []).filter((e) => new Date(e.date) < now)

  const EventCard = ({ e, i }) => {
    const open = expanded.has(e.id)
    return (
      <motion.div
        key={e.id}
        data-item-id={e.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className="overflow-hidden rounded-2xl border border-edge bg-elevated"
      >
        <div
          role="button"
          tabIndex={0}
          onClick={() => toggle(e.id)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault()
              toggle(e.id)
            }
          }}
          className="cursor-pointer p-4"
        >
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
          <h3 className="mt-2 line-clamp-2 font-display text-lg font-extrabold text-text">{e.title}</h3>
          <p className="mt-1 line-clamp-2 whitespace-pre-wrap text-sm leading-relaxed text-soft">
            {e.description}
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5 font-semibold text-text">
              <CalendarDays size={13} className="text-primary" />
              {formatDate(e.date)}
              <span className="font-normal text-soft">· hora local</span>
            </span>
            {e.location && (
              <span className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-1.5 font-semibold text-text">
                <MapPin size={13} className="text-secondary" />
                {e.location}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-edge px-4 py-2.5">
          <PostActions
            parentType="event"
            parentId={e.id}
            shareRoute="/eventos"
            shareParam="event"
            shareText={e.title}
          />
          <button
            type="button"
            onClick={() => toggle(e.id)}
            className="inline-flex items-center gap-1 rounded-full border border-edge bg-background px-3 py-1.5 text-xs font-bold text-soft transition hover:border-primary/40 hover:text-primary"
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {open ? 'Ocultar' : 'Inscripción y comentarios'}
          </button>
        </div>

        {open && (
          <div className="border-t border-edge px-4 pb-4">
            <RsvpBox parentType="event" parentId={e.id} />
            <CommentSection parentType="event" parentId={e.id} />
          </div>
        )}
      </motion.div>
    )
  }

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
