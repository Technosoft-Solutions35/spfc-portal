import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Download,
  History,
  Pencil,
  RefreshCcw,
  Sparkles,
  Ticket,
  Trash2,
  Trophy,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import WinnerReveal from '../components/RaffleDraw/WinnerReveal'
import PostActions from '../components/ui/PostActions'

// Parsea las líneas del textarea: "Nombre Cantidad" → [{ username, quantity }]
export function parseTicketInput(text) {
  const rows = []
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const match = line.match(/^(.+?)\s+(\d+)$/)
      if (match) {
        rows.push({ username: match[1].trim(), quantity: parseInt(match[2], 10) })
      }
    })
  return rows
}

// Sorteo ponderado: la cantidad de tickets es el peso de probabilidad.
// Se seleccionan 3 ganadores DISTINTOS (cada boleto es una boleta virtual).
export function weightedDraw(tickets, numWinners = 3) {
  const remaining = tickets.filter((t) => t.quantity > 0)
  const winners = []
  for (let i = 0; i < numWinners && remaining.length > 0; i++) {
    const total = remaining.reduce((sum, t) => sum + t.quantity, 0)
    let r = Math.random() * total
    let chosen = 0
    for (let j = 0; j < remaining.length; j++) {
      r -= remaining[j].quantity
      if (r < 0) {
        chosen = j
        break
      }
    }
    winners.push(remaining[chosen].username)
    remaining.splice(chosen, 1)
  }
  return winners
}

/**
 * Panel de Sorteos.
 * - Cualquier miembro logueado VE los ganadores del sorteo y cuántos
 *   tickets tiene cada participante (en tiempo real).
 * - Solo admin / super-admin pueden gestionar: editar la lista actual,
 *   insertar una nueva reemplazando todos los datos, vaciarla y sortear.
 */
