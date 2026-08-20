import { useCallback, useEffect, useRef, useState } from 'react'
import { Minus, Plus, Search, UserPlus, X, Swords, Save } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { sendPushNotification } from '../../lib/push'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'

/**
 * Interfaz de gestión del ranking PvP.
 * - Muestra la tabla completa de rankings.
 * - Botón "Actualizar Ranking" que abre un modal de edición:
 *   - Buscador dinámico de miembros (ILIKE).
 *   - Tabla izquierda de jugadores seleccionados con +/− para victorias y derrotas.
 *   - Botón "Guardar" que persiste los cambios y envía push a todos.
 */
export default function PvpRankingsManager() {
  const [rankings, setRankings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)

  const fetchRankings = useCallback(async () => {
    const { data, error } = await supabase
      .from('pvp_rankings_full')
      .select('*')
    if (!error) setRankings(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchRankings() }, [fetchRankings])

  if (loading) return <Spinner label="Cargando ranking PvP..." />
  if (!rankings || rankings.length === 0) {
    return (
      <div>
        <EmptyState
          title="Sin datos PvP"
          hint="Aún no hay combates registrados. Pulsa 'Actualizar Ranking' para añadir miembros."
          icon={Swords}
        />
        <button
          onClick={() => setShowEditor(true)}
          className="mx-auto mt-4 flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary/80"
        >
          <Swords size={18} />
          Actualizar Ranking
        </button>
        {showEditor && <PvpEditor onClose={() => setShowEditor(false)} onSaved={fetchRankings} />}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-soft">
          {rankings.length} miembro{rankings.length !== 1 ? 's' : ''} en el ranking
        </p>
        <button
          onClick={() => setShowEditor(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:bg-primary/80"
        >
          <Swords size={18} />
          Actualizar Ranking
        </button>
      </div>

      {/* Tabla de rankings actual */}
      <div className="overflow-hidden rounded-2xl border border-edge">
        <div className="hidden border-b border-edge bg-background/50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-soft sm:grid sm:grid-cols-[2.5rem_1fr_4.5rem_4.5rem_4.5rem_5rem] sm:gap-2">
          <span>#</span>
          <span>Jugador</span>
          <span className="text-center">Victorias</span>
          <span className="text-center">Derrotas</span>
          <span className="text-center">Total</span>
          <span className="text-center">Winrate</span>
        </div>
        <ul className="divide-y divide-edge">
          {rankings.map((r, i) => (
            <li
              key={r.user_id}
              className="flex flex-col gap-1 px-3 py-2.5 sm:grid sm:grid-cols-[2.5rem_1fr_4.5rem_4.5rem_4.5rem_5rem] sm:items-center sm:gap-2 sm:px-4 sm:py-3"
            >
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                i === 0 ? 'bg-secondary text-white' : i === 1 ? 'bg-soft text-white' : i === 2 ? 'bg-primary/70 text-white' : 'bg-edge text-soft'
              }`}>
                {i + 1}
              </span>
              <span className="font-semibold text-text">{r.username}</span>
              <span className="hidden text-center font-bold text-success sm:block">{r.victories}</span>
              <span className="hidden text-center font-bold text-soft sm:block">{r.defeats}</span>
              <span className="hidden text-center font-bold text-text sm:block">{r.total_battles}</span>
              <span className="hidden text-center font-bold text-secondary sm:block">{r.winrate}%</span>
              <div className="flex gap-2 text-xs font-semibold sm:hidden">
                <span className="text-success">✅ {r.victories}W</span>
                <span className="text-soft">❌ {r.defeats}L</span>
                <span className="text-secondary">{r.winrate}%</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showEditor && <PvpEditor onClose={() => setShowEditor(false)} onSaved={fetchRankings} />}
    </div>
  )
}

/* ───────────────────── Modal editor de PvP ───────────────────── */

function PvpEditor({ onClose, onSaved }) {
  const [allProfiles, setAllProfiles] = useState([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const searchRef = useRef(null)

  // Cargar todos los miembros + rankings existentes
  useEffect(() => {
    ;(async () => {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username')
        .order('username')
      const { data: existing } = await supabase
        .from('pvp_rankings')
        .select('user_id, victories, defeats')
      const existingMap = {}
      for (const r of (existing || [])) existingMap[r.user_id] = r
      const merged = (profiles || []).map((p) => ({
        id: p.id,
        username: p.username,
        victories: existingMap[p.id]?.victories || 0,
        defeats: existingMap[p.id]?.defeats || 0,
      }))
      setAllProfiles(merged)
    })()
  }, [])

  // Búsqueda dinámica
  useEffect(() => {
    const q = search.trim().toLowerCase()
    if (!q) { setResults([]); return }
    const selectedIds = new Set(selected.map((s) => s.id))
    const filtered = allProfiles.filter(
      (p) => p.username.toLowerCase().includes(q) && !selectedIds.has(p.id)
    )
    setResults(filtered.slice(0, 8))
  }, [search, allProfiles, selected])

  const addPlayer = (player) => {
    setSelected((prev) => [...prev, { ...player }])
    setSearch('')
    setResults([])
    searchRef.current?.focus()
  }

  const removePlayer = (id) => {
    setSelected((prev) => prev.filter((p) => p.id !== id))
  }

  const adjustStat = (id, field, delta) => {
    setSelected((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const newVal = Math.max(0, p[field] + delta)
        return { ...p, [field]: newVal }
      })
    )
  }

  const handleSave = async () => {
    if (selected.length === 0) return
    setSaving(true)
    try {
      // Upsert todos los registros seleccionados
      const rows = selected.map((p) => ({
        user_id: p.id,
        victories: p.victories,
        defeats: p.defeats,
        updated_at: new Date().toISOString(),
      }))
      const { error } = await supabase.from('pvp_rankings').upsert(rows, { onConflict: 'user_id' })
      if (error) throw error

      // Push notification a todos los usuarios
      await sendPushNotification({
        type: 'pvp_ranking',
        title: 'Ranking PvP Actualizado',
        message: '¡El ranking de PvP del clan fue actualizado! Ven a echarle un vistazo.',
      }).catch(() => {})

      setSaved(true)
      onSaved()
      setTimeout(() => { onClose() }, 1200)
    } catch (e) {
      console.error('[PvP] Error guardando:', e)
      alert('Error al guardar: ' + (e.message || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-edge bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-edge px-5 py-4">
          <h3 className="text-lg font-bold text-text">Actualizar Ranking PvP</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-soft transition hover:bg-background hover:text-text">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
          {/* Panel izquierdo: jugadores seleccionados */}
          <div className="flex flex-1 flex-col overflow-hidden border-b border-edge lg:border-b-0 lg:border-r lg:w-3/5">
            <div className="border-b border-edge px-4 py-3">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-soft" />
                <input
                  ref={searchRef}
                  type="text"
                  placeholder="Buscar jugador por nombre..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-xl border border-edge bg-background py-2.5 pl-9 pr-4 text-sm text-text placeholder:text-soft/60 transition focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
              </div>
              {/* Resultados de búsqueda */}
              {results.length > 0 && (
                <ul className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-edge bg-background">
                  {results.map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-3 py-2 transition hover:bg-primary/5">
                      <span className="text-sm font-medium text-text">{p.username}</span>
                      <button
                        onClick={() => addPlayer(p)}
                        className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary transition hover:bg-primary hover:text-white"
                      >
                        <UserPlus size={13} />
                        Añadir
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Tabla de seleccionados */}
            {selected.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-8">
                <p className="text-sm text-soft">Busca y añade jugadores para actualizar sus estadísticas.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                <div className="hidden border-b border-edge bg-background/50 px-4 py-2 text-xs font-bold uppercase tracking-wider text-soft sm:grid sm:grid-cols-[1fr_7rem_7rem] sm:gap-2">
                  <span>Jugador</span>
                  <span className="text-center">Victorias</span>
                  <span className="text-center">Derrotas</span>
                </div>
                <ul className="divide-y divide-edge">
                  {selected.map((p) => (
                    <li key={p.id} className="flex flex-col gap-1 px-4 py-2.5 sm:grid sm:grid-cols-[1fr_7rem_7rem] sm:items-center sm:gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text">{p.username}</span>
                        <button
                          onClick={() => removePlayer(p.id)}
                          className="rounded p-0.5 text-soft transition hover:bg-red-500/10 hover:text-red-500"
                          title="Quitar"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <AdjustControl
                        value={p.victories}
                        onIncrement={() => adjustStat(p.id, 'victories', 1)}
                        onDecrement={() => adjustStat(p.id, 'victories', -1)}
                        color="success"
                      />
                      <AdjustControl
                        value={p.defeats}
                        onIncrement={() => adjustStat(p.id, 'defeats', 1)}
                        onDecrement={() => adjustStat(p.id, 'defeats', -1)}
                        color="soft"
                      />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Panel derecho: resumen + guardar */}
          <div className="flex flex-col gap-4 p-5 lg:w-2/5">
            <div className="rounded-xl bg-background p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-soft">Resumen de cambios</p>
              <p className="mt-2 text-sm text-text">
                {selected.length === 0
                  ? 'No hay jugadores seleccionados.'
                  : `${selected.length} jugador${selected.length > 1 ? 'es' : ''} será actualizado.`}
              </p>
              {selected.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-soft">
                  {selected.map((p) => (
                    <li key={p.id}>
                      {p.username}: {p.victories}W / {p.defeats}L
                      <span className="text-secondary ml-1">
                        ({p.victories + p.defeats === 0 ? 0 : Math.round(p.victories / (p.victories + p.defeats) * 100)}%)
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {saved ? (
              <div className="rounded-xl bg-success/10 p-4 text-center text-sm font-bold text-success">
                ✅ Ranking actualizado correctamente
              </div>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving || selected.length === 0}
                className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Save size={18} />
                {saving ? 'Guardando...' : 'Guardar y Notificar'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function AdjustControl({ value, onIncrement, onDecrement, color }) {
  const colorClasses = {
    success: { text: 'text-success', hover: 'hover:bg-success/10 hover:text-success' },
    soft: { text: 'text-soft', hover: 'hover:bg-soft/10 hover:text-soft' },
  }
  const c = colorClasses[color] || colorClasses.soft

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={onDecrement}
        disabled={value <= 0}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-background text-soft transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-30"
      >
        <Minus size={14} />
      </button>
      <span className={`min-w-[2rem] text-center font-display text-sm font-bold ${c.text}`}>
        {value}
      </span>
      <button
        onClick={onIncrement}
        className={`flex h-7 w-7 items-center justify-center rounded-lg bg-background text-soft transition ${c.hover}`}
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
