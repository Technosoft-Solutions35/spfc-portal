// Helper para generar la imagen vertical (PNG) de un equipo del Team Builder.
// Dibuja manualmente sobre un canvas de ancho fijo, apilando un bloque por
// Pokémon, con la cabecera (nombre + cuenta + fecha/hora) y el pie del clan.
// Los sprites vienen de GitHub raw de PokeAPI (envían Access-Control-Allow-Origin: *)
// para poder pintarlos en el canvas y exportar el PNG sin manchado CORS.
import DEXNUM from './pokecalc/data/gen5-dexnum.js'
import { statEsFull } from './pokecalc/es.js'

const SPRITE_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/'

const W = 760 // ancho del PNG
const PAD = 44 // padding lateral
const HEAD_H = 148
const ROW_GAP = 18

// Paleta fija (independiente del tema claro/oscuro de la web).
const PAL = {
  bg: '#10131A',
  card: '#1B202B',
  line: '#2B3242',
  title: '#FFFFFF',
  sub: '#AEB6C6',
  text: '#EDF0F6',
  soft: '#8B93A7',
  accent: '#FF3E3E',
  gold: '#FFB703',
  green: '#22C55E',
  label: '#6C7788',
}

export function dexIdFor(species) {
  const r = DEXNUM[species]
  return r && r.id ? r.id : 0
}

// Carga un sprite de PokeAPI como Image (resuelve dataURL para evitar CORS en
// futuros re-uso). Devuelve null si no existe.
export function loadPokeSprite(id) {
  return new Promise((resolve) => {
    if (!id) return resolve(null)
    const img = new Image()
    const url = `${SPRITE_BASE}${id}.png`
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.crossOrigin = 'anonymous'
    img.src = url
  })
}

const wrap = (ctx, text, maxWidth, initialY, fontSize, lineHeight, maxLines) => {
  const words = String(text).split(' ')
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? line + ' ' + w : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
    if (lines.length >= maxLines) break
  }
  if (line && lines.length < maxLines) lines.push(line)
  let y = initialY
  const out = []
  for (const l of lines.slice(0, maxLines)) {
    ctx.fillText(l, PAD, y)
    out.push(y)
    y += lineHeight
  }
  return out
}

const roundRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Dibuja el equipo completo y devuelve el canvas montado.
export function drawTeamImage({ name = '', account = '', when = '', team = [] }) {
  // Altura: cabecera + N bloques.
  const blockH = team.map(() => 0)
  // Estimamos N bloques a una altura aproximada (más padding). Cada bloque
  // ocupa: sprite 150 + texto ~ 7 líneas * 24 = ~180 + padding.
  let estH = HEAD_H + team.length * (232) + PAD * 2 + 100
  adjustHeight: for (;;) {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = estH
    const ctx = canvas.getContext('2d')
    // Fondo
    ctx.fillStyle = PAL.bg
    ctx.fillRect(0, 0, W, estH)

    // ── Cabecera ──
    ctx.fillStyle = PAL.card
    ctx.fillRect(0, 0, W, HEAD_H)
    ctx.strokeStyle = PAL.accent
    ctx.lineWidth = 5
    ctx.strokeRect(0, 0, W, HEAD_H)
    ctx.textBaseline = 'alphabetic'

    ctx.fillStyle = PAL.title
    ctx.font = '700 30px Poppins, sans-serif'
    const nameText = name ? name : 'Equipo del clan'
    const nameY = wrap(ctx, nameText, W - PAD * 2, 60, 30, 34, 1)[0] ?? 60

    ctx.font = '400 16px Inter, sans-serif'
    ctx.fillStyle = PAL.sub
    ctx.fillText(`Cuenta: ${account || 'Miembro del clan'}`, PAD, nameY + 34)
    ctx.fillText(`${when}`, PAD, nameY + 60)

    // ── Bloques de Pokémon ──
    let cursor = HEAD_H + PAD
    const result = []
    for (let i = 0; i < team.length; i++) {
      const p = team[i]
      const y0 = cursor
      const numLabel = `#${i + 1}`
      const h = drawBlock(ctx, p, y0, numLabel)
      cursor = y0 + h + ROW_GAP
    }

    // ── Pie ──
    const footerY = cursor + 12
    ctx.fillStyle = PAL.card
    ctx.fillRect(0, footerY, W, 74)
    ctx.fillStyle = PAL.soft
    ctx.textAlign = 'center'
    ctx.font = '500 15px Inter, sans-serif'
    ctx.fillText('Hecho con la Página Oficial del Equipo de PokeMMO SpecialForce/God', W / 2, footerY + 30)
    ctx.fillStyle = PAL.gold
    ctx.font = '600 15px Inter, sans-serif'
    ctx.fillText('SpecialForce / God', W / 2, footerY + 54)
    ctx.textAlign = 'left'

    const needed = footerY + 74 + PAD
    if (needed <= estH) {
      result.canvas = canvas
      return result
    }
    estH = needed
  }
}

