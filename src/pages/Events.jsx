import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronDown, MapPin } from 'lucide-react'
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
    const isUpcoming = new Date(e.date) >= now
    const secondary = [formatDate(e.date), e.location].filter(Boolean).join(' · ')
    return (
      <motion.div
        key={e.id}
        data-item-id={e.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className="overflow-hidden rounded-2xl border border-edge bg-elevated"
      >
        {/* Tupla compacta: se abre para ver todo */}
        <button
          type="button"
          onClick={() => toggle(e.id)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-background"
        >
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
            <CalendarDays size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="min-w-0 truncate font-display text-sm font-extrabold text-text">{e.title}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  isUpcoming ? 'bg-success/15 text-success' : 'bg-edge text-soft'
                }`}
              >
                {isUpcoming ? 'Próximo' : 'Finalizado'}
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
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{e.description}</p>

            <div className="flex flex-wrap gap-2 text-xs">
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

            <PostActions
              parentType="event"
              parentId={e.id}
              shareRoute="/eventos"
              shareParam="event"
              shareText={e.title}
            />

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
