import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus, Upload, Download, Copy, Trash2, Pencil, ArrowLeft, ArrowRight,
  X, Save, FolderOpen, ChevronDown, ImagePlus,
} from 'lucide-react'
import { Generations, Pokemon } from '../lib/pokecalc'
import { T, toID, normalize, natureEs, statEsFull } from '../lib/pokecalc/es.js'
import {
  STATS, emptyPokemon, lineSetSplit, parseOneSet, exportTeamPaste,
} from '../lib/teamFormat.js'
import DEXNUM from '../lib/pokecalc/data/gen5-dexnum.js'
import ABIL_SET from '../lib/pokecalc/data/gen5-abilities.js'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/ui/PageHeader'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import Spinner from '../components/ui/Spinner'
import { buildTeamPng, dexIdFor } from '../lib/teamImage'

/**
 * DLC 11 — Team Builder (Creador de Equipos estilo PokeMMO Showdown).
 * Grúa de 6 Pokémon con configuración completa, import/export de pastes,
 * vista de Paste a pantalla grande, PNG vertical y guardado por perfil.
 */

const GEN = Generations.get(5)

// Habilidades por especie con claves normalizadas al id del motor (toID).
const ABIL_BY_TOID = {}
for (const k in ABIL_SET) ABIL_BY_TOID[toID(k)] = ABIL_SET[k]

// Sprites animados de Play Showdown para el DOM (mismo fix de la calculadora).
const SPRITE_IDS = {
  'ho-oh': 'hooh',
  'nidoran-m': 'nidoranm',
  'basculin-blue-striped': 'basculin-bluestriped',
}
const spriteUrl = (species) =>
  `https://play.pokemonshowdown.com/sprites/xyani/${SPRITE_IDS[species.toLowerCase()] || species.toLowerCase()}.gif`

const LOCAL_KEY = 'spfc_teambuilder_team'
const LOCAL_NAME = 'spfc_teambuilder_name'

// --- Opciones desde el motor (especies / objetos / movimientos) ----------
function buildOptions() {
  const species = []
  for (const s of GEN.species) {
    try {
      new Pokemon(GEN, s.name, { level: 50, nature: 'Serious' })
      species.push(s.name)
    } catch { /* no construible en Gen 5 */ }
  }
  const items = []
  for (const i of GEN.items) items.push(i.name)
  const moves = []
  for (const m of GEN.moves) moves.push(m.name)
  return { species, items, moves }
}

function listAbilities(speciesName) {
  const id = toID(speciesName)
  const fromData = ABIL_BY_TOID[id] || []
  const spec = GEN.species.get(id)
  const engineAb = spec ? Object.values(spec.abilities || {}).filter(Boolean) : []
  return [...new Set([...engineAb, ...fromData])]
}

// Normaliza los nombres de un Pokémon importado a la capitalización oficial del
// motor (englishName devuelve toIDs): Garchomp -> "Garchomp", Life Orb, etc.
function resolveEngine(p) {
  const sp = GEN.species.get(toID(p.species))
  const species = sp?.name || p.species
  const it = GEN.items.get(toID(p.item))
  const ability = listAbilities(species).find((a) => toID(a) === toID(p.ability)) || p.ability
  const moves = p.moves.map((m) => (m ? GEN.moves.get(toID(m))?.name || m : ''))
  return { ...p, species, item: it?.name || p.item, ability, moves }
}

function statEffects(nature) {
  if (!nature) return { up: null, down: null }
  const n = GEN.natures.get(toID(nature))
  if (!n) return { up: null, down: null }
  return { up: n.plus || null, down: n.minus || null }
}

function natureTooltip(nature) {
  const { up, down } = statEffects(nature)
  const seg = []
  if (up) seg.push(`+${statEsFull(up)}`)
  if (down) seg.push(`-${statEsFull(down)}`)
  return `${natureEs(nature)}${seg.length ? ' (' + seg.join(', ') + ')' : ''}`
}