// Dibuja un bloque (un Pokémon). Retorna su altura.
function drawBlock(ctx, p, y0, numLabel) {
  const h = 252
  roundRect(ctx, PAD, y0, W - PAD * 2, h, 18)
  ctx.fillStyle = PAL.card
  ctx.fill()
  ctx.strokeStyle = PAL.line
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Número de slot
  ctx.fillStyle = PAL.accent
  ctx.font = '700 16px Poppins, sans-serif'
  ctx.fillText(numLabel, PAD + 18, y0 + 32)

  // Sprite (izquierda)
  const sp = p._sprite
  const sx = PAD + 22
  const sy = y0 + 30
  const ssize = 168
  // marco
  ctx.fillStyle = PAL.bg
  roundRect(ctx, sx - 6, sy - 6, ssize + 12, ssize + 12, 12)
  ctx.fill()
  if (sp) {
    // dibujar centrado
    const iw = sp.width || 96
    const ih = sp.height || 96
    const scale = Math.min((ssize - 20) / iw, (ssize - 20) / ih)
    const dw = iw * scale
    const dh = ih * scale
    const dx = sx + (ssize - dw) / 2
    const dy = sy + (ssize - dh) / 2
    ctx.drawImage(sp, dx, dy, dw, dh)
  } else {
    // placeholder (CAP / sin sprite)
    ctx.fillStyle = PAL.line
    ctx.beginPath()
    ctx.arc(sx + ssize / 2, sy + ssize / 2, 48, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = PAL.soft
    ctx.font = '700 34px Poppins, sans-serif'
    const ch = (p.species ? p.species[0] : '?').toUpperCase()
    ctx.textAlign = 'center'
    ctx.fillText(ch, sx + ssize / 2, sy + ssize / 2 + 13)
    ctx.textAlign = 'left'
  }

  // ---- Texto a la derecha de la foto ----
  const tx = sx + ssize + 34
  const maxW = W - PAD - tx - 24

  // Nombre (Especie)
  const nameEs = p._esName || p.species || 'Pokémon'
  ctx.fillStyle = PAL.title
  ctx.font = '700 25px Poppins, sans-serif'
  const nameRows = wrap(ctx, nameEs, maxW, y0 + 46, 25, 30, 1)
  const nY = nameRows[0] ?? y0 + 46
  const nYb = nameRows[1] ?? nY

  // Nivel · Naturaleza
  ctx.font = '400 17px Inter, sans-serif'
  ctx.fillStyle = PAL.gold
  ctx.fillText(`Nivel ${p.level || 50}`, tx, nYb + 38)
  ctx.fillStyle = PAL.text
  ctx.fillText(`Naturaleza: ${p._esNature || '—'}`, tx, nYb + 62)

  // Item equipado
  ctx.fillStyle = PAL.sub
  ctx.fillText(`Objeto: ${p._esItem || '—'}`, tx, nYb + 86)

  // Habilidad
  ctx.fillText(`Habilidad: ${p._esAbility || '—'}`, tx, nYb + 110)

  // EVs (solo stats con puntos)
  const evParts = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']
    .filter((s) => (p.evs?.[s] || 0) > 0)
    .map((s) => `${statEsFull(s)} ${p.evs[s]}`)
  ctx.fillStyle = PAL.label
  ctx.font = '600 15px Inter, sans-serif'
  ctx.fillText('EVs:', tx, nYb + 136)
  if (evParts.length) {
    ctx.fillStyle = PAL.green
    ctx.font = '600 15px Inter, sans-serif'
    wrap(ctx, evParts.join('   ·   '), maxW - 40, nYb + 136, 15, 20, 1)
  } else {
    ctx.fillStyle = PAL.soft
    ctx.fillText('Ninguno', tx + 42, nYb + 136)
  }

  return h
}

// Renderiza en canvas, carga los sprites necesarios y dispara la descarga PNG.
export async function buildTeamPng(opts) {
  const { team = [] } = opts
  const withSprites = await Promise.all(
    team.map(async (p) => ({
      ...p,
      _sprite: await loadPokeSprite(p._spriteId),
    })),
  )
  const res = drawTeamImage({ ...opts, team: withSprites })
  const a = document.createElement('a')
  a.href = res.canvas.toDataURL('image/png')
  a.download = `${(opts.name || 'equipo').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'equipo'}.png`
  a.click()
}
