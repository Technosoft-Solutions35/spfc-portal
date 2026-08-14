import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown, GitBranch, Network, Pencil, Plus, RefreshCw, Trophy, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import { canManageAll, formatDate } from '../lib/utils'
import { readDeepLink } from '../lib/share'
import {
  buildBracket,
  championInfo,
  clearLaterWinners,
  generateMatches,
} from '../lib/bracket'

const STATUS_META = {
  open: { label: 'Inscripciones abiertas', class: 'bg-success/15 text-success' },
  in_progress: { label: 'En curso', class: 'bg-secondary/15 text-secondary' },
  finished: { label: 'Finalizado', class: 'bg-edge text-soft' },
}

const roundLabel = (round, totalRounds, count) => {
  if (round === 1) return totalRounds <= 1 ? 'Final' : 'Ronda 1'
  if (count === 1) return 'Final'
  if (count === 2) return 'Semifinal'
  if (count === 4) return 'Cuartos de final'
  if (count === 8) return 'Octavos'
  if (count === 16) return 'Dieciseisavos'
  return `Ronda ${round}`
}

const winnerName = (m) => (m.winner === 1 ? m.p1_name : m.winner === 2 ? m.p2_name : '')

/**
 * Partido individual de la llave. Definido FUERA del componente principal para
 * que su identidad sea estable: así los inputs no pierden el foco al teclear.
 */
