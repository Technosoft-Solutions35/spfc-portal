import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CalendarDays, ChevronLeft, ChevronRight, Swords, Trophy } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { parseDateOnly } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import ProfileAvatar from '../components/ui/ProfileAvatar'
import { useToast } from '../components/ui/Toast'

/**
 * Calendario del Team — cumpleaños + eventos + torneos.
 * Muestra un calendario mes a mes con:
 *   🟣 Cumpleaños de miembros (violet)
 *   🟢 Eventos próximos (verde)
 *   🔴 Torneos (rojo)
 */

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

const MIN_YEAR = 2024
const MAX_YEAR = 2050

export default function Birthdays() {
  const today = new Date()
  const { toast } = useToast()
  const [members, setMembers] = useState(null)
  const [events, setEvents] = useState(null)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, username, avatar_url, role, birth_date')
      .not('birth_date', 'is', null)
      .then(({ data }) => setMembers(data || []))

    supabase
      .from('events')
      .select('id, title, date, location, event_type, status')
      .order('date', { ascending: true })
      .then(({ data }) => setEvents(data || []))

    const reloadEvents = () => {
      supabase
        .from('events')
        .select('id, title, date, location, event_type, status')
        .order('date', { ascending: true })
        .then(({ data }) => setEvents(data || []))
    }

    const channel = supabase
      .channel('calendar-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, reloadEvents)
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // Agrupa cumpleaños por "mes-día"
  const birthdaysByKey = useMemo(() => {
    const map = {}
    ;(members || []).forEach((m) => {
      const d = parseDateOnly(m.birth_date)
      const key = `${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(m)
    })
    return map
  }, [members])

  // Agrupa eventos por "mes-día" (del mes actual year)
  const eventsByKey = useMemo(() => {
    const map = {}
    ;(events || []).filter((e) => e.event_type !== 'PvP' && e.tier !== 'Fulminantes').forEach((e) => {
      const d = new Date(e.date)
      if (d.getFullYear() === year) {
        const key = `${d.getMonth()}-${d.getDate()}`
        if (!map[key]) map[key] = []
        map[key].push(e)
      }
    })
    return map
  }, [events, year])

  // Agrupa torneos (PvP + Fulminantes) por "mes-día"
  const tournamentsByKey = useMemo(() => {
    const map = {}
    ;(events || []).filter((e) => e.event_type === 'PvP' || e.tier === 'Fulminantes').forEach((t) => {
      const d = new Date(t.date)
      if (d.getFullYear() === year) {
        const key = `${d.getMonth()}-${d.getDate()}`
        if (!map[key]) map[key] = []
        map[key].push(t)
      }
    })
    return map
  }, [events, year])

  const firstWeekday = new Date(year, month, 1).getDay()
  const offset = (firstWeekday + 6) % 7
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11)
      setYear((y) => Math.max(MIN_YEAR, y - 1))
    } else {
      setMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0)
      setYear((y) => Math.min(MAX_YEAR, y + 1))
    } else {
      setMonth((m) => m + 1)
    }
  }

  const todayKey = `${today.getMonth()}-${today.getDate()}`
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear()
  const todayBirthdays = isCurrentMonth ? birthdaysByKey[todayKey] || [] : []
  const todayEvents = isCurrentMonth ? eventsByKey[todayKey] || [] : []
  const todayTournaments = isCurrentMonth ? tournamentsByKey[todayKey] || [] : []
  const todayItems = [...todayBirthdays, ...todayEvents, ...todayTournaments]

  const loading = members === null || events === null

  return (
    <div>
      <PageHeader
        title="Calendario del Team"
        subtitle="Cumpleaños, eventos y torneos del clan en un solo calendario."
        icon={CalendarDays}
      />

      {/* Resumen de hoy */}
      {isCurrentMonth && todayItems.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 p-4"
        >
          <CalendarDays size={18} className="text-primary" />
          <span className="text-sm font-bold text-text">
            📅 Hoy hay {todayItems.length} cosa{todayItems.length > 1 ? 's' : ''}:
          </span>
          <span className="flex flex-wrap gap-1.5">
            {todayBirthdays.map((m) => (
              <button
                key={`b-${m.id}`}
                type="button"
                onClick={() => toast(`🎂 Cumple ${m.username}`, 'success')}
                className="flex items-center gap-1.5 rounded-full border border-secondary/50 bg-secondary/10 py-1 pl-1 pr-2.5 text-xs font-semibold text-secondary transition hover:bg-secondary/20"
              >
                <ProfileAvatar userId={m.id} name={m.username} src={m.avatar_url} className="h-5 w-5 text-[9px]" interactive={false} />
                🎂 {m.username}
              </button>
            ))}
            {todayEvents.map((e) => (
              <span key={`e-${e.id}`} className="flex items-center gap-1 rounded-full border border-success/50 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                🎉 {e.title}
              </span>
            ))}
            {todayTournaments.map((t) => (
              <span key={`t-${t.id}`} className="flex items-center gap-1 rounded-full border border-primary/50 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                ⚔️ {t.title}
              </span>
            ))}
          </span>
        </motion.div>
      )}

      {/* Leyenda */}
      <div className="mb-4 flex flex-wrap items-center gap-4 text-xs font-semibold text-soft">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-secondary" /> Cumpleaños</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Eventos</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Torneos</span>
      </div>

      {/* Selector de mes y año */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button onClick={prevMonth} className="btn-ghost p-2" aria-label="Mes anterior">
            <ChevronLeft size={18} />
          </button>
          <h3 className="min-w-[180px] text-center font-display text-xl font-extrabold text-text">
            {MONTHS[month]} {year}
          </h3>
          <button onClick={nextMonth} className="btn-ghost p-2" aria-label="Mes siguiente">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex gap-2">
          <select className="input w-auto" value={month} onChange={(e) => setMonth(Number(e.target.value))} aria-label="Mes">
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select className="input w-auto" value={year} onChange={(e) => setYear(Number(e.target.value))} aria-label="Año">
            {Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Spinner label="Cargando calendario..." />
      ) : members.length === 0 && events.length === 0 ? (
        <EmptyState
          title="Aún no hay datos"
          hint="Los cumpleaños aparecen cuando los miembros ponen su fecha de nacimiento en Mi perfil. Los eventos y torneos se crean desde Gestión."
          icon={CalendarDays}
        />
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-1 text-center text-[11px] font-bold uppercase tracking-wide text-soft">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />
              const key = `${month}-${day}`
              const bdays = birthdaysByKey[key] || []
              const evts = eventsByKey[key] || []
              const trns = tournamentsByKey[key] || []
              const total = bdays.length + evts.length + trns.length
              const isToday = isCurrentMonth && day === today.getDate()

              return (
                <div
                  key={`${month}-${day}`}
                  className={`flex min-h-[64px] flex-col gap-0.5 rounded-xl border p-1.5 sm:min-h-[76px] ${
                    isToday
                      ? 'border-primary/60 bg-primary/10'
                      : total > 0
                        ? 'border-edge bg-background/60'
                        : 'border-edge/40'
                  }`}
                >
                  <span className={`text-[11px] font-bold ${isToday ? 'text-primary' : 'text-soft'}`}>{day}</span>

                  {/* Cumpleaños */}
                  {bdays.slice(0, 2).map((m) => (
                    <button
                      key={`b-${m.id}`}
                      type="button"
                      onClick={() => toast(`🎂 Cumple ${m.username}`, 'success')}
                      title={`🎂 ${m.username}`}
                      className="flex w-full items-center gap-1 rounded-md bg-secondary/10 px-1 py-0.5 text-left text-[10px] font-semibold text-secondary transition hover:bg-secondary/20"
                    >
                      <ProfileAvatar userId={m.id} name={m.username} src={m.avatar_url} className="h-3 w-3 shrink-0 text-[6px]" interactive={false} />
                      <span className="truncate">{m.username}</span>
                    </button>
                  ))}

                  {/* Eventos */}
                  {evts.slice(0, 2).map((e) => (
                    <span key={`e-${e.id}`} className="truncate rounded-md bg-success/10 px-1 py-0.5 text-[10px] font-semibold text-success" title={`🎉 ${e.title}`}>
                      🎉 {e.title}
                    </span>
                  ))}

                  {/* Torneos */}
                  {trns.slice(0, 1).map((t) => (
                    <span key={`t-${t.id}`} className="truncate rounded-md bg-primary/10 px-1 py-0.5 text-[10px] font-semibold text-primary" title={`⚔️ ${t.title}`}>
                      ⚔️ {t.title}
                    </span>
                  ))}

                  {total > 5 && (
                    <span className="px-1 text-[9px] font-semibold text-soft">+{total - 5} más</span>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
