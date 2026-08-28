import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Calculator, RotateCcw, Swords } from 'lucide-react'
import PageHeader from '../components/ui/PageHeader'
import { Generations, Pokemon, Move, Field, Side, calculate } from '../lib/pokecalc'
import { T, toID, normalize, natureEs, statEsFull } from '../lib/pokecalc/es.js'
import SETDEX_BW from '../lib/pokecalc/data/gen5-presets.js'
import GEN5_TIERS from '../lib/pokecalc/data/gen5-tiers.js'

/**
 * Calculadora de Daño PokeMMO (Gen 5).
 * Motor: fork mmoshowdown_damage_calc. Toda la interfaz en español y con los
 * nombres oficiales de la era Gen 5 (retro).
 */

const GEN = Generations.get(5)

const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

const NATURES = [...GEN.natures]
const WEATHERS = [
  ['', 'Sin clima'],
  ['Sun', 'Sol'],
  ['Rain', 'Lluvia'],
  ['Sand', 'Tormenta de arena'],
  ['Hail', 'Granizo'],
]
const TERRAINS = [
  ['', 'Sin terreno'],
  ['Electric', 'Eléctrico'],
  ['Grassy', 'Herboso'],
  ['Psychic', 'Psíquico'],
  ['Misty', 'Brumoso'],
]

// Sprites de Showdown (animados) indexados por el id del motor (toID).
const spriteUrl = (species) =>
  `https://play.pokemonshowdown.com/sprites/xyani/${toID(species)}.gif`

const TIER_LABELS = {
  LC: 'Little Cup', NFE: 'NFE', PU: 'PU', PUBL: 'PU BL', NU: 'NU', NUBL: 'NU BL',
  RU: 'RU', RUBL: 'RU BL', UU: 'UU', UUBL: 'UU BL', OU: 'OU', '(OU)': 'OU',
  Uber: 'Uber', Illegal: 'Ilegal',
}

const tierLabel = (t) => TIER_LABELS[t] || t

// Listas de especies / habilidades / objetos / movimientos disponibles en Gen 5.
// Solo se ofrecen especies que el motor puede construir en esta gen (descarta
// entradas rotas / post-Gen5 cuya tabla de stats no está definida aquí).
function buildOptions() {
  const species = []
  for (const s of GEN.species) {
    try {
      new Pokemon(GEN, s.name, { level: 50, nature: 'Serious' })
      species.push(s.name)
    } catch {
      /* especie no construible en Gen 5: se omite */
    }
  }
  const items = []
  for (const i of GEN.items) items.push(i.name)
  const moves = []
  for (const m of GEN.moves) moves.push(m.name)
  return { species, items, moves }
}

function listTypes(speciesName) {
  const spec = GEN.species.get(toID(speciesName))
  return spec ? spec.types : []
}

function listAbilities(speciesName) {
  const spec = GEN.species.get(toID(speciesName))
  if (!spec) return []
  return Object.values(spec.abilities || {}).filter(Boolean)
}

function defaultSide() {
  return {
    species: '',
    level: 50,
    nature: 'Serious',
    ability: '',
    item: '',
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves: ['', '', '', ''],
    boosts: {},
    status: '',
    curHP: null,
  }
}

const emptyField = () => ({
  weather: '',
  terrain: '',
  attacker: { sr: false, spikes: 0, reflect: false, lightScreen: false, isProtected: false, isSeeded: false },
  defender: { sr: false, spikes: 0, reflect: false, lightScreen: false, isProtected: false, isSeeded: false },
})

