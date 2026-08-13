import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Users, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import ProfileAvatar from './ProfileAvatar'
import { RoleBadge } from './Avatar'
import ProfileModal from '../profile/ProfileModal'

// Tabla y columna según el tipo de contenido (evento o torneo)
const TARGETS = {
  event: { table: 'event_rsvps', column: 'event_id', title: 'Asistencia' },
  tournament: { table: 'tournament_rsvps', column: 'tournament_id', title: 'Inscripciones' },
}

/**
 * Confirmación de asistencia / inscripción (RSVP) a un evento o torneo.
 * Botón "Asistiré / No iré" (o "Me inscribo / No iré") + lista de confirmados, en vivo.
 */
export default function RsvpBox({ parentType = 'event', parentId }) {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)
  const [viewProfileId, setViewProfileId] = useState(null)

  const { table, column, title } = TARGETS[parentType] || TARGETS.event
  const goingLabel = parentType === 'tournament' ? 'Me inscribo' : 'Asistiré'

  const load = async () => {
    const { data } = await supabase
      .from(table)
      .select('*, member:profiles(username, role, avatar_url)')
      .eq(column, parentId)
      .order('created_at', { ascending: true })
    setRows(data || [])
  }

  useEffect(() => {
    load()
    const chan = supabase
      .channel(`rsvp-${parentType}-${parentId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `${column}=eq.${parentId}` },
        load,
      )
      .subscribe()
    return () => supabase.removeChannel(chan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentType, parentId])

  const going = !!rows?.some((r) => r.user_id === user?.id)

  const toggle = async () => {
    if (!user) return
    if (going) {
      const { error } = await supabase.from(table).delete().match({ [column]: parentId, user_id: user.id })
      if (error) return
      setRows((prev) => prev?.filter((r) => r.user_id !== user.id))
    } else {
      const { error } = await supabase.from(table).insert({ [column]: parentId, user_id: user.id })
      if (error) return
      load()
    }
  }

  return (
    <div className="mt-5 rounded-2xl border border-edge bg-background/60 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h4 className="flex items-center gap-2 font-display font-bold text-text">
          <Users size={17} className="text-secondary" />
          {title}
          {rows && (
            <span className="text-xs font-medium text-soft">
              ({rows.length} {rows.length === 1 ? 'confirmado' : 'confirmados'})
            </span>
          )}
        </h4>

        <button
          onClick={toggle}
          disabled={!user}
          className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold transition active:scale-95 ${
            going
              ? 'bg-success/15 text-success hover:bg-success/25'
              : 'border border-edge bg-elevated text-text hover:border-secondary/50 hover:text-secondary'
          }`}
        >
          {going ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
          {going ? 'No iré' : goingLabel}
        </button>
      </div>

      {!rows ? (
        <p className="py-2 text-center text-sm text-soft">Cargando confirmaciones...</p>
      ) : rows.length === 0 ? (
        <p className="py-2 text-center text-sm text-soft">
          Nadie ha confirmado aún. ¡Sé el primero en apuntarte!
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {rows.map((r) => (
            <motion.li key={r.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <button
                type="button"
                onClick={() => setViewProfileId(r.user_id)}
                className="flex items-center gap-1.5 rounded-full border border-edge bg-elevated py-1 pl-1 pr-2.5 text-xs font-semibold text-text transition hover:border-primary/50 hover:text-primary"
              >
                <ProfileAvatar
                  userId={r.user_id}
                  name={r.member?.username}
                  src={r.member?.avatar_url}
                  className="h-6 w-6 text-[10px]"
                />
                <span className="truncate">{r.member?.username ?? 'Usuario'}</span>
                <RoleBadge role={r.member?.role} />
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      <ProfileModal userId={viewProfileId} onClose={() => setViewProfileId(null)} />
    </div>
  )
}
