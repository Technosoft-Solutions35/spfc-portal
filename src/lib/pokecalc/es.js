import raw from './data/es-translations.json'

// Traducciones ES para el motor de cálculo PokeMMO.
// Los nombres internos del motor están en inglés; `T` los busca por id
// normalizado en los diccionarios de PokeAPI y devuelve el nombre español.

const TYPES = raw.types
const SPECIES = raw.species
const MOVES = raw.moves
const ABILITIES = raw.abilities
const ITEMS = raw.items

export function toID(name) {
  return ('' + (name ?? '')).toLowerCase().replace(/[^a-z0-9]+/g, '')
}

// Normaliza para buscar: minúsculas, sin tildes y sin separadores.
// Permite encontrar "Terremoto" tecleando "terremoto", "tormenta arena",
// "TormentaArena", etc., comparando con el nombre español.
export function normalize(s) {
  return ('' + (s ?? ''))
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

// Nombres del motor (Showdown/PokeMMO) que no coinciden con los identificadores
// de PokeAPI; se mapean a la entrada equivalente del diccionario.
const MOVE_ALIASES = {
  visegrip: 'vicegrip',
}

// Nombres oficiales de la era PokeMMO (Gen 5): PokeAPI devuelve los nombres
// vigentes, y varios movimientos fueron renombrados en generaciones posteriores
// (o abreviados/espaciados). WikiDex documenta el nombre anterior a cada
// generación ("llamado X antes de la [N]ª generación").
const RETRO_MOVES = {
  barrage: 'Presa',
  counter: 'Contador',
  guardswap: 'Cambia Def.',
  heartswap: 'Cambia Almas',
  iceshard: 'Canto Helado',
  imprison: 'Cerca',
  mirrormove: 'Movimiento Espejo',
  powerswap: 'Cambia Fue.',
  psychup: 'Más Psique',
  return: 'Retroceso',
  sandstorm: 'Tormenta Arena',
  seedflare: 'Fogonazo',
  seismictoss: 'Movimiento Sísmico',
  signalbeam: 'Doble Rayo',
  soak: 'Anegar',
  softboiled: 'Amortiguador',
  swift: 'Rapidez',
  tailglow: 'Ráfaga',
  vitalthrow: 'Tiro Vital',
}

// Movimientos con variantes compuestas: "Hidden Power <Tipo>" se muestra con
// el nombre oficial ("Poder Oculto"); el tipo va indicado aparte en la UI.
const PREFIX_MAP = [
  { prefix: 'Hidden Power', name: 'Poder Oculto' },
]

function pick(map, name, fallback) {
  if (!name) return fallback
  const id = toID(name)
  if (map === MOVES && MOVE_ALIASES[toID(name)] !== undefined) {
    return pick(map, MOVE_ALIASES[id], fallback)
  }
  if (map === MOVES && RETRO_MOVES[id]) return RETRO_MOVES[id]
  const hit = map[id]
  return hit && typeof hit === 'object' ? hit.es : (hit || fallback)
}

// Traduce cualquier nombre (especie, movimiento, habilidad, objeto, tipo,
// clima, terreno...) usando el diccionario apropiado.
export function T(name, kind) {
  if (name == null || name === '') return name
  if (kind === 'move') {
    for (const { prefix, name: pname } of PREFIX_MAP) {
      if (toID(name).startsWith(toID(prefix))) return pname
    }
  }
  switch (kind) {
    case 'species': return pickSpecies(name)
    case 'move': return pick(MOVES, name, name)
    case 'ability': return pick(ABILITIES, name, name)
    case 'item': return pick(ITEMS, name, name)
    case 'type': return pick(TYPES, name, name)
    default: {
      if (TYPES[toID(name)]) return TYPES[toID(name)]
      if (MOVES[toID(name)]) return MOVES[toID(name)]
      if (ABILITIES[toID(name)]) return ABILITIES[toID(name)]
      if (ITEMS[toID(name)]) return ITEMS[toID(name)]
      return pickSpecies(name)
    }
  }
}

// Formas con sufijo ("Arceus-Bug", "Genesect-Burn", "Cherrim-Sunshine",
// "Pichu-Spiky-eared", "Meowstic-F"...) se traducen por el nombre oficial
// de la especie base, como consta en los juegos.
function pickSpecies(name) {
  const base = pick(SPECIES, name, '')
  if (base) return base
  let rest = name
  while (rest.includes('-')) {
    rest = rest.slice(0, rest.lastIndexOf('-'))
    const hit = SPECIES[toID(rest)]
    if (hit) return typeof hit === 'object' ? hit.es : (hit || name)
  }
  return name
}

// Natures (ironcamente names oficiales en español)
export const NATURES_ES = {
  Adamant: 'Firme', Bashful: 'Vergüenza', Bold: 'Osada', Brave: 'Audaz',
  Calm: 'Serena', Careful: 'Cauta', Docile: 'Dócil', Gentle: 'Amable',
  Hardy: 'Fuerte', Hasty: 'Impulsiva', Impish: 'Agitada', Jolly: 'Alegre',
  Lax: 'Floja', Lonely: 'Huraña', Mild: 'Afable', Modest: 'Modesta',
  Naive: 'Ingenua', Naughty: 'Traviesa', Quiet: 'Mansa', Quirky: 'Rara',
  Rash: 'Alocada', Relaxed: 'Plácida', Sassy: 'Grosera', Serious: 'Serena',
  Timid: 'Miedosa',
}

export function natureEs(name) {
  return NATURES_ES[name] || name
}

// Estados
export const STATUS_ES = {
  brn: 'Quemado', par: 'Paralizado', slp: 'Dormido',
  psn: 'Envenenado', tox: 'Gravemente envenenado', frz: 'Congelado',
}

export function statusEs(code) {
  return STATUS_ES[code] || (code ? T(code, 'status') : '')
}

// Clima
export const WEATHER_ES = {
  Sun: 'Sol', Rain: 'Lluvia', Sand: 'Tormenta de arena', Hail: 'Granizo',
  Snow: 'Nieve', 'Harsh Sunshine': 'Sol abrasador', 'Heavy Rain': 'Lluvia torrencial',
  'Strong Winds': 'Vientos fuertes',
}

export function weatherEs(name) {
  return WEATHER_ES[name] || (name ? T(name) : '')
}

// Terrenos
export const TERRAIN_ES = {
  Electric: 'Eléctrico', Grassy: 'Herboso', Misty: 'Niebla', Psychic: 'Psíquico',
}

export function terrainEs(name) {
  return TERRAIN_ES[name] || (name ? T(name) : '')
}

// Estadísticas (PS, Ataque, Defensa, At. Esp., Def. Esp., Velocidad)
export const STAT_ES = {
  hp: 'PS', atk: 'Atq', def: 'Def', spa: 'At. Esp', spd: 'Def. Esp', spe: 'Vel',
}

export function statEs(id) {
  return STAT_ES[id] || (id || '').toUpperCase()
}

export const STAT_ES_FULL = {
  hp: 'PS', atk: 'Ataque', def: 'Defensa', spa: 'Ataque Especial',
  spd: 'Defensa Especial', spe: 'Velocidad',
}

export function statEsFull(id) {
  return STAT_ES_FULL[id] || id
}

export default { T, toID, NATURES_ES, STATUS_ES, WEATHER_ES, TERRAIN_ES, STAT_ES }