function computeStats(p) {
  try {
    const mon = new Pokemon(GEN, p.species, {
      level: p.level || 50,
      nature: p.nature || 'Serious',
      ivs: p.ivs,
      evs: p.evs,
    })
    return mon.stats
  } catch {
    return null
  }
}

// --- Estado inicial de un Pokémon ----------------------------------------
// (emptyPokemon viene de teamFormat)

const NATURE_NAMES = [...GEN.natures].map((n) => n.name)

// Decorar para el PNG (todos los campos legibles).
function decorate(p) {
  const stats = computeStats(p)
  const movesMap = {}
  for (const m of p.moves) if (m) movesMap[m] = T(m, 'move')
  return {
    ...p,
    _spriteId: dexIdFor(p.species),
    _esName: T(p.species, 'species') || p.species,
    _esNature: natureEs(p.nature) || 'Serious',
    _esItem: T(p.item, 'item'),
    _esAbility: T(p.ability, 'ability'),
    _esMovesMap: movesMap,
    _stats: stats && {
      hp: stats.hp, atk: stats.atk, def: stats.def,
      spa: stats.spa, spd: stats.spd, spe: stats.spe,
    },
  }
}

// --- Combobox reutilizable (idéntico al de la calculadora) --------------
function Combo({ label, value, options, onPick, placeholder = 'Escribir o elegir…', kind }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) setQ(value ? T(value, kind) : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const display = open ? q : value ? T(value, kind) : ''
  const ql = normalize(q)
  const filtered = useMemo(() => {
    if (!ql) return options.slice(0, 40)
    return options
      .filter((o) => normalize(T(o, kind)).includes(ql) || normalize(o).includes(ql))
      .slice(0, 60)
  }, [ql, kind, options])

  const pick = (name) => { setOpen(false); onPick(name) }

  return (
    <div className="relative">
      <label className="label">{label}</label>
      <div className="relative">
        <input
          className="input pr-9"
          value={display}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          autoComplete="off"
        />
        <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-soft" />
      </div>
      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-edge bg-elevated shadow-card">
          {filtered.length === 0 && <div className="px-3 py-2 text-sm text-soft">Sin coincidencias</div>}
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(name)}
              className="block w-full truncate px-3 py-1.5 text-left text-sm text-text transition hover:bg-primary/10"
            >
              {T(name, kind)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// --- Parseo de un paste de Showdown (múltiples sets) ---------------------
// (lineSetSplit / parseOneSet vienen de teamFormat.js)

// --- Componente principal ----------------------------------------------
export default function TeamBuilder() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const opts = useMemo(() => buildOptions(), [])

  const [slots, setSlots] = useState(Array(6).fill(null))
  const [teamName, setTeamName] = useState('Mi equipo')
  const [selected, setSelected] = useState(0) // índice del Pokémon en edición
  const [draft, setDraft] = useState(() => emptyPokemon()) // borrador: lo que se está configurando
  const [showPick, setShowPick] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importMsg, setImportMsg] = useState(null)
  const [showPaste, setShowPaste] = useState(false)
  const [pasteAt, setPasteAt] = useState(null) // moment en el que se generó
  const [savedTeams, setSavedTeams] = useState(null)
  const [showLibrary, setShowLibrary] = useState(false)
  const [dragIndex, setDragIndex] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  // localStorage: el equipo vivo sobrevive a la recarga
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEY)
      if (raw) {
        const arr = JSON.parse(raw)
        if (Array.isArray(arr) && arr.length === 6) {
          // Sanea slots corruptos (species inválida / draft vacío guardado por bugs previos):
          // los slots con especie inexistente se limpian para que el cálculo de stats no falle.
          setSlots(arr.map((s) =>
            (s && GEN.species.get(toID(s.species)))
              ? { ...emptyPokemon(), ...s }
              : null
          ))
        }
      }
      const nm = localStorage.getItem(LOCAL_NAME)
      if (nm) setTeamName(nm)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(slots))
      localStorage.setItem(LOCAL_NAME, teamName)
    } catch { /* ignore */ }
  }, [slots, teamName])

  const editing = draft

  const setField = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const setMove = (i, name) => {
    setDraft((d) => ({ ...d, moves: d.moves.map((m, idx) => (idx === i ? name : m)) }))
  }

  const loadSlot = (idx) => {
    setSelected(idx)
    setDraft(slots[idx] ? { ...slots[idx] } : emptyPokemon())
  }

  const addToTeam = () => {
    if (!editing.species) { toast('Elige un Pokémon primero', 'error'); return }
    const idx = slots.findIndex((s) => !s)
    if (idx === -1) { toast('El equipo ya está lleno (máximo 6)', 'error'); return }
    const added = { ...editing }
    setSlots((prev) => { const n = [...prev]; n[idx] = added; return n })
    setDraft(added)
    setSelected(idx)
    setShowPick(false)
    toast(`${T(editing.species, 'species') || editing.species} añadido al equipo`, 'success')
  }

  const saveEdits = () => {
    if (!editing.species) { toast('Configura un Pokémon primero', 'info'); return }
    setSlots((prev) => { const n = [...prev]; n[selected] = { ...editing }; return n })
    toast('Cambios guardados', 'success')
  }

  const removeSlot = (idx) => {
    setConfirmDel(idx)
  }

  const doRemove = () => {
    if (confirmDel === null) return
    setSlots((prev) => { const n = [...prev]; n[confirmDel] = null; return n })
    toast('Pokémon eliminado del equipo', 'info')
    setConfirmDel(null)
  }

  const moveSlot = (idx, dir) => {
    const to = idx + dir
    if (to < 0 || to > 5) return
    setSlots((prev) => {
      const n = [...prev]
      if (!n[to]) { n[to] = n[idx]; n[idx] = null; return n }
      ;[n[idx], n[to]] = [n[to], n[idx]]
      return n
    })
  }

  const clearTeam = () => {
    if (!window.confirm('¿Vaciar el equipo completo?')) return
    setSlots(Array(6).fill(null))
    toast('Equipo vaciado', 'info')
  }

  // ── Import / Export ──
  const exportPaste = () => exportTeamPaste(slots, teamName)

  const doExport = async () => {
    const text = exportPaste()
    if (!slots.some(Boolean)) { toast('El equipo está vacío', 'error'); return }
    try {
      await navigator.clipboard.writeText(text)
      toast('Equipo copiado al portapapeles', 'success')
    } catch {
      toast('No se pudo copiar', 'error')
    }
  }

  const doImport = () => {
    setImportMsg(null)
    try {
      const blocks = lineSetSplit(importText)
      if (!blocks.length) throw new Error('No se pegó ningún texto.')
      const parsed = blocks.map((b) => resolveEngine(parseOneSet(b.split('\n').map((l) => l.trim()).filter(Boolean))))
      if (parsed.length > 6) throw new Error(`El paste tiene ${parsed.length} Pokémon (máximo 6).`)
      const next = Array(6).fill(null)
      parsed.forEach((p, i) => { next[i] = p })
      setSlots(next)
      setShowImport(false)
      setImportText('')
      toast(`Equipo importado (${parsed.length} Pokémon)`, 'success')
    } catch (e) {
      setImportMsg(e.message || 'No se pudo interpretar el equipo.')
    }
  }

  // ── Crear Paste (modal grande) ──
  const openPaste = () => {
    if (!slots.some(Boolean)) { toast('El equipo está vacío', 'error'); return }
    setPasteAt(new Date())
    setShowPaste(true)
  }

  const nowLabel = () =>
    pasteAt
      ? pasteAt.toLocaleString('es-ES', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : ''

  const accountName = profile?.username || 'Miembro del clan'

  const saveAsImage = async () => {
    const team = slots.filter(Boolean).map(decorate)
    if (!team.length) return
    try {
      await buildTeamPng({
        name: teamName,
        account: accountName,
        when: nowLabel(),
        team,
      })
      toast('Imagen descargada correctamente', 'success')
    } catch (e) {
      toast(e?.message || 'No se pudo generar la imagen', 'error')
    }
  }

  // ── Biblioteca guardada (Supabase) ──
  const loadLibrary = async () => {
    if (!user) return
    setSavedTeams(null)
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('author_id', user.id)
      .order('updated_at', { ascending: false })
    if (error) { toast('No se pudieron cargar tus equipos', 'error'); setSavedTeams([]); return }
    setSavedTeams(data || [])
  }

  const openLibrary = async () => {
    setShowLibrary(true)
    await loadLibrary()
  }

  const saveTeam = async () => {
    if (!slots.some(Boolean)) { toast('El equipo está vacío', 'error'); return }
    const { error } = await supabase.from('teams').insert({
      author_id: user.id,
      name: teamName || 'Equipo sin nombre',
      pokemon: slots,
    })
    if (error) { toast('No se pudo guardar el equipo', 'error'); return }
    toast('Equipo guardado en tu perfil', 'success')
  }

  const openSaved = (t) => {
    const arr = Array.isArray(t.pokemon) && t.pokemon.length === 6 ? t.pokemon : Array(6).fill(null)
    setSlots(arr.map((p) => (p ? { ...emptyPokemon(), ...p } : null)))
    setTeamName(t.name)
    setShowLibrary(false)
    toast('Equipo cargado', 'success')
  }

  const deleteSaved = async (t) => {
    if (!window.confirm('¿Eliminar este equipo guardado?')) return
    const { error } = await supabase.from('teams').delete().eq('id', t.id)
    if (error) { toast('No se pudo eliminar', 'error'); return }
    toast('Equipo eliminado', 'info')
    loadLibrary()
  }

  const evTotal = STATS.reduce((a, s) => a + (editing.evs[s] || 0), 0)
  const ivsLabel = (s) => (editing.ivs[s] ?? 31) !== 31 ? ` (${editing.ivs[s]})` : ''

  return (
    <div>
      <PageHeader
        title="Creador de Equipos"
        subtitle="Team Builder estilo PokeMMO Showdown. Arma tu equipo de 6 y exporta el paste o guárdalo en tu perfil."
        icon={Plus}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={openLibrary} className="btn-ghost"><FolderOpen size={16} /> Mis equipos</button>
            <button onClick={saveTeam} className="btn-primary"><Save size={16} /> Guardar equipo</button>
          </div>
        }
      />

      {/* Nombre del equipo */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <label className="label mb-0">Nombre del equipo</label>
        <input
          className="input max-w-xs"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Mi equipo"
        />
      </div>

      {/* Grúa de equipo */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {slots.map((p, idx) => (
          <motion.div
            key={idx}
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            draggable
            onDragStart={() => setDragIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex === null || dragIndex === idx) return
              moveSlot(dragIndex, idx > dragIndex ? Math.min(5, idx) : idx)
              setDragIndex(null)
            }}
            onDragEnd={() => setDragIndex(null)}
            onClick={() => loadSlot(idx)}
            className={`group relative flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border p-3 text-center transition ${
              selected === idx ? 'border-primary bg-primary/10' : 'border-edge bg-elevated hover:border-primary/40'
            }`}
          >
            <span className="absolute left-2 top-2 text-xs font-bold text-soft">#{idx + 1}</span>
            {p ? (
              <>
                <img src={spriteUrl(p.species)} alt={p.species} className="h-16 w-16 object-contain"
                  onError={(e) => (e.currentTarget.style.display = 'none')} />
                <span className="mt-1 w-full truncate text-sm font-bold text-text">{T(p.species, 'species') || p.species}</span>
                <span className="text-[10px] text-soft">Nv. {p.level}</span>
                {/* Acciones de slot */}
                <div className="mt-1.5 flex items-center gap-1 opacity-60 transition group-hover:opacity-100">
                  <button
                    onClick={(e) => { e.stopPropagation(); loadSlot(idx); setShowPick(true) }}
                    className="rounded-md p-1 text-soft transition hover:bg-primary/15 hover:text-primary"
                    title="Editar"
                  ><Pencil size={14} /></button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSlot(idx, -1) }}
                    disabled={idx === 0}
                    className="rounded-md p-1 text-soft transition hover:bg-secondary/15 hover:text-secondary disabled:opacity-30"
                    title="Mover antes"
                  ><ArrowLeft size={14} /></button>
                  <button
                    onClick={(e) => { e.stopPropagation(); moveSlot(idx, 1) }}
                    disabled={idx === 5}
                    className="rounded-md p-1 text-soft transition hover:bg-secondary/15 hover:text-secondary disabled:opacity-30"
                    title="Mover después"
                  ><ArrowRight size={14} /></button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeSlot(idx) }}
                    className="rounded-md p-1 text-soft transition hover:bg-primary/15 hover:text-primary"
                    title="Eliminar"
                  ><Trash2 size={14} /></button>
                </div>
              </>
            ) : (
              <>
                <span className="text-3xl text-soft/40">＋</span>
                <span className="text-xs text-soft">Vacío</span>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {/* Barra de acciones */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <button onClick={() => { setDraft(emptyPokemon()); setShowPick(true) }} className="btn-primary"><Plus size={16} /> Añadir Pokémon</button>
        <button onClick={() => setShowImport(true)} className="btn-secondary"><Upload size={16} /> Importar equipo</button>
        <button onClick={doExport} className="btn-ghost"><Copy size={16} /> Exportar</button>
        <button onClick={openPaste} className="btn-ghost"><ImagePlus size={16} /> Crear Paste del equipo</button>
        <button onClick={clearTeam} className="btn-ghost"><Trash2 size={16} /> Cerrar / Clear</button>
      </div>

      {/* Panel de configuración del Pokémon seleccionado */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="app-card rounded-2xl p-5">
          <h3 className="mb-1 font-display text-lg font-extrabold text-text">
            {editing.species ? (T(editing.species, 'species') || editing.species) : 'Configura tu Pokémon'}
          </h3>
          <p className="mb-4 text-xs text-soft">
            {editing.species
              ? `Nivel ${editing.level} · ${natureTooltip(editing.nature)}`
              : 'Usa "Añadir Pokémon" para empezar.'}
          </p>

          <div className="mt-1 grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nivel</label>
              <input
                type="number" min={1} max={100} className="input"
                value={editing.level}
                onChange={(e) => setField({ level: Math.max(1, Math.min(100, +e.target.value || 1)) })}
              />
            </div>
            <div>
              <label className="label">Naturaleza</label>
              <select
                className="input"
                value={editing.nature}
                onChange={(e) => setField({ nature: e.target.value })}
              >
                {NATURE_NAMES.map((n) => (
                  <option key={n} value={n}>{natureTooltip(n)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-3">
            <Combo
              label="Habilidad"
              kind="ability"
              value={editing.ability}
              options={listAbilities(editing.species)}
              onPick={(name) => setField({ ability: name })}
              placeholder="Sin habilidad…"
            />
          </div>
          <div className="mt-3">
            <Combo
              label="Objeto"
              kind="item"
              value={editing.item}
              options={opts.items}
              onPick={(name) => setField({ item: name })}
              placeholder="Sin objeto…"
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <Combo
                key={i}
                label={`Movimiento ${i + 1}`}
                kind="move"
                value={editing.moves[i]}
                options={opts.moves}
                onPick={(name) => setMove(i, name)}
                placeholder={i > 0 ? 'Opcional…' : 'Elige…'}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={addToTeam} className="btn-secondary"><Plus size={16} /> Guardar en slot vacío</button>
            <button onClick={saveEdits} className="btn-ghost"><Save size={16} /> Guardar cambios</button>
          </div>
        </div>

        {/* EVs / IVs / Stats + paste en vivo */}
        <div className="flex flex-col gap-5">
          <div className="app-card rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-extrabold text-text">EVs y stats</h3>
              <span className={`text-sm font-bold ${evTotal > 510 ? 'text-primary' : 'text-soft'}`}>
                EVs usados: {evTotal}/510
              </span>
            </div>
            {STATS.map((s) => {
              const v = editing.evs[s] || 0
              const over = v > 252
              const stats = computeStats(editing)
              return (
                <div key={s} className="mb-2 flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm font-medium text-soft">{statEsFull(s)}</span>
                  <input
                    type="number" inputMode="numeric" min={0} max={252} className="input w-20 px-3 py-1.5 text-center"
                    value={v || ''}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '')
                      setField({ evs: { ...editing.evs, [s]: Math.max(0, Math.min(252, +raw || 0)) } })
                    }}
                  />
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-elevated">
                    <div
                      className={`h-full rounded-full ${over ? 'bg-primary' : 'bg-secondary'}`}
                      style={{ width: `${Math.min(100, (v / 252) * 100)}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-sm font-bold text-success">
                    {stats ? stats[s] : '—'}
                  </span>
                </div>
              )
            })}
            {evTotal > 510 && (
              <p className="mt-1 text-xs font-semibold text-primary">EVs restantes: 0 — excediste el máximo de 510.</p>
            )}
          </div>

          <div className="app-card rounded-2xl p-5">
            <h3 className="mb-3 font-display text-lg font-extrabold text-text">IVs</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {STATS.map((s) => (
                <div key={s}>
                  <label className="label">{statEsFull(s)}{ivsLabel(s)}</label>
                  <input
                    type="number" inputMode="numeric" min={0} max={31} className="input px-3 py-1.5 text-center"
                    value={editing.ivs[s] ?? 31}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/^0+(?=\d)/, '')
                      setField({ ivs: { ...editing.ivs, [s]: Math.max(0, Math.min(31, +raw || 0)) } })
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="app-card rounded-2xl p-5">
            <h3 className="mb-2 font-display text-lg font-extrabold text-text">Paste en vivo</h3>
            {editing.species ? (
              <pre className="max-h-48 overflow-auto rounded-xl bg-background p-3 font-mono text-xs text-text">
                {exportPaste().split('\n\n').filter(Boolean)[0]}
              </pre>
            ) : (
              <p className="text-sm text-soft">Selecciona o añade un Pokémon para ver su set en formato Showdown.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal: añadir / elegir especie */}
      <Modal open={showPick} onClose={() => setShowPick(false)} title="Añadir Pokémon" maxWidth="max-w-xl">
        <p className="mb-3 text-xs text-soft">
          Busca por nombre en español y toca para configurarlo. Luego pulsa "Añadir al equipo".
        </p>
        <Combo
          label="Especie"
          kind="species"
          value={editing.species}
          options={opts.species}
          onPick={(name) => setField({ species: name, ability: '', moves: ['', '', '', ''] })}
        />
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setShowPick(false)} className="btn-ghost">Cancelar</button>
          <button onClick={addToTeam} className="btn-primary"><Plus size={16} /> Añadir al equipo</button>
        </div>
      </Modal>

      {/* Modal: importar equipo */}
      <Modal open={showImport} onClose={() => setShowImport(false)} title="Importar equipo (Paste)" maxWidth="max-w-xl">
        <p className="mb-2 text-xs text-soft">
          Pega hasta 6 bloques de Pokémon en formato Showdown. Cada bloque separado por una línea en blanco.
        </p>
        <textarea
          className="input h-64 font-mono text-xs"
          placeholder={
            '=== [gen5] Mi equipo ===\n\nGarchomp @ Life Orb\nAbility: Rough Skin\nLevel: 50\nJolly Nature\n- Swords Dance\n- Earthquake\n...'
          }
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        {importMsg && <p className="mt-2 text-sm font-semibold text-primary">{importMsg}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={() => setShowImport(false)} className="btn-ghost">Cancelar</button>
          <button onClick={doImport} className="btn-primary"><Upload size={16} /> Importar</button>
        </div>
      </Modal>

      {/* Modal: crear paste (vista grande) */}
      <Modal open={showPaste} onClose={() => setShowPaste(false)} title="Paste del equipo" maxWidth="max-w-3xl">
        <div className="mb-4 rounded-xl border border-edge bg-elevated p-4">
          <h3 className="font-display text-xl font-extrabold text-text">{teamName}</h3>
          <p className="mt-1 text-xs text-soft">Cuenta: {accountName}</p>
          <p className="text-xs text-soft">{nowLabel()}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {slots.map((p, i) =>
            p ? (
              <div key={i} className="rounded-xl border border-edge bg-background p-3">
                <div className="flex items-center gap-3">
                  <img src={spriteUrl(p.species)} alt={p.species} className="h-12 w-12 object-contain"
                    onError={(e) => (e.currentTarget.style.display = 'none')} />
                  <div>
                    <span className="text-sm font-extrabold text-text">{T(p.species, 'species') || p.species}</span>
                    <span className="block text-[11px] text-soft">Nivel {p.level} · {natureEs(p.nature)}</span>
                  </div>
                </div>
                <div className="mt-2 space-y-0.5 text-[11px] text-soft">
                  <p>Objeto: {T(p.item, 'item') || '—'} · Habilidad: {T(p.ability, 'ability') || '—'}</p>
                  {p.moves.filter(Boolean).length > 0 && (
                    <p className="text-text">{p.moves.filter(Boolean).map((m) => T(m, 'move')).join(' · ')}</p>
                  )}
                </div>
              </div>
            ) : null,
          )}
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={() => setShowPaste(false)} className="btn-ghost">Cerrar</button>
          <button onClick={saveAsImage} className="btn-primary"><ImagePlus size={16} /> Guardar build como imagen</button>
        </div>
      </Modal>

      {/* Modal: biblioteca de equipos guardados */}
      <Modal open={showLibrary} onClose={() => setShowLibrary(false)} title="Mis equipos guardados" maxWidth="max-w-2xl">
        {savedTeams === null ? (
          <Spinner label="Cargando tus equipos..." />
        ) : savedTeams.length === 0 ? (
          <EmptyState title="Aún no tienes equipos guardados" hint="Arma un equipo y pulsa 'Guardar equipo'." icon={FolderOpen} />
        ) : (
          <div className="space-y-2">
            {savedTeams.map((t) => {
              const count = (t.pokemon || []).filter(Boolean).length
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-edge bg-background p-3">
                  <div className="flex flex-1 items-center gap-2 overflow-hidden">
                    <span className="font-display text-sm font-bold text-text">{t.name || 'Equipo sin nombre'}</span>
                    <span className="shrink-0 rounded-full bg-secondary/15 px-2 py-0.5 text-[10px] font-bold text-secondary">
                      {count}/6
                    </span>
                  </div>
                  <button onClick={() => openSaved(t)} className="btn-ghost px-3 py-1.5 text-xs"><FolderOpen size={14} /> Abrir</button>
                  <button onClick={() => deleteSaved(t)} className="btn-ghost px-3 py-1.5 text-xs"><Trash2 size={14} /> Eliminar</button>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      {/* Confirmar eliminación de slot */}
      {confirmDel !== null && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4" onClick={() => setConfirmDel(null)}>
          <div className="app-card w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 font-display text-lg font-extrabold text-text">¿Eliminar a {T(slots[confirmDel]?.species, 'species') || 'este Pokémon'}?</h3>
            <p className="mb-4 text-sm text-soft">Se quitará del equipo. No se borrará ningún otro dato.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDel(null)} className="btn-ghost">Cancelar</button>
              <button onClick={doRemove} className="btn-primary"><Trash2 size={16} /> Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