// ── Combobox reutilizable (búsqueda + lista) ────────────────────────────
function Combo({ label, value, options, onPick, placeholder = 'Escribir o elegir…' }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const listRef = useRef(null)

  // Al abrir, cargamos el valor actual como texto de edición.
  useEffect(() => {
    if (open) setQ(value || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const display = open ? q : T(value || '', comboKind(label))
  const ql = normalize(q)
  const kind = comboKind(label)
  const filtered = useMemo(() => {
    if (!ql) return options.slice(0, 50)
    return options
      .filter((o) => normalize(T(o, kind)).includes(ql) || normalize(o).includes(ql))
      .slice(0, 60)
  }, [ql, kind, options])

  const pick = (name) => {
    setOpen(false)
    onPick(name)
  }

  return (
    <div className="relative">
      <label className="label">{label}</label>
      <input
        className="input"
        value={display}
        placeholder={placeholder}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          // El usuario teclea: limpiamos la selección anterior salvo que coincida
          if (toID(e.target.value) !== toID(value)) onPick('')
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        autoComplete="off"
      />
      {open && (
        <div
          ref={listRef}
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-edge bg-elevated shadow-card"
        >
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-soft">Sin coincidencias</div>
          )}
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(name)}
              className="block w-full truncate px-3 py-1.5 text-left text-sm text-text transition hover:bg-primary/10"
            >
              {T(name, comboKind(label))}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function comboKind(label) {
  if (label === 'Especie') return 'species'
  if (label.startsWith('Movimiento')) return 'move'
  if (label === 'Habilidad') return 'ability'
  return 'item'
}

// ── Panel de un Pokémon (atacante o defensor) ───────────────────────────
function PokemonPanel({
  title, accent, side, speciesList, itemList, moveList, onChange,
  presets = null, onPreset,
}) {
  const [group, setGroup] = useState('')
  const types = listTypes(side.species)
  const tier = side.species ? GEN5_TIERS[toID(side.species)] : null

  const set = (patch) => onChange({ ...side, ...patch })

  return (
    <div className={`app-card p-5 ${accent}`}>
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Swords size={20} />
        </span>
        <div>
          <h3 className="font-display text-lg font-extrabold text-text">{title}</h3>
          <p className="text-xs text-soft">{tier ? `Tier: ${tierLabel(tier)}` : 'Elegí una especie'}</p>
        </div>
      </div>

      {/* Especie + sprite */}
      <div className="mb-4 flex gap-3">
        <div className="flex-1">
          <Combo
            label="Especie"
            value={side.species}
            options={speciesList}
            onPick={(name) => {
              const base = toID(name)
              const spec = GEN.species.get(base)
              const abilities = spec ? Object.values(spec.abilities || {}).filter(Boolean) : []
              const presetNames = (presets && presets[name]) ? Object.keys(presets[name]) : []
              set({
                species: name,
                ability: abilities[0] || '',
                moves: ['', '', '', ''],
              })
              if (presetNames.length) {
                setGroup(presetNames[0])
                onPreset(name, presetNames[0])
              } else {
                setGroup('')
              }
            }}
          />
        </div>
        {side.species && (
          <div className="flex flex-col items-center justify-end">
            <img
              src={spriteUrl(side.species)}
              alt={side.species}
              onError={(e) => (e.currentTarget.style.display = 'none')}
              className="h-16 w-16 object-contain"
            />
            <span className="text-[10px] text-soft">{T(side.species, 'species')}</span>
          </div>
        )}
      </div>

      {/* Tipos */}
      {types.length > 0 && (
        <div className="mb-4 flex gap-2">
          {types.map((t) => (
            <span key={t} className="rounded-full bg-secondary/15 px-3 py-0.5 text-xs font-bold text-secondary">
              {T(t, 'type')}
            </span>
          ))}
        </div>
      )}

      {/* Presets */}
      {presets && side.species && presets[side.species] && (
        <div className="mb-4">
          <label className="label">Preset</label>
          <select
            className="input"
            value={group}
            onChange={(e) => {
              const g = e.target.value
              setGroup(g)
              onPreset(side.species, g)
            }}
          >
            <option value="">Personalizado</option>
            {Object.keys(presets[side.species]).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      )}

      {/* Nivel / naturaleza / estado */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <label className="label">Nivel</label>
          <input
            type="number" min={1} max={100} className="input"
            value={side.level}
            onChange={(e) => set({ level: Math.max(1, Math.min(100, +e.target.value || 100)) })}
          />
        </div>
        <div>
          <label className="label">Naturaleza</label>
          <select
            className="input" value={side.nature}
            onChange={(e) => set({ nature: e.target.value })}
          >
            {NATURES.map((n) => (
              <option key={n.id} value={n.name}>{natureEs(n.name)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" value={side.status} onChange={(e) => set({ status: e.target.value })}>
            <option value="">Sano</option>
            <option value="brn">Quemado</option>
            <option value="par">Paralizado</option>
            <option value="slp">Dormido</option>
            <option value="psn">Envenenado</option>
            <option value="tox">Tóxico</option>
            <option value="frz">Congelado</option>
          </select>
        </div>
      </div>

      {/* Habilidad */}
      <div className="mb-4">
        <Combo
          key={`ab-${side.species}`}
          label="Habilidad"
          value={side.ability}
          options={listAbilities(side.species)}
          placeholder="Elegí primero una especie…"
          onPick={(name) => set({ ability: name })}
        />
      </div>

      {/* Objeto */}
      <div className="mb-4">
        <Combo
          label="Objeto"
          value={side.item}
          options={itemList}
          onPick={(name) => set({ item: name })}
        />
      </div>

      {/* IVs */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-semibold text-soft">IVs</label>
        <div className="grid grid-cols-3 gap-2">
          {STATS.map((s) => (
            <div key={s}>
              <label className="text-[10px] uppercase text-soft">{statEsFull(s)}</label>
              <input
                type="number" min={0} max={31} className="input py-1.5 text-sm"
                value={side.ivs[s] ?? 31}
                onChange={(e) => set({ ivs: { ...side.ivs, [s]: Math.max(0, Math.min(31, +e.target.value || 0)) } })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* EVs */}
      <div className="mb-4">
        <label className="mb-1.5 block text-sm font-semibold text-soft">EVs</label>
        <div className="grid grid-cols-3 gap-2">
          {STATS.map((s) => (
            <div key={s}>
              <label className="text-[10px] uppercase text-soft">{statEsFull(s)}</label>
              <input
                type="number" min={0} max={252} className="input py-1.5 text-sm"
                value={side.evs[s] ?? 0}
                onChange={(e) => set({ evs: { ...side.evs, [s]: Math.max(0, Math.min(252, +e.target.value || 0)) } })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Movimientos */}
      <div>
        <label className="mb-1.5 block text-sm font-semibold text-soft">Movimientos (máx. 4)</label>
        <div className="grid gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Combo
              key={`m-${i}-${side.species}`}
              label={`Movimiento ${i + 1}`}
              value={side.moves[i]}
              options={moveList}
              onPick={(name) => {
                const moves = [...side.moves]
                moves[i] = name
                set({ moves })
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Panel de campo ──────────────────────────────────────────────────────
function HazardRow({ label, value, onToggle, max = false }) {
  return (
    <button
      type="button" onClick={onToggle}
      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold transition ${
        value ? 'border-primary/50 bg-primary/10 text-primary' : 'border-edge text-soft hover:text-text'
      }`}
    >
      <span>{label}</span>
      <span>{max ? (value ? 'Sí' : 'No') : (value ? `×${value}` : 'No')}</span>
    </button>
  )
}

function FieldPanel({ field, onChange, side }) {
  const set = (patch) => onChange({ ...field, ...patch })
  const data = field[side]
  const setSide = (patch) => onChange({ ...field, [side]: { ...data, ...patch } })
  const isAtt = side === 'attacker'

  return (
    <div className="app-card p-5">
      <h3 className="mb-4 font-display text-lg font-extrabold text-text">
        Campo — {isAtt ? 'Lado atacante' : 'Lado defensor'}
      </h3>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="label">Clima</label>
          <select className="input" value={field.weather} onChange={(e) => set({ weather: e.target.value })}>
            {WEATHERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Terreno</label>
          <select className="input" value={field.terrain} onChange={(e) => set({ terrain: e.target.value })}>
            {TERRAINS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <HazardRow label="Trampa Rocas" value={data.sr} onToggle={() => setSide({ sr: !data.sr })} />
        <HazardRow
          label="Púas" value={data.spikes} max
          onToggle={() => setSide({ spikes: data.spikes >= 3 ? 0 : data.spikes + 1 })}
        />
        <HazardRow label="Reflejo" value={data.reflect} onToggle={() => setSide({ reflect: !data.reflect })} />
        <HazardRow label="Pantalla Luminosa" value={data.lightScreen} onToggle={() => setSide({ lightScreen: !data.lightScreen })} />
        <HazardRow label="Protegido" value={data.isProtected} onToggle={() => setSide({ isProtected: !data.isProtected })} />
        <HazardRow label="Drenadoras" value={data.isSeeded} onToggle={() => setSide({ isSeeded: !data.isSeeded })} />
      </div>
    </div>
  )
}

// ── Página ──────────────────────────────────────────────────────────────
export default function CalculadoraDeDano() {
  const opts = useMemo(() => buildOptions(), [])
  const [attacker, setAttacker] = useState(defaultSide)
  const [defender, setDefender] = useState(defaultSide)
  const [field, setField] = useState(emptyField)
  const [results, setResults] = useState(null)
  const [showExport, setShowExport] = useState(false)
  const [error, setError] = useState(null)

  const applyPreset = (sideKey, species, setName) => {
    const preset = SETDEX_BW[species]?.[setName]
    if (!preset) return
    const updater = sideKey === 'attacker' ? setAttacker : setDefender
    updater((prev) => ({
      ...prev,
      ...preset,
      species: species,
      ivs: { ...{ hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, ...preset.ivs },
      evs: { ...{ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ...preset.evs },
      moves: [...(preset.moves.slice(0, 4).concat(['', '', '', ''])).slice(0, 4)],
      status: '',
      curHP: null,
    }))
  }

  const buildPokemon = (side) => {
    if (!side.species) return null
    const p = new Pokemon(GEN, side.species, {
      level: side.level,
      nature: side.nature,
      ability: side.ability || undefined,
      item: side.item || undefined,
      ivs: side.ivs,
      evs: side.evs,
      boosts: Object.fromEntries(
        Object.entries(side.boosts).filter(([, v]) => v !== 0)
      ),
      status: side.status || undefined,
      curHP: side.curHP ?? undefined,
      moves: side.moves.filter(Boolean),
    })
    return p
  }

  const getField = () => {
    const f = new Field({
      weather: field.weather || undefined,
      terrain: field.terrain || undefined,
    })
    f.attackerSide = new Side({
      isSR: field.attacker.sr,
      spikes: field.attacker.spikes,
      isReflect: field.attacker.reflect,
      isLightScreen: field.attacker.lightScreen,
      isProtected: field.attacker.isProtected,
      isSeeded: field.attacker.isSeeded,
    })
    f.defenderSide = new Side({
      isSR: field.defender.sr,
      spikes: field.defender.spikes,
      isReflect: field.defender.reflect,
      isLightScreen: field.defender.lightScreen,
      isProtected: field.defender.isProtected,
      isSeeded: field.defender.isSeeded,
    })
    return f
  }

  const calcular = () => {
    setError(null)
    let at, df, f
    try {
      at = buildPokemon(attacker)
      df = buildPokemon(defender)
      if (!at || !df) return setResults(null)
      f = getField()
    } catch (e) {
      console.error('[Calculadora] Error al preparar el cálculo:', e)
      setResults(null)
      setError('No se pudo preparar el cálculo con esa combinación Pokémon/forma. Intenta otra especie o quita el objeto/habilidad que la cambia de forma.')
      return
    }
    const rows = []
    for (const moveName of attacker.moves) {
      if (!moveName) continue
      try {
        const mv = new Move(GEN, moveName, { ability: at.ability, item: at.item })
        const r = calculate(GEN, at, df, mv, f)
        const [min, max] = r.range()
        const pct = Math.max(1, Math.round((min / df.maxHP()) * 100))
        rows.push({
          move: moveName,
          desc: r.fullDesc(),
          range: r.range(),
          ko: r.kochance().text,
          percent: pct,
        })
      } catch (e) {
        console.error('[Calculadora] Error al calcular', moveName, e)
        rows.push({ move: moveName, desc: 'No se pudo calcular este movimiento.', range: null, ko: '', percent: 0 })
      }
    }
    setResults({ attacker: at, defender: df, field: f, rows })
    setError(null)
  }

  const exportShowdown = () => {
    const line = (side) => {
      if (!side.species) return ''
      const evs = STATS.map((s) => `${side.evs[s] || 0} ${statEsFull(s)}`).filter((e) => !e.startsWith('0 ')).join(' / ')
      const parts = [`${side.species} @ ${side.item || 'Ninguno'}`, `Ability: ${side.ability || '—'}`, `Level: ${side.level}`]
      if (side.nature) parts.push(`${natureEs(side.nature)} Nature` + (evs ? `  ${evs}` : ''))
      const ivs = STATS.map((s) => `${side.ivs[s] ?? 31} ${statEsFull(s)}`).filter((e, i) => (side.ivs[STATS[i]] ?? 31) !== 31).join(' / ')
      if (ivs) parts.push(`IVs: ${ivs}`)
      for (const m of side.moves.filter(Boolean)) parts.push(`- ${m}`)
      return parts.join('\n')
    }
    const at = line(attacker)
    const df = line(defender)
    return [at, '', df].join('\n')
  }

  return (
    <div>
      <PageHeader
        title="Calculadora de Daño"
        subtitle="Mecánicas Gen 5 de PokeMMO. Elige dos Pokémon, ajusta sus stats y calcula el daño movimiento a movimiento."
        icon={Calculator}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <PokemonPanel
          title="Atacante" accent="border-l-4 border-l-primary"
          side={attacker} onChange={setAttacker}
          speciesList={opts.species}
          itemList={opts.items} moveList={opts.moves}
          presets={SETDEX_BW} onPreset={(s, n) => applyPreset('attacker', s, n)}
        />
        <PokemonPanel
          title="Defensor" accent="border-l-4 border-l-secondary"
          side={defender} onChange={setDefender}
          speciesList={opts.species}
          itemList={opts.items} moveList={opts.moves}
          presets={SETDEX_BW} onPreset={(s, n) => applyPreset('defender', s, n)}
        />
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <FieldPanel side="attacker" field={field} onChange={setField} />
        <FieldPanel side="defender" field={field} onChange={setField} />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button onClick={calcular} className="btn-primary">
          <Swords size={18} />
          Calcular daño
        </button>
        <button
          onClick={() => { setResults(null); setError(null); setAttacker(defaultSide()); setDefender(defaultSide()); setField(emptyField()) }}
          className="btn-ghost"
        >
          <RotateCcw size={18} />
          Reiniciar
        </button>
        <button onClick={() => setShowExport(true)} className="btn-ghost ml-auto">
          Exportar (Showdown)
        </button>
      </div>

      {/* Error al calcular */}
      {error && (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">
          <strong>No se pudo calcular:</strong> {error}
        </div>
      )}

      {/* Resultados */}
      {results && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 space-y-3"
        >
          <h3 className="font-display text-xl font-extrabold text-text">Resultados</h3>

          {/* Stats finales */}
          <div className="app-card grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
            {[results.attacker, results.defender].map((p, idx) => (
              <div key={idx} className="col-span-2 sm:col-span-2">
                <p className="text-xs font-semibold uppercase text-soft">
                  {idx === 0 ? 'Atacante' : 'Defensor'} · {T(p.name, 'species')}
                </p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                  <StatBox label="PS" value={p.rawStats.hp} />
                  <StatBox label="Atq" value={p.rawStats.atk} />
                  <StatBox label="Def" value={p.rawStats.def} />
                  <StatBox label="At. Esp" value={p.rawStats.spa} />
                  <StatBox label="Def. Esp" value={p.rawStats.spd} />
                  <StatBox label="Vel" value={p.rawStats.spe} />
                </div>
              </div>
            ))}
          </div>

          {results.rows.length === 0 ? (
            <div className="app-card p-6 text-center text-sm text-soft">
              Añade al menos un movimiento al atacante para calcular.
            </div>
          ) : (
            results.rows.map((row, i) => (
              <div key={i} className="app-card p-5">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="inline-flex rounded-full bg-primary/15 px-3 py-0.5 text-sm font-bold text-primary">
                    {T(row.move, 'move')}
                  </span>
                  <span className="text-sm font-semibold text-text">
                    {row.range ? `${row.range[0]} - ${row.range[1]} PS` : ''}
                  </span>
                  {row.ko && <span className="text-sm font-semibold text-secondary">· {row.ko}</span>}
                </div>
                <p className="text-sm text-soft">{row.desc}</p>
              </div>
            ))
          )}
        </motion.div>
      )}

      {/* Export modal */}
      {showExport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowExport(false)}>
          <div className="app-card w-full max-w-xl p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-3 font-display text-lg font-extrabold text-text">Exportar (Showdown)</h3>
            <textarea
              readOnly
              className="input h-64 font-mono text-xs"
              value={exportShowdown()}
            />
            <div className="mt-4 flex justify-end">
              <button onClick={() => setShowExport(false)} className="btn-ghost">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="rounded-lg bg-elevated px-2 py-1.5 text-center">
      <div className="text-[10px] uppercase text-soft">{label}</div>
      <div className="font-bold text-text">{value}</div>
    </div>
  )
}
