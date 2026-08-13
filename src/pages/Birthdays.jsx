import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Cake, ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { parseDateOnly } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import ProfileAvatar from '../components/ui/ProfileAvatar'
import { useToast } from '../components/ui/Toast'

/**
 * DLC 6 — Cumpleaños del clan.
 * Calendario mes a mes (hasta 2050). Se alimenta solo del birth_date de cada
 * perfil: cuando un miembro actualiza su fecha de nacimiento, aquí aparece
 * automáticamente en su día, todos los años. Nadie lo edita a mano.
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
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, username, avatar_url, role, birth_date')
      .not('birth_date', 'is', null)
      .then(({ data }) => setMembers(data || []))
  }, [])

  // Agrupa por "mes-día" para colocarlos en la casilla correcta de cualquier año
  const byKey = useMemo(() => {
    const map = {}
    ;(members || []).forEach((m) => {
      const d = parseDateOnly(m.birth_date)
      const key = `${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(m)
    })
    return map
  }, [members])

  const firstWeekday = new Date(year, month, 1).getDay()
  const offset = (firstWeekday + 6) % 7 // la semana empieza en lunes
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
  const todayBirthdays = isCurrentMonth ? byKey[todayKey] || [] : []

  return (
    <div>
      <PageHeader
        title="Cumpleaños"
        subtitle="Calendario de cumpleaños del clan. Cada miembro aparece en su día, todos los años."
        icon={Cake}
      />

      {/* Cumpleaños de hoy */}
      {isCurrentMonth && todayBirthdays.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-secondary/40 bg-secondary/10 p-4"
        >
          <Cake size={18} className="text-secondary" />
          <span className="text-sm font-bold text-text">
            🎂 ¡Hoy cumplen años!
          </span>
          <span className="flex flex-wrap gap-1.5">
            {todayBirthdays.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => toast(`🎂 Cumple ${m.username}`, 'success')}
                className="flex items-center gap-1.5 rounded-full border border-edge bg-elevated py-1 pl-1 pr-2.5 text-xs font-semibold text-text transition hover:border-primary/50 hover:text-primary"
              >
                <ProfileAvatar
                  userId={m.id}
                  name={m.username}
                  src={m.avatar_url}
                  className="h-5 w-5 text-[9px]"
                  interactive={false}
                />
                {m.username}
              </button>
            ))}
          </span>
        </motion.div>
      )}

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
          <select
            className="input w-auto"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-label="Mes"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select
            className="input w-auto"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Año"
          >
            {Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i).map(
              (y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      {!members ? (
        <Spinner label="Cargando calendario..." />
      ) : members.length === 0 ? (
        <EmptyState
          title="Aún no hay cumpleaños registrados"
          hint="Cada miembro puede poner su fecha de nacimiento en Mi perfil → editar."
          icon={Cake}
        />
      ) : (
        <>
          {/* Cabecera de días */}
          <div className="grid grid-cols-7 gap-1.5">
            {WEEKDAYS.map((d) => (
              <div key={d} className="pb-1 text-center text-[11px] font-bold uppercase tracking-wide text-soft">
                {d}
              </div>
            ))}
          </div>

          {/* Celdas del mes */}
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />
              const key = `${month}-${day}`
              const birthdays = byKey[key] || []
              const isToday = isCurrentMonth && day === today.getDate()
              return (
                <div
                  key={`${month}-${day}`}
                  className={`flex min-h-[64px] flex-col gap-1 rounded-xl border p-1.5 sm:min-h-[76px] ${
                    isToday
                      ? 'border-secondary/60 bg-secondary/10'
                      : birthdays.length > 0
                        ? 'border-edge bg-background/60'
                        : 'border-edge/40'
                  }`}
                >
                  <span
                    className={`text-[11px] font-bold ${
                      isToday ? 'text-secondary' : 'text-soft'
                    }`}
                  >
                    {day}
                  </span>
                  {birthdays.slice(0, 3).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => toast(`🎂 Cumple ${m.username}`, 'success')}
                      title={`${m.username} · ${formatMonthDay(m.birth_date)}`}
                      className="flex w-full items-center gap-1 rounded-md bg-elevated px-1 py-0.5 text-left text-[10px] font-semibold text-text transition hover:bg-primary/10 hover:text-primary"
                    >
                      <ProfileAvatar
                        userId={m.id}
                        name={m.username}
                        src={m.avatar_url}
                        className="h-3.5 w-3.5 shrink-0 text-[7px]"
                        interactive={false}
                      />
                      <span className="truncate">{m.username}</span>
                    </button>
                  ))}
                  {birthdays.length > 3 && (
                    <span className="px-1 text-[9px] font-semibold text-soft">
                      +{birthdays.length - 3} más
                    </span>
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

function formatMonthDay(value) {
  return parseDateOnly(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  })
}
