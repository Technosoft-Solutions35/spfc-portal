// Lógica pura de formato de equipos del Team Builder (formato Showdown).
// Independiente del motor salvo por las utilidades de traducción inversa.
import { englishName, natureEngine, statEngine, natureEs, statEsFull } from './pokecalc/es.js'

export const STATS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']

export function emptyPokemon(species = '') {
  return {
    species,
    level: 50,
    nature: 'Serious',
    ability: '',
    item: '',
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    moves: ['', '', '', ''],
  }
}

// Divide un paste en bloques (separados por líneas en blanco).
export function lineSetSplit(text) {
  return text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
}

const NO_ITEM = /^(ninguno|none|—|-|sin\s+objeto)$/i

// Interpreta un bloque de set (líneas no vacías) → objeto Pokémon.
export function parseOneSet(lines) {
  const first = lines[0]
  const atIdx = first.indexOf(' @ ')
  const side = emptyPokemon(englishName(atIdx >= 0 ? first.slice(0, atIdx).trim() : first, 'species'))
  if (atIdx >= 0) {
    const itemRaw = first.slice(atIdx + 3).trim()
    side.item = NO_ITEM.test(itemRaw) ? '' : englishName(itemRaw, 'item')
  }
  for (let i = 1; i < lines.length; i++) {
    const l = lines[i]
    if (l.startsWith('Ability:')) {
      const v = l.slice('Ability:'.length).trim().replace(/[—\-]+$/, '').trim()
      side.ability = v && v !== '—' ? englishName(v, 'ability') : ''
    } else if (/^Level:/i.test(l)) {
      const n = +l.slice('Level:'.length).trim()
      if (!Number.isNaN(n)) side.level = Math.max(1, Math.min(100, n))
    } else if (/^IVs:/i.test(l)) {
      const ivs = { ...side.ivs }
      for (const part of l.slice('IVs:'.length).split('/')) {
        const mm = part.trim().match(/^(\d+)\s+(.+)$/)
        if (mm) {
          const s = statEngine(mm[2])
          if (s) ivs[s] = Math.max(0, Math.min(31, +mm[1]))
        }
      }
      side.ivs = ivs
    } else if (/ Nature/i.test(l)) {
      const m = l.match(/^(.+?)\s+Nature(?:\s{2,}(.*))?$/i)
      if (m) {
        side.nature = natureEngine(m[1].trim()) || side.nature
        const evStr = m[2] || ''
        if (evStr) {
          for (const part of evStr.split('/')) {
            const mm = part.trim().match(/^(\d+)\s+(.+)$/)
            if (mm) {
              const s = statEngine(mm[2])
              if (s) side.evs[s] = Math.max(0, Math.min(252, +mm[1]))
            }
          }
        }
      }
    } else if (l.startsWith('-')) {
      const idx = side.moves.findIndex((x) => !x)
      if (idx >= 0) side.moves[idx] = englishName(l.slice(1).trim(), 'move')
    }
  }
  if (!side.species) throw new Error('No se encontró la especie en un bloque.')
  if (Object.values(side.evs).reduce((a, b) => a + b, 0) > 510) {
    throw new Error('Un Pokémon supera los 510 EVs permitidos.')
  }
  return side
}

// Genera el paste de un equipo (array de pokémon) con cabecera y nombre.
export function exportTeamPaste(slots, teamName = 'Equipo') {
  const header = `=== [gen5] ${teamName} ===`
  const blocks = slots
    .filter(Boolean)
    .map((p) => {
      const evs = STATS.map((s) => `${p.evs[s] || 0} ${statEsFull(s)}`)
        .filter((e) => !e.startsWith('0 '))
        .join(' / ')
      const parts = [`${p.species} @ ${p.item || 'Ninguno'}`, `Ability: ${p.ability || '—'}`, `Level: ${p.level}`]
      if (p.nature) parts.push(`${natureEs(p.nature)} Nature` + (evs ? `  ${evs}` : ''))
      const ivs = STATS.map((s) => `${p.ivs[s] ?? 31} ${statEsFull(s)}`)
        .filter((_, i) => (p.ivs[STATS[i]] ?? 31) !== 31)
        .join(' / ')
      if (ivs) parts.push(`IVs: ${ivs}`)
      for (const m of p.moves.filter(Boolean)) parts.push(`- ${m}`)
      return parts.join('\n')
    })
    .join('\n\n')
  return blocks ? `${header}\n\n${blocks}` : header
}