export default function Raffles() {
  const { toast } = useToast()
  const { can } = useAuth()
  const isAdmin = can('raffles')

  const [input, setInput] = useState('')
  const [tickets, setTickets] = useState(null)
  const [history, setHistory] = useState([])
  const [syncing, setSyncing] = useState(false)
  const [drawing, setDrawing] = useState(false)
  const [winners, setWinners] = useState(null)
  const [drawInfo, setDrawInfo] = useState({})

  // Total de boletas (suma de cantidades)
  const totalBalls = useMemo(
    () => (tickets || []).reduce((s, t) => s + t.quantity, 0),
    [tickets]
  )

  // Último sorteo realizado (ganadores vigentes)
  const lastDraw = history[0] || null

  const loadTickets = async () => {
    const { data } = await supabase
      .from('tickets')
      .select('*')
      .order('quantity', { ascending: false })
    setTickets(data || [])
  }

  const loadHistory = async () => {
    const { data } = await supabase
      .from('draws')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    setHistory(data || [])
  }

  useEffect(() => {
    loadTickets()
    loadHistory()
    // Suscripción en tiempo real para que la tabla y los resultados se actualicen solos
    const channel = supabase
      .channel('raffles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, loadTickets)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'draws' }, loadHistory)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  // Lleva la lista actual de tickets al textarea para poder editarla
  const loadCurrentIntoInput = () => {
    if (!tickets || tickets.length === 0) {
      toast('La lista está vacía; pega los participantes para crearla.', 'info')
      setInput('')
      return
    }
    setInput(
      tickets
        .map((t) => `${t.username} ${t.quantity}`)
        .sort((a, b) => a.localeCompare(b, 'es'))
        .join('\n')
    )
    toast('Lista actual cargada en el editor.', 'info')
  }

  // Sincroniza los tickets del textarea con la base de datos (upsert masivo)
  const syncTickets = async () => {
    const parsed = parseTicketInput(input)
    if (parsed.length === 0) {
      toast('No se detectaron líneas válidas (formato: Nombre Cantidad)', 'error')
      return
    }
    const ignored = input
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean).length - parsed.length

    setSyncing(true)
    const { error } = await supabase.from('tickets').upsert(
      parsed.map((p) => ({ username: p.username, quantity: p.quantity })),
      { onConflict: 'username' }
    )
    setSyncing(false)

    if (error) {
      toast('Error al sincronizar tickets: ' + error.message, 'error')
      return
    }
    toast(`Tickets sincronizados (${parsed.length} participantes)`, 'success')
    if (ignored > 0) toast(`${ignored} línea(s) sin formato válido`, 'info')
    setInput('')
    loadTickets()
  }

  // Inserta una lista NUEVA reemplazando todos los datos anteriores
  const replaceTickets = async () => {
    const parsed = parseTicketInput(input)
    if (parsed.length === 0) {
      toast('No se detectaron líneas válidas (formato: Nombre Cantidad)', 'error')
      return
    }
    if (!window.confirm(`¿Reemplazar TODOS los tickets por la nueva lista (${parsed.length} participantes)?`))
      return

    setSyncing(true)
    const { error: delErr } = await supabase
      .from('tickets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    const { error: insErr } = await supabase.from('tickets').insert(
      parsed.map((p) => ({ username: p.username, quantity: p.quantity }))
    )
    setSyncing(false)

    if (delErr || insErr) {
      toast('Error al reemplazar tickets', 'error')
      return
    }
    toast(`Lista reemplazada: ${parsed.length} participantes`, 'success')
    setInput('')
    loadTickets()
  }

  // Limpia todos los tickets y resultados (nuevo sorteo)
  const clearTickets = async () => {
    if (!window.confirm('¿Vaciar tickets y resultados? Se eliminará también el historial de sorteos.')) return
    const { error: delTickets } = await supabase
      .from('tickets')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    const { error: delDraws } = await supabase.from('draws').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (delTickets || delDraws) {
      toast('Error al vaciar', 'error')
      return
    }
    toast('Tabla de tickets y resultados vaciada', 'info')
    loadTickets()
    loadHistory()
  }

  // Genera el sorteo ponderado
  const runDraw = async () => {
    if (!tickets || tickets.length === 0) {
      toast('Primero sincroniza tickets', 'error')
      return
    }
    setDrawing(true)
    await new Promise((r) => setTimeout(r, 600))
    const selected = weightedDraw(tickets, 3)
    setWinners(selected)
    setDrawInfo({ totalBalls })

    // Guarda el historial del sorteo
    await supabase.from('draws').insert({
      winners: selected,
      total_balls: totalBalls,
    })
    setDrawing(false)
    loadHistory()
  }

  return (
    <div>
      <PageHeader
        title="Sorteos"
        subtitle={
          isAdmin
            ? 'Gestiona los tickets y ejecuta el sorteo ponderado (3 ganadores).'
            : 'Consulta los ganadores del sorteo y los tickets de cada participante.'
        }
        icon={Trophy}
      />

      {/* ── Gestión (solo admin / super-admin) ── */}
      {isAdmin && (
        <div className="mb-6 rounded-2xl border border-edge bg-elevated p-5">
          <h3 className="mb-1 flex items-center gap-2 font-display font-bold text-text">
            <Ticket size={18} className="text-primary" />
            Entrada de tickets
          </h3>
          <p className="mb-3 text-xs text-soft">
            Pega una línea por participante con el formato:{' '}
            <code className="rounded bg-background px-1.5 py-0.5 font-bold text-secondary">
              Nombre Cantidad
            </code>{' '}
            — o pulsa <strong>Cargar actual</strong> para editar la lista ya insertada.
          </p>

          <textarea
            className="input min-h-[180px] font-mono text-base"
            placeholder={'Ramón 5\nSofia 3\nKarpadorPro 8\n...'}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />

          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={syncTickets} disabled={syncing} className="btn-primary flex-1">
              <RefreshCcw size={17} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Guardando...' : 'Sincronizar Tickets'}
            </button>
            <button onClick={loadCurrentIntoInput} className="btn-ghost">
              <Pencil size={16} />
              Cargar actual
            </button>
            <button onClick={replaceTickets} disabled={syncing} className="btn-ghost">
              <Download size={16} />
              Reemplazar todo
            </button>
            <button
              onClick={clearTickets}
              disabled={!tickets || tickets.length === 0}
              className="btn-ghost"
              title="Vaciar tickets y resultados"
            >
              <Trash2 size={16} />
              Vaciar
            </button>
          </div>

          {input.trim() && (
            <p className="mt-2 text-xs text-soft">
              {parseTicketInput(input).length} participantes detectados
              {' · '}
              {parseTicketInput(input).reduce((s, p) => s + p.quantity, 0)} boletas totales
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Columna izquierda: resultados (todos) ── */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-edge bg-elevated p-5">
            <h3 className="mb-4 flex items-center gap-2 font-display font-bold text-text">
              <Trophy size={18} className="text-secondary" />
              Ganadores del sorteo
            </h3>

            {lastDraw ? (
              <>
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 p-4 text-center">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-soft">
                    {new Date(lastDraw.created_at).toLocaleString('es-ES', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                    {' · '}
                    {lastDraw.total_balls} boletas
                  </p>
                  <p className="font-display text-lg font-extrabold text-text">
                    {lastDraw.winners.join('  🏆  ')}
                  </p>
                </div>

                <div className="mt-3 border-t border-edge pt-3">
                  <PostActions
                    parentType="raffle"
                    parentId={lastDraw.id}
                    shareRoute="/sorteos"
                    shareParam="raffle"
                    shareText={`Sorteo del clan SpFc/Gd — Ganadores: ${lastDraw.winners.join(', ')}`}
                  />
                </div>

                {history.length > 1 && (
                  <div className="mt-5">
                    <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-text">
                      <History size={14} className="text-soft" />
                      Sorteos anteriores
                    </p>
                    <ul className="space-y-2">
                      {history.slice(1).map((d) => (
                        <li key={d.id} className="rounded-xl bg-background p-3 text-xs">
                          <p className="mb-1 text-soft">
                            {new Date(d.created_at).toLocaleString('es-ES', {
                              day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                            })}{' '}
                            · {d.total_balls} boletas
                          </p>
                          <p className="font-semibold text-text">{d.winners.join('  🏆  ')}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                title="Aún no hay ganadores"
                hint="Cuando el staff realice el sorteo, los ganadores aparecerán aquí."
                icon={Trophy}
              />
            )}
          </div>
        </div>

        {/* ── Columna derecha: tickets (todos) ── */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-edge bg-elevated p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-display font-bold text-text">
                <Sparkles size={18} className="text-secondary" />
                Boletas por participante
                <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-bold text-secondary">
                  {totalBalls} total
                </span>
              </h3>
              {isAdmin && (
                <button onClick={runDraw} disabled={drawing || totalBalls === 0} className="btn-secondary">
                  <Trophy size={17} />
                  {drawing ? 'Generando...' : 'Generar Sorteo'}
                </button>
              )}
            </div>

            {!tickets ? (
              <Spinner label="Cargando tickets..." />
            ) : tickets.length === 0 ? (
              <EmptyState
                title="Sin tickets"
                hint={
                  isAdmin
                    ? 'Pega los participantes en el editor y pulsa Sincronizar Tickets.'
                    : 'El staff aún no ha cargado los tickets del sorteo.'
                }
                icon={Ticket}
              />
            ) : (
              <ul className="max-h-[420px] divide-y divide-edge overflow-y-auto">
                {tickets.map((t, i) => (
                  <motion.li
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="flex items-center gap-3 px-2 py-2.5"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/10 text-sm font-extrabold text-secondary">
                      {i + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate font-semibold text-text">{t.username}</p>
                    <div className="flex items-center gap-1">
                      <div className="flex gap-1">
                        {Array.from({ length: Math.min(t.quantity, 8) }).map((_, k) => (
                          <span key={k} className="h-2.5 w-2.5 rounded-sm bg-secondary/50" />
                        ))}
                      </div>
                      <span className="ml-2 font-display text-lg font-extrabold text-text">
                        {t.quantity}
                      </span>
                      <span className="text-xs text-soft">tickets</span>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-3 text-xs text-soft">
            Cada ticket equivale a una boleta en el sorteo: a más tickets, más probabilidad. Se
            eligen 3 ganadores distintos.
          </p>
        </div>
      </div>

      {/* Revelado de ganadores con confetti */}
      {winners && (
        <WinnerReveal
          winners={winners}
          totalBalls={drawInfo.totalBalls}
          onClose={() => setWinners(null)}
        />
      )}
    </div>
  )
}