function MatchCard({ m, editable, onSetWinner, onRemoveWinner, onLocalPatch, onCommit }) {
  const isBronze = m.match_type === 'bronze'

  const slot = (which, player) => {
    const isWinner = m.winner === which
    const clickable = editable && !!m.p1_name && !!m.p2_name
    return (
      <div
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={clickable ? () => onSetWinner(m, which) : undefined}
        onKeyDown={(e) => {
          if (clickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault()
            onSetWinner(m, which)
          }
        }}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition ${
          isWinner
            ? 'border-secondary bg-secondary/15 text-text'
            : 'border-edge bg-background text-soft'
        } ${clickable ? 'cursor-pointer hover:border-secondary/60' : ''}`}
      >
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
            isWinner ? 'bg-secondary text-white' : 'bg-edge text-soft'
          }`}
        >
          {which}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
          {player || (editable ? '—' : 'TBD')}
        </span>
        {isWinner && editable && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemoveWinner(m)
            }}
            className="shrink-0 rounded p-0.5 text-soft transition hover:text-primary"
            title="Quitar ganador"
          >
            <X size={13} />
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      className={`rounded-xl border bg-elevated p-2.5 ${
        isBronze ? 'border-primary/40' : 'border-edge'
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide text-soft">
          {isBronze ? 'Bronce (3er/4to)' : `Partido ${m.position}`}
        </span>
        {m.winner && !editable && <Crown size={12} className="text-secondary" />}
      </div>
      <div className="space-y-1.5">
        {slot(1, m.p1_name)}
        {slot(2, m.p2_name)}
      </div>
      {editable && m.p1_name && m.p2_name && (
        <div className="mt-2 space-y-1.5">
          <input
            type="text"
            className="input !px-2 !py-1 text-xs"
            placeholder="Resultado (ej: 2-1)"
            value={m.score || ''}
            onChange={(e) => onLocalPatch(m, { score: e.target.value })}
            onBlur={() => onCommit(m)}
          />
          <input
            type="text"
            className="input !px-2 !py-1 text-xs"
            placeholder="Nota (ej: walkover)"
            value={m.notes || ''}
            onChange={(e) => onLocalPatch(m, { notes: e.target.value })}
            onBlur={() => onCommit(m)}
          />
        </div>
      )}
    </div>
  )
}

/**
 * Tablero de la llave: columnas (rondas + bronce) con scroll en ambos ejes,
 * para que quepan brackets de muchos participantes sin agrandar la interfaz.
 * Se desliza con el dedo en móvil (overflow auto) sin recortar contenido.
 */
function BracketBoard({ rounds, bronze, editable, onSetWinner, onRemoveWinner, onLocalPatch, onCommit }) {
  const totalRounds = rounds.length
  const cols = rounds.map((round, idx) => ({
    label: roundLabel(idx + 1, totalRounds, round.length),
    matches: round,
  }))
  if (bronze) cols.push({ label: 'Bronce (3er/4to)', matches: [bronze] })

  return (
    <div className="max-h-[70vh] overflow-auto rounded-2xl border border-edge bg-background/40">
      <div className="flex w-max gap-4 px-4 py-4">
        {cols.map((col, ci) => (
          <div key={ci} className="flex w-60 shrink-0 flex-col gap-3">
            <p className="sticky left-4 text-center text-xs font-bold uppercase tracking-wide text-soft">
              {col.label}
            </p>
            {col.matches.map((m) => (
              <MatchCard
                key={m.id}
                m={m}
                editable={editable}
                onSetWinner={onSetWinner}
                onRemoveWinner={onRemoveWinner}
                onLocalPatch={onLocalPatch}
                onCommit={onCommit}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * DLC 8 — Brackets de torneo.
 * Llaves (bracket) por torneo con partido por el 3er/4to, campos del torneo
 * (tier, formato, límite de participantes, premios) e historial de ganadores.
 * Gestión (generar llaves, marcar ganadores, finalizar): staff (admin + gestor).
 */
export default function Brackets() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const isAdmin = canManageAll(profile?.role)

  const [tournaments, setTournaments] = useState(null)
  const [target, setTarget] = useState(null) // torneo del modal gestionar
  const [viewTarget, setViewTarget] = useState(null) // torneo del modal ver llaves
  const [matches, setMatches] = useState(null)
  const [participants, setParticipants] = useState('')
  const [editingParticipants, setEditingParticipants] = useState(false)
  const [busy, setBusy] = useState(false)
  const targetRef = useRef(null)
  const viewRef = useRef(null)
  const deepHandled = useRef(false)

  const loadTournaments = async () => {
    const { data } = await supabase
      .from('tournaments')
      .select('*')
      .order('start_date', { ascending: false })
    setTournaments(data || [])
    // Enlace directo: ?brackets=<id> abre las llaves de ese torneo (solo la primera vez)
    if (!deepHandled.current) {
      deepHandled.current = true
      const dl = readDeepLink()
      if (dl?.param === 'brackets') {
        const found = (data || []).find((t) => t.id === dl.id)
        if (found) setViewTarget(found)
      }
    }
  }

  useEffect(() => {
    loadTournaments()
    const channel = supabase
      .channel('brackets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, () => loadTournaments())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bracket_matches' }, () => {
        // Mientras se gestionan las llaves NO se recarga con realtime: el
        // estado se actualiza en optimista y cada cambio se persiste; la
        // recarga pisaba el clic del ganador (parpadeo). La vista de solo
        // lectura sí se refresca en vivo con los cambios del staff.
        if (viewRef.current) loadMatches(viewRef.current)
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadMatches = async (t) => {
    const { data } = await supabase
      .from('bracket_matches')
      .select('*')
      .eq('tournament_id', t.id)
      .order('round', { ascending: true })
      .order('position', { ascending: true })
    setMatches(data || [])
    return data || []
  }

  const openManage = async (t) => {
    setTarget(t)
    targetRef.current = t
    setViewTarget(null)
    viewRef.current = null
    setEditingParticipants(false)
    setMatches(null)
    // Precarga los inscritos vía "Me inscribo" para que las llaves los incluyan;
    // el admin puede añadir o quitar nombres encima de la lista.
    setParticipants((await loadRegisteredPlayers(t)).join('\n'))
    await loadMatches(t)
  }

  const openView = async (t) => {
    setViewTarget(t)
    viewRef.current = t
    setTarget(null)
    targetRef.current = null
    setMatches(null)
    if (t.bracket_ready) await loadMatches(t)
  }

  // Miembros que pulsaron "Me inscribo" en el torneo (tabla tournament_rsvps).
  const loadRegisteredPlayers = async (t) => {
    const { data } = await supabase
      .from('tournament_rsvps')
      .select('member:profiles(username)')
      .eq('tournament_id', t.id)
      .order('created_at', { ascending: true })
    return (data || []).map((r) => r.member?.username).filter(Boolean)
  }

  const bracket = useMemo(
    () => (matches ? buildBracket(matches) : { rounds: [], bronze: [] }),
    [matches],
  )

  const allParticipants = () => {
    const seen = new Set()
    const list = []
    ;(matches || []).forEach((m) => {
      ;[m.p1_name, m.p2_name].forEach((n) => {
        if (n && !seen.has(n)) {
          seen.add(n)
          list.push(n)
        }
      })
    })
    return list
  }

  const startEditParticipants = async () => {
    // Junta los que ya están en la llave con los inscritos por "Me inscribo"
    // que se hayan apuntado después de crearla, sin duplicar nombres.
    const current = allParticipants()
    const registered = await loadRegisteredPlayers(target)
    const merged = [...current]
    registered.forEach((name) => {
      if (!merged.some((n) => n.toLowerCase() === name.toLowerCase())) merged.push(name)
    })
    setParticipants(merged.join('\n'))
    setEditingParticipants(true)
  }

  const generate = async () => {
    const names = participants
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean)
    if (names.length < 2) {
      toast('Escribe al menos 2 participantes (uno por línea)', 'error')
      return
    }
    setBusy(true)
    const existing = await loadMatches(target)
    if (existing.length && !window.confirm(
      'Esto regenerará las llaves con la nueva lista y se perderán los resultados actuales. ¿Continuar?',
    )) {
      setBusy(false)
      return
    }
    const { error: del } = await supabase
      .from('bracket_matches')
      .delete()
      .eq('tournament_id', target.id)
    if (del) {
      toast('No se pudieron regenerar las llaves', 'error')
      setBusy(false)
      return
    }
    const rows = generateMatches(names, target.id)
    const { error } = await supabase.from('bracket_matches').upsert(rows, {
      onConflict: 'tournament_id,round,position',
    })
    if (error) {
      toast('No se pudieron generar las llaves: ' + error.message, 'error')
      setBusy(false)
      return
    }
    await supabase
      .from('tournaments')
      .update({ bracket_ready: true, champion_name: '', second_name: '', third_name: '', status: 'in_progress' })
      .eq('id', target.id)
    setTarget((t) => ({
      ...t,
      bracket_ready: true,
      status: 'in_progress',
      champion_name: '',
      second_name: '',
      third_name: '',
    }))
    setEditingParticipants(false)
    setBusy(false)
    toast('Llaves generadas aleatoriamente', 'success')
    loadMatches(target)
    loadTournaments()
  }

  const persistMatch = async (m, patch) => {
    const { error } = await supabase
      .from('bracket_matches')
      .update(patch)
      .eq('id', m.id)
    if (error) toast('No se pudo guardar el partido', 'error')
    return !error
  }

  const setWinner = async (m, side) => {
    if (!m.p1_name || !m.p2_name) return
    const changed = m.winner !== side
    let next = matches.map((x) => (x.id === m.id ? { ...x, winner: side } : x))
    const clears = []
    if (changed) {
      next = clearLaterWinners(next, m.round)
      clears.push(...next.filter((x) => x.round > m.round))
    }
    setMatches(next)
    await persistMatch(m, { winner: side })
    await Promise.all(clears.map((c) => persistMatch(c, { winner: null })))
  }

  const patchMatchLocal = (m, patch) => {
    setMatches((prev) => prev.map((x) => (x.id === m.id ? { ...x, ...patch } : x)))
  }

  const commitMatch = async (m) => {
    const cur = matches?.find((x) => x.id === m.id)
    if (!cur) return
    await persistMatch(m, { score: cur.score, notes: cur.notes })
  }

  const removeWinner = async (m) => {
    setMatches((prev) =>
      clearLaterWinners(prev.map((x) => (x.id === m.id ? { ...x, winner: null } : x)), m.round),
    )
    await persistMatch(m, { winner: null })
  }

  const champion = championInfo(bracket.rounds)
  const bronze = bracket.bronze[0]
  const third = bronze?.winner ? winnerName(bronze) : ''
  // El bronce solo bloquea la finalización si es un partido real (ambos lados)
  const bronzePending = !!(bronze && bronze.p1_name && bronze.p2_name && !bronze.winner)
  const canFinalize = !!champion && !bronzePending

  const finalize = async () => {
    if (!canFinalize) return
    setBusy(true)
    const { error } = await supabase
      .from('tournaments')
      .update({
        status: 'finished',
        champion_name: champion.champion,
        second_name: champion.second,
        third_name: third,
      })
      .eq('id', target.id)
    setBusy(false)
    if (error) {
      toast('No se pudo finalizar el torneo', 'error')
      return
    }
    toast('Torneo finalizado: ¡campeón ' + champion.champion + '!', 'success')
    setTarget((t) => ({ ...t, status: 'finished' }))
    loadTournaments()
  }

  const card = (t, i) => {
    const status = STATUS_META[t.status] || STATUS_META.open
    const winners = [
      t.champion_name && { label: 'Campeón', name: t.champion_name, icon: '🥇' },
      t.second_name && { label: 'Subcampeón', name: t.second_name, icon: '🥈' },
      t.third_name && { label: '3er lugar', name: t.third_name, icon: '🥉' },
    ].filter(Boolean)

    return (
      <motion.div
        key={t.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.05 }}
        className="flex flex-col rounded-2xl border border-edge bg-elevated p-5"
      >
        <div className="mb-2 flex items-start justify-between gap-2">
          <span className="rounded-xl bg-secondary/10 p-2 text-secondary">
            <Network size={18} />
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${status.class}`}>
            {status.label}
          </span>
        </div>

        <h3 className="font-display text-lg font-extrabold text-text">{t.title}</h3>
        <p className="mt-1 text-sm text-soft">{t.description}</p>

        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
          {(t.tier || t.format) && (
            <div className="col-span-2 flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-2">
              <GitBranch size={13} className="text-primary" />
              <span className="text-soft">Campos</span>
              <span className="ml-auto truncate font-semibold text-text">
                {[t.tier, t.format].filter(Boolean).join(' · ')}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-2">
            <Trophy size={13} className="text-secondary" />
            <span className="text-soft">Premio</span>
            <span className="ml-auto truncate font-semibold text-text">{t.prize || '—'}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-2">
            <span className="text-soft">Inicio</span>
            <span className="ml-auto font-semibold text-text">{formatDate(t.start_date)}</span>
          </div>
          {t.max_participants && (
            <div className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-2">
              <span className="text-soft">Límite</span>
              <span className="ml-auto font-semibold text-text">{t.max_participants} cupos</span>
            </div>
          )}
        </dl>

        {winners.length > 0 && (
          <div className="mt-3 space-y-1.5 rounded-xl border border-secondary/20 bg-secondary/5 p-3">
            {winners.map((w) => (
              <p key={w.label} className="flex items-center gap-2 text-sm">
                <span>{w.icon}</span>
                <span className="font-bold text-text">{w.name}</span>
                <span className="ml-auto text-[11px] text-soft">{w.label}</span>
              </p>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2 border-t border-edge pt-3">
          {t.bracket_ready && (
            <button
              onClick={() => openView(t)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-secondary px-3 py-2 text-sm font-bold text-white transition hover:brightness-110"
            >
              <Network size={15} />
              Ver llaves
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => openManage(t)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition ${
                t.bracket_ready
                  ? 'border-edge text-soft hover:border-primary hover:text-primary'
                  : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
              }`}
            >
              {t.bracket_ready ? (
                <>
                  <RefreshCw size={14} />
                  Gestionar
                </>
              ) : (
                <>
                  <Plus size={14} />
                  Crear llaves
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Brackets de Torneo"
        subtitle="Llaves, resultados e historial de campeones de los torneos del clan."
        icon={Network}
      />

      {!tournaments ? (
        <Spinner label="Cargando torneos..." />
      ) : tournaments.length === 0 ? (
        <EmptyState
          title="No hay torneos todavía"
          hint="Cuando el staff publique un torneo podrás seguir aquí sus llaves."
          icon={Network}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {tournaments.map((t, i) => card(t, i))}
        </div>
      )}

      {/* Gestión: crear llaves, editar participantes o marcar ganadores */}
      <Modal
        open={!!target}
        onClose={() => {
          setTarget(null)
          targetRef.current = null
        }}
        title={target ? `Llaves · ${target.title}` : ''}
        maxWidth="max-w-6xl"
      >
        {target && !target.bracket_ready && (
          <div className="space-y-4">
            <div>
              <label className="label">Participantes (uno por línea)</label>
              <textarea
                className="input min-h-40 font-mono text-sm"
                placeholder={'Jugador1\nJugador2\nJugador3\n…'}
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={generate} disabled={busy} className="btn-primary">
                <Plus size={16} />
                {busy ? 'Generando…' : 'Generar llaves aleatorias'}
              </button>
              <button
                onClick={() => setTarget(null)}
                className="btn-ghost"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {target && target.bracket_ready && matches && (
          <div className="space-y-4">
            {matches.length === 0 ? (
              <EmptyState title="Sin llaves" hint="Genera las llaves de nuevo." icon={Network} />
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-soft">
                    Haz clic sobre un jugador para marcarlo ganador. El cruce se actualiza solo.
                    En brackets grandes, desliza hacia los lados o hacia abajo para ver todas las rondas.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {champion && (
                      <span className="rounded-full bg-secondary/15 px-3 py-1 text-xs font-bold text-secondary">
                        Final: {champion.champion} vs {champion.second}
                      </span>
                    )}
                    <button
                      onClick={startEditParticipants}
                      disabled={busy}
                      className="rounded-xl border border-edge px-3 py-1.5 text-xs font-bold text-soft transition hover:border-primary hover:text-primary"
                    >
                      <Pencil size={13} className="mr-1 inline" />
                      Editar participantes
                    </button>
                    <button
                      onClick={finalize}
                      disabled={busy || !canFinalize}
                      className="rounded-xl bg-success px-3 py-1.5 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-40"
                      title={
                        bronzePending
                          ? 'Falta decidir el partido de bronce'
                          : 'Guardar campeón, subcampeón y 3er lugar'
                      }
                    >
                      Finalizar torneo
                    </button>
                  </div>
                </div>

                {editingParticipants ? (
                  <div className="space-y-4">
                    <div>
                      <label className="label">Participantes (uno por línea)</label>
                      <textarea
                        className="input min-h-40 font-mono text-sm"
                        placeholder={'Jugador1\nJugador2\nJugador3\n…'}
                        value={participants}
                        onChange={(e) => setParticipants(e.target.value)}
                      />
                      <p className="mt-1 text-[10px] text-soft">
                        Añade o quita nombres y vuelve a guardar: se regenera la llave con el
                        nuevo sorteo (se pierden los resultados actuales).
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button onClick={generate} disabled={busy} className="btn-primary">
                        <RefreshCw size={16} />
                        {busy ? 'Regenerando…' : 'Guardar y regenerar llaves'}
                      </button>
                      <button onClick={() => setEditingParticipants(false)} className="btn-ghost">
                        Volver
                      </button>
                    </div>
                  </div>
                ) : (
                  <BracketBoard
                    rounds={bracket.rounds}
                    bronze={bracket.bronze[0]}
                    editable
                    onSetWinner={setWinner}
                    onRemoveWinner={removeWinner}
                    onLocalPatch={patchMatchLocal}
                    onCommit={commitMatch}
                  />
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Ver llaves (lectura) */}
      <Modal
        open={!!viewTarget}
        onClose={() => {
          setViewTarget(null)
          viewRef.current = null
        }}
        title={viewTarget ? `Llaves · ${viewTarget.title}` : ''}
        maxWidth="max-w-6xl"
      >
        {viewTarget && viewTarget.bracket_ready && matches && (
          <div className="space-y-4">
            {matches.length === 0 ? (
              <EmptyState title="Sin llaves" hint="El staff aún no genera las llaves." icon={Network} />
            ) : (
              <BracketBoard
                rounds={bracket.rounds}
                bronze={bracket.bronze[0]}
                editable={false}
                onSetWinner={setWinner}
                onRemoveWinner={removeWinner}
                onLocalPatch={patchMatchLocal}
                onCommit={commitMatch}
              />
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
