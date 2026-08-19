import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CalendarDays,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatDate, formatShortDate } from '../lib/utils'
import { useAuth } from '../context/AuthContext'
import EmptyState from './ui/EmptyState'
import EventCountdown from './ui/EventCountdown'

/**
 * Grid de vista rápida por categorías del Dashboard:
 * torneos recientes, eventos de la semana y Top 3 de cazadores shiny.
 */
export default function DashboardWidgets() {
  const { role } = useAuth()

  return (
    <div className="grid gap-5 md:grid-cols-3">
      <Widget
        title="Torneos recientes"
        icon={Swords}
        iconClass="text-primary bg-primary/10"
        to="/torneos"
        content={<RecentTournaments role={role} />}
      />
      <Widget
        title="Eventos de la semana"
        icon={CalendarDays}
        iconClass="text-secondary bg-secondary/10"
        to="/eventos"
        content={<UpcomingEvents role={role} />}
      />
      <Widget
        title="Top 3 cazadores shiny"
        icon={Sparkles}
        iconClass="text-secondary bg-secondary/10"
        to="/shiny-hunt"
        content={<TopShinyHunters role={role} />}
      />
    </div>
  )
}

// Caja de cada widget con enlace "Ver todo"
function Widget({ title, icon: Icon, iconClass, to, content }) {
  return (
    <div className="flex flex-col rounded-2xl border border-edge bg-elevated p-5 transition hover:border-primary/30">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`rounded-xl p-2 ${iconClass}`}>
            <Icon size={18} />
          </span>
          <h3 className="font-display font-bold text-text">{title}</h3>
        </div>
      </div>
      <div className="flex-1">{content}</div>
      <Link
        to={to}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
      >
        Ver todo <ArrowRight size={15} />
      </Link>
    </div>
  )
}

// ── Torneos recientes ─────────────────────────────────────────────
function RecentTournaments() {
  const [items, setItems] = useState(null)

  useEffect(() => {
    supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setItems(data || []))
  }, [])

  if (!items) return <p className="text-sm text-soft">Cargando...</p>
  if (items.length === 0)
    return <EmptyState title="Sin torneos" hint="El staff publicará torneos próximamente." icon={Swords} />

  return (
    <ul className="space-y-3">
      {items.map((t, i) => (
        <motion.li
          key={t.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="flex items-center gap-3 rounded-xl bg-background p-3"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">
            <Trophy size={16} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">{t.title}</p>
            <p className="text-xs text-soft">
              {formatShortDate(t.start_date)} · {t.status}
            </p>
          </div>
        </motion.li>
      ))}
    </ul>
  )
}

// ── Próximos eventos + torneos ────────────────────────────────────
function UpcomingEvents() {
  const [items, setItems] = useState(null)

  useEffect(() => {
    const now = new Date().toISOString()
    Promise.all([
      supabase.from('events').select('id, title, date, location').gte('date', now).order('date', { ascending: true }),
      supabase.from('tournaments').select('id, title, start_date, status').gte('start_date', now).order('start_date', { ascending: true }),
    ]).then(([ev, tr]) => {
      const events = (ev.data || []).map((e) => ({ ...e, _date: e.date, _type: 'event' }))
      const tournaments = (tr.data || []).map((t) => ({ ...t, _date: t.start_date, _type: 'tournament' }))
      const merged = [...events, ...tournaments].sort((a, b) => new Date(a._date) - new Date(b._date)).slice(0, 3)
      setItems(merged)
    })
  }, [])

  if (!items) return <p className="text-sm text-soft">Cargando...</p>
  if (items.length === 0)
    return <EmptyState title="Sin eventos próximos" hint="No hay eventos ni torneos agendados todavía." icon={CalendarDays} />

  return (
    <ul className="space-y-3">
      {items.map((e, i) => (
        <motion.li
          key={e.id}
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.06 }}
          className="rounded-xl bg-background p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-text">{e.title}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  e._type === 'tournament' ? 'bg-primary/15 text-primary' : 'bg-success/15 text-success'
                }`}>
                  {e._type === 'tournament' ? 'Torneo' : 'Evento'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-soft">{formatDate(e._date)} · hora local</p>
              {e.location && <p className="mt-0.5 text-xs text-soft">📍 {e.location}</p>}
            </div>
            <EventCountdown date={e._date} />
          </div>
        </motion.li>
      ))}
    </ul>
  )
}

// ── Top 3 de cazadores de shiny ───────────────────────────────────
function TopShinyHunters({ role }) {
  const [items, setItems] = useState(null)

  useEffect(() => {
    supabase
      .from('profiles')
      .select('username, shinies')
      .order('shinies', { ascending: false })
      .limit(3)
      .then(({ data }) => setItems(data || []))
  }, [])

  if (!items) return <p className="text-sm text-soft">Cargando...</p>
  if (items.length === 0)
    return <EmptyState title="Sin datos" hint="Aún no hay cazadores registrados." icon={Sparkles} />

  return (
    <div className="space-y-3">
      {items.map((p, i) => (
        <motion.div
          key={p.username}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className="flex items-center gap-3 rounded-xl bg-background p-3"
        >
          {/* Medalla por posición */}
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-extrabold text-white ${
              i === 0 ? 'bg-secondary shadow-glowSecondary' : i === 1 ? 'bg-soft' : 'bg-primary/70'
            }`}
          >
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text">{p.username}</p>
            <p className="text-xs text-soft">
              {role ? `Cazador de shinies` : 'Cazador de shinies'}
            </p>
          </div>
          <span className="font-display text-lg font-extrabold text-secondary">
            {p.shinies}
          </span>
        </motion.div>
      ))}
    </div>
  )
}
