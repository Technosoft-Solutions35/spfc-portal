import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  History,
  RefreshCcw,
  Sparkles,
  Ticket,
  Trophy,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import WinnerReveal from '../components/RaffleDraw/WinnerReveal'

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
 * Panel de Sorteos — EXCLUSIVO de administradores.
 * Carga masiva de tickets (texto plano), visualización ordenada
 * y ejecución del sorteo ponderado con 3 ganadores.
 */
export default function Raffles() {
  const { toast } = useToast()

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
    // Suscripción en tiempo real para que la tabla se actualice sola
    const channel = supabase
      .channel('tickets-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, loadTickets)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

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

  // Limpia todos los tickets (nuevo sorteo)
  const clearTickets = async () => {
    const { error } = await supabase.from('tickets').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    if (!error) {
      toast('Tabla de tickets vaciada', 'info')
      loadTickets()
    }
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
        title="Panel de Sorteos"
        subtitle="Carga masiva de tickets y ejecución del sorteo ponderado (exclusivo admin)."
        icon={Trophy}
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Columna izquierda: entrada de texto masiva ── */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-edge bg-elevated p-5">
            <h3 className="mb-1 flex items-center gap-2 font-display font-bold text-text">
              <Ticket size={18} className="text-primary" />
              Entrada de tickets
            </h3>
            <p className="mb-3 text-xs text-soft">
              Pega una línea por participante con el formato:{' '}
              <code className="rounded bg-background px-1.5 py-0.5 font-bold text-secondary">
                Nombre Cantidad
              </code>
            </p>

            <textarea
              className="input min-h-[180px] font-mono text-sm"
              placeholder={'Ramón 5\nSofia 3\nKarpadorPro 8\n...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={syncTickets}
                disabled={syncing}
                className="btn-primary flex-1"
              >
                <RefreshCcw size={17} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Sincronizando...' : 'Sincronizar Tickets'}
              </button>
              <button
                onClick={clearTickets}
                disabled={!tickets || tickets.length === 0}
                className="btn-ghost"
                title="Vaciar todos los tickets"
              >
                <AlertTriangle size={17} />
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

          {/* Historial de sorteos */}
          {history.length > 0 && (
            <div className="mt-5 rounded-2xl border border-edge bg-elevated p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-text">
                <History size={17} className="text-secondary" />
                Últimos sorteos
              </h3>
              <ul className="space-y-2">
                {history.map((d) => (
                  <li key={d.id} className="rounded-xl bg-background p-3 text-xs">
                    <p className="mb-1 text-soft">
                      {new Date(d.created_at).toLocaleString('es-ES', {
                        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}{' '}
                      · {d.total_balls} boletas
                    </p>
                    <p className="font-semibold text-text">
                      {d.winners.join('  🏆  ')}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Columna derecha: tabla de tickets + sorteo ── */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-edge bg-elevated p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-display font-bold text-text">
                <Sparkles size={18} className="text-secondary" />
                Boletas en la urna
                <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-bold text-secondary">
                  {totalBalls} total
                </span>
              </h3>
              <button onClick={runDraw} disabled={drawing || totalBalls === 0} className="btn-secondary">
                <Trophy size={17} />
                {drawing ? 'Generando...' : 'Generar Sorteo'}
              </button>
            </div>

            {!tickets ? (
              <Spinner label="Cargando tickets..." />
            ) : tickets.length === 0 ? (
              <EmptyState
                title="Sin tickets"
                hint="Pega los participantes en el textarea y pulsa Sincronizar Tickets."
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
            El algoritmo de la urna virtual da más probabilidad a quien más tickets tenga:
            cada ticket equivale a una boleta en el sorteo. Se eligen 3 ganadores distintos.
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
