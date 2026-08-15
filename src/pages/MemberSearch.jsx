import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, Sparkles, Swords, Users, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Avatar, { RoleBadge } from '../components/ui/Avatar'
import ProfileModal from '../components/profile/ProfileModal'
import { usePresence } from '../context/PresenceContext'

const SEARCH_FIELDS = 'id, username, avatar_url, title, role, ign, shinies'

// Escapa comodines de ILIKE para que % y _ se busquen literalmente.
const escapeLike = (value) => value.replace(/[\\%_]/g, (ch) => '\\' + ch)

/**
 * DLC 15: Directorio de Miembros (acceso: todos los miembros).
 * Barra de búsqueda en vivo: al teclear, se actualizan las tarjetas con los
 * perfiles que coinciden con el nombre de usuario o personaje (IGN).
 * Tocar una tarjeta abre el perfil de ese miembro en modo solo lectura.
 */
export default function MemberSearch() {
  const { isOnline } = usePresence()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewingId, setViewingId] = useState(null)
  const timer = useRef(null)

  useEffect(() => {
    const q = query.trim()
    if (q.length === 0) {
      clearTimeout(timer.current)
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(async () => {
      const safe = escapeLike(q)
      const { data, error } = await supabase
        .from('profiles')
        .select(SEARCH_FIELDS)
        .or(`username.ilike.%${safe}%,ign.ilike.%${safe}%`)
        .order('username', { ascending: true })
        .limit(50)
      setResults(error ? [] : data || [])
      setLoading(false)
    }, 250)
    return () => clearTimeout(timer.current)
  }, [query])

  const q = query.trim()

  return (
    <div>
      <PageHeader
        title="Directorio de Miembros"
        subtitle="Escribe un nombre o personaje (IGN) y toca una tarjeta para ver su perfil."
        icon={Users}
      />

      {/* Barra de búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-soft" size={18} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre de usuario o personaje (IGN)..."
            className="input w-full py-3 pl-11 pr-10"
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-soft transition hover:bg-background hover:text-text"
              title="Limpiar búsqueda"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-soft">
          {q
            ? loading
              ? 'Buscando…'
              : `${results.length} ${results.length === 1 ? 'resultado' : 'resultados'} para «${q}»`
            : 'Los resultados se actualizan al instante mientras escribes.'}
        </p>
      </div>

      {/* Cuadro dinámico de resultados */}
      {loading ? (
        <Spinner label="Buscando..." />
      ) : q.length === 0 ? (
        <EmptyState
          title="Empieza a escribir"
          hint="Introduce el nombre o personaje del miembro que quieres encontrar."
          icon={Users}
        />
      ) : results.length === 0 ? (
        <EmptyState title="Sin resultados" hint={`No hay nadie que coincida con «${q}».`} icon={Search} />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((m, i) => (
            <motion.li
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}
            >
              <button
                type="button"
                onClick={() => setViewingId(m.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-edge bg-surface p-4 text-left transition hover:border-primary/40 hover:bg-background"
              >
                <div className="relative shrink-0">
                  <Avatar name={m.username} src={m.avatar_url} size="lg" />
                  <span
                    className={`pointer-events-none absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-background ${
                      isOnline(m.id) ? 'bg-success' : 'bg-gray-300'
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-text">{m.username}</span>
                    <RoleBadge role={m.role} />
                  </div>
                  {m.ign && (
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-soft">
                      <Swords size={12} />
                      {m.ign}
                    </p>
                  )}
                  <p className="mt-1 flex items-center gap-1 text-xs text-primary">
                    <Sparkles size={12} />
                    {m.shinies ?? 0} shinies
                  </p>
                </div>
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      {/* Perfil del miembro seleccionado (solo lectura) */}
      <ProfileModal userId={viewingId} onClose={() => setViewingId(null)} />
    </div>
  )
}
