import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Shield, Swords } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { RoleBadge } from '../components/ui/Avatar'
import ProfileModal from '../components/profile/ProfileModal'

export default function PvpRanking() {
  const { profile } = useAuth()
  const [rankings, setRankings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewingId, setViewingId] = useState(null)

  const fetchRankings = useCallback(async () => {
    const { data, error } = await supabase
      .from('pvp_rankings_full')
      .select('*')
    if (!error) setRankings(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRankings()
    const channel = supabase
      .channel('pvp-ranking-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pvp_rankings' },
        () => fetchRankings()
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchRankings])

  const getMedalClass = (i) => {
    if (i === 0) return 'bg-secondary text-white shadow-glowSecondary'
    if (i === 1) return 'bg-soft text-white'
    if (i === 2) return 'bg-primary/70 text-white'
    return 'bg-edge text-soft'
  }

  return (
    <div>
      <PageHeader
        title="Ranking PvP"
        subtitle="Clasificación de combates y Wars de Equipos del clan."
        icon={Swords}
      />

      <div className="overflow-hidden rounded-2xl border border-edge">
        {loading ? (
          <Spinner label="Cargando ranking..." />
        ) : !rankings || rankings.length === 0 ? (
          <EmptyState
            title="Sin datos PvP"
            hint="Aún no hay combates registrados. El staff actualizará el ranking desde la gestión."
            icon={Swords}
          />
        ) : (
          <>
            {/* Encabezado de tabla (solo desktop) */}
            <div className="hidden border-b border-edge bg-background/50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-soft sm:grid sm:grid-cols-[2.5rem_1fr_4.5rem_4.5rem_4.5rem_5rem] sm:gap-2 sm:px-4">
              <span>#</span>
              <span>Jugador</span>
              <span className="text-center">Victorias</span>
              <span className="text-center">Derrotas</span>
              <span className="text-center">Total</span>
              <span className="text-center">Winrate</span>
            </div>

            <ul className="divide-y divide-edge">
              {rankings.map((r, i) => {
                const isMe = profile?.id === r.user_id
                return (
                  <motion.li
                    key={r.user_id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.4) }}
                    className={`flex flex-col gap-1 px-3 py-2.5 transition sm:grid sm:grid-cols-[2.5rem_1fr_4.5rem_4.5rem_4.5rem_5rem] sm:items-center sm:gap-2 sm:px-4 sm:py-3 ${
                      isMe ? 'bg-primary/5' : 'hover:bg-background'
                    }`}
                  >
                    {/* Posición */}
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${getMedalClass(i)}`}>
                      {i === 0 ? <Crown size={16} className="h-3.5 w-3.5" /> : i + 1}
                    </span>

                    {/* Jugador */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingId(r.user_id)}
                        className="flex items-center gap-2 truncate font-semibold text-text transition hover:text-primary"
                      >
                        {r.username}
                        {isMe && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            TÚ
                          </span>
                        )}
                      </button>
                      <RoleBadge role={r.role} />
                    </div>

                    {/* Stats en desktop */}
                    <span className="hidden text-center font-display text-sm font-bold text-success sm:block">
                      {r.victories}
                    </span>
                    <span className="hidden text-center font-display text-sm font-bold text-soft sm:block">
                      {r.defeats}
                    </span>
                    <span className="hidden text-center font-display text-sm font-bold text-text sm:block">
                      {r.total_battles}
                    </span>
                    <span className="hidden text-center font-display text-sm font-bold text-secondary sm:block">
                      {r.winrate}%
                    </span>

                    {/* Stats en móvil (debajo del nombre) */}
                    <div className="flex gap-3 text-xs font-semibold sm:hidden">
                      <span className="text-success">✅ {r.victories}W</span>
                      <span className="text-soft">❌ {r.defeats}L</span>
                      <span className="text-text">Σ {r.total_battles}</span>
                      <span className="text-secondary">{r.winrate}%</span>
                    </div>
                  </motion.li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <ProfileModal userId={viewingId} onClose={() => setViewingId(null)} />
    </div>
  )
}
