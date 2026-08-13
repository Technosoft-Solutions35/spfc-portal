import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Cake } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { parseDateOnly } from '../../lib/utils'
import ProfileAvatar from './ProfileAvatar'
import { useToast } from './Toast'

/**
 * DLC 6 — Aviso de cumpleaños de HOY en el Inicio.
 * Solo se muestra si hay miembros que cumplen años hoy.
 */
export default function BirthdayBanner() {
  const { toast } = useToast()
  const [todayBirthdays, setTodayBirthdays] = useState(null)

  useEffect(() => {
    const now = new Date()
    const day = now.getDate()
    const month = now.getMonth()

    // Traemos todos los que tienen fecha y filtramos hoy en JS (el clan no es
    // grande; así evitamos sintaxis de filtro PostgREST con extract()).
    supabase
      .from('profiles')
      .select('id, username, avatar_url, birth_date')
      .not('birth_date', 'is', null)
      .then(({ data }) => {
        const todayBirths = (data || []).filter((p) => {
          const d = parseDateOnly(p.birth_date)
          return d.getMonth() === month && d.getDate() === day
        })
        setTodayBirthdays(todayBirths)
      })
  }, [])

  if (todayBirthdays === null || todayBirthdays.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-secondary/40 bg-secondary/10 p-4"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary/15 text-secondary">
        <Cake size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-text">🎂 ¡Hoy cumplen años!</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
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
        </div>
      </div>
    </motion.div>
  )
}
