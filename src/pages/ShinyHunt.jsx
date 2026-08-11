import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, Minus, Plus, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import { canManageShinies } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Avatar, { RoleBadge } from '../components/ui/Avatar'

/**
 * Tabla de Shiny Hunt sincronizada en TIEMPO REAL con Supabase.
 * - Ordenada estrictamente de mayor a menor (ORDER BY shinies DESC).
 * - member: solo lectura. admin/gestor: botones + / - para corregir conteos.
 */
export default function ShinyHunt() {
  const { role, profile } = useAuth()
  const { toast } = useToast()
  const [hunters, setHunters] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const isStaff = canManageShinies(role)

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

  // Corrige el contador de shinies (+ / -)
  const adjustShinies = async (hunterId, delta) => {
    if (!isStaff) return
    setUpdatingId(hunterId)
    const current = hunters?.find((h) => h.id === hunterId)
    const newValue = Math.max(0, (current?.shinies ?? 0) + delta)
    const { error } = await supabase
      .from('profiles')
      .update({ shinies: newValue })
      .eq('id', hunterId)
    setUpdatingId(null)

    if (error) {
      toast('No se pudo actualizar el contador', 'error')
      return
    }
    toast(
      delta > 0
        ? `+1 shiny registrado a ${current?.username}`
        : `-1 shiny corregido a ${current?.username}`,
      'success'
    )
  }

  return (
    <div>
      <PageHeader
        title="Shiny Hunt"
        subtitle={
          isStaff
            ? 'Usa los botones + / - para corregir los conteos reportados.'
            : 'Clasificación de cazadores de shinies del clan (de mayor a menor).'
        }
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
                  className={`flex items-center gap-3 px-4 py-3 transition ${
                    isMe ? 'bg-primary/5' : 'hover:bg-background'
                  }`}
                >
                  {/* Posición */}
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                      i === 0
                        ? 'bg-secondary text-white shadow-glowSecondary'
                        : i === 1
                          ? 'bg-soft text-white'
                          : i === 2
                            ? 'bg-primary/70 text-white'
                            : 'bg-edge text-soft'
                    }`}
                  >
                    {i === 0 ? <Crown size={16} /> : i + 1}
                  </span>

                  <Avatar name={h.username} src={h.avatar_url} size="sm" />

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate font-semibold text-text">
                      {h.username}
                      {isMe && (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          TÚ
                        </span>
                      )}
                    </p>
                    <RoleBadge role={h.role} />
                  </div>

                  {/* Contador */}
                  <div className="flex items-center gap-2">
                    {isStaff && (
                      <>
                        <button
                          onClick={() => adjustShinies(h.id, -1)}
                          disabled={updatingId === h.id || h.shinies === 0}
                          title="Restar shiny"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge text-soft transition hover:border-primary hover:bg-primary/10 hover:text-primary disabled:opacity-30"
                        >
                          <Minus size={15} />
                        </button>
                        <button
                          onClick={() => adjustShinies(h.id, 1)}
                          disabled={updatingId === h.id}
                          title="Sumar shiny"
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-edge text-soft transition hover:border-success hover:bg-success/10 hover:text-success disabled:opacity-30"
                        >
                          <Plus size={15} />
                        </button>
                      </>
                    )}
                    <span
                      className="flex min-w-[4.5rem] items-center justify-center gap-1 rounded-xl bg-secondary/10 px-3 py-1.5 font-display text-lg font-extrabold text-secondary"
                    >
                      {h.shinies}
                      <Sparkles size={14} />
                    </span>
                  </div>
                </motion.li>
              )
            })}
          </ul>
        )}
      </div>

      {isStaff && (
        <p className="mt-3 text-xs text-soft">
          Los cambios se guardan al instante y se reflejan en todos los miembros conectados.
        </p>
      )}
    </div>
  )
}
