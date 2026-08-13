import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { RoleBadge } from '../components/ui/Avatar'
import ProfileAvatar from '../components/ui/ProfileAvatar'
import ProfileModal from '../components/profile/ProfileModal'

/**
 * Tabla de Shiny Hunt sincronizada en TIEMPO REAL con Supabase.
 * - Ordenada estrictamente de mayor a menor (ORDER BY shinies DESC).
 * - Solo lectura para todos; el staff corrige conteos desde la gestión.
 */
export default function ShinyHunt() {
  const { profile } = useAuth()
  const [hunters, setHunters] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewingId, setViewingId] = useState(null)

  const fetchHunters = useCallback(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, shinies, role, avatar_url')
      .order('shinies', { ascending: false })
    if (!error) setHunters(data)
    setLoading(false)
  }, [])

  // Carga inicial + suscripción en tiempo real a la tabla profiles
  useEffect(() => {
    fetchHunters()

    const channel = supabase
      .channel('shiny-hunt-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => fetchHunters()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchHunters])

  return (
    <div>
      <PageHeader
        title="Shiny Hunt"
        subtitle="Clasificación de cazadores de shinies del clan (de mayor a menor)."
        icon={Sparkles}
      />

      {/* Lista sincronizada */}
      <div className="overflow-hidden rounded-2xl border border-edge">
        {loading ? (
          <Spinner label="Cargando cazadores..." />
        ) : !hunters || hunters.length === 0 ? (
          <EmptyState
            title="Sin cazadores"
            hint="Cuando haya datos de caza aparecerán aquí, ordenados por su contador."
            icon={Sparkles}
          />
        ) : (
          <ul className="divide-y divide-edge">
            {hunters.map((h, i) => {
              const isMe = profile?.id === h.id
              return (
                <motion.li
                  key={h.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4) }}
                  className={`flex items-center gap-2.5 px-3 py-2.5 transition sm:gap-3 sm:px-4 sm:py-3 ${
                    isMe ? 'bg-primary/5' : 'hover:bg-background'
                  }`}
                >
                  {/* Posición */}
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold sm:h-9 sm:w-9 sm:text-sm ${
                      i === 0
                        ? 'bg-secondary text-white shadow-glowSecondary'
                        : i === 1
                          ? 'bg-soft text-white'
                          : i === 2
                            ? 'bg-primary/70 text-white'
                            : 'bg-edge text-soft'
                    }`}
                  >
                    {i === 0 ? <Crown size={16} className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> : i + 1}
                  </span>

                  <ProfileAvatar
                    userId={h.id}
                    name={h.username}
                    src={h.avatar_url}
                    size="sm"
                    className="h-7 w-7 text-[11px] sm:h-8 sm:w-8 sm:text-xs"
                  />

                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setViewingId(h.id)}
                      className="flex items-center gap-2 truncate font-semibold text-text transition hover:text-primary"
                    >
                      {h.username}
                      {isMe && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          TÚ
                        </span>
                      )}
                    </button>
                    <RoleBadge role={h.role} />
                  </div>

                  {/* Contador */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className="flex min-w-[3.5rem] items-center justify-center gap-1 rounded-lg bg-secondary/10 px-2.5 py-1 font-display text-base font-extrabold text-secondary sm:min-w-[4.5rem] sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-lg"
                    >
                      {h.shinies}
                      <Sparkles size={14} className="h-3.5 w-3.5 sm:h-3.5 sm:w-3.5" />
                    </span>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Perfil de un miembro al hacer clic en su nombre */}
      <ProfileModal userId={viewingId} onClose={() => setViewingId(null)} />
    </div>
  )
}
