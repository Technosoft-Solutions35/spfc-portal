// Utilidades de llaves de torneo (DLC 8).
// La llave se guarda en bracket_matches como filas inmutables (p1/p2/winner).
// Los enfrentamientos de rondas posteriores y el partido de bronce se DERIVAN
// de los ganadores de la ronda anterior, por lo que siempre son consistentes.

export const nextPowerOfTwo = (n) =>
  n <= 1 ? 2 : 2 ** Math.ceil(Math.log2(n))

// Genera todas las filas de una llave a partir de una lista de participantes.
// - Ronda 1: (P/2) partidos; los `byes` primeros son walkovers (winner = 1).
// - Rondas 2..R vacías (se rellenan al derivar).
// - Partido de bronce (3er/4to) si P >= 4.
export function generateMatches(playerNames, tournamentId) {
  const P = nextPowerOfTwo(playerNames.length)
  const R = Math.round(Math.log2(P))
  const byes = P - playerNames.length
  const round1Matches = P / 2
  const shuffled = [...playerNames].sort(() => Math.random() - 0.5)
  const matches = []
  let i = 0

  for (let pos = 1; pos <= round1Matches; pos++) {
    const p1 = shuffled[i++] || ''
    let p2 = ''
    let winner = null
    if (pos > byes) {
      p2 = shuffled[i++] || ''
    } else {
      winner = 1 // walkover automático
    }
    matches.push({
      tournament_id: tournamentId,
      round: 1,
      position: pos,
      match_type: 'standard',
      p1_id: null,
      p1_name: p1,
      p2_id: null,
      p2_name: p2,
      winner,
      score: '',
      notes: '',
    })
  }

  for (let r = 2; r <= R; r++) {
    const count = P / 2 ** r
    for (let pos = 1; pos <= count; pos++) {
      matches.push({
        tournament_id: tournamentId,
        round: r,
        position: pos,
        match_type: 'standard',
        p1_id: null,
        p1_name: '',
        p2_id: null,
        p2_name: '',
        winner: null,
        score: '',
        notes: '',
      })
    }
  }

  if (P >= 4) {
    matches.push({
      tournament_id: tournamentId,
      round: R + 1,
      position: 1,
      match_type: 'bronze',
      p1_id: null,
      p1_name: '',
      p2_id: null,
      p2_name: '',
      winner: null,
      score: '',
      notes: '',
    })
  }

  return matches
}

// Deriva los cruces de cada ronda a partir de los ganadores de la anterior.
// Devuelve { rounds, bronze }: rounds = [ [match, ...], ... ] (ronda 1..R) y
// bronze = [] o [match] (partido por el 3er/4to, rellenado con los perdedores
// de las semifinales). NO muta las filas originales.
export function buildBracket(matches) {
  const byRound = {}
  let bronze = []
  matches.forEach((m) => {
    if (m.match_type === 'bronze') bronze = [{ ...m }]
    else {
      const r = byRound[m.round] || (byRound[m.round] = [])
      r.push({ ...m })
    }
  })

  const rounds = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => a - b)
    .map((r) => byRound[r])
  const R = rounds.length

  const winnerName = (m) =>
    m.winner === 1 ? m.p1_name : m.winner === 2 ? m.p2_name : ''

  // Rellenar cruces de rondas 2..R desde la ronda anterior
  for (let r = 2; r <= R; r++) {
    const prev = byRound[r - 1] || []
    ;(byRound[r] || []).forEach((m) => {
      const p1 = prev.find((x) => x.position === m.position * 2 - 1)
      const p2 = prev.find((x) => x.position === m.position * 2)
      m.p1_name = p1 ? winnerName(p1) : ''
      m.p2_name = p2 ? winnerName(p2) : ''
    })
  }

  // Bronce: perdedores de las semifinales (ronda R-1, posiciones 1 y 2)
  if (bronze.length && R >= 2) {
    const semis = byRound[R - 1] || []
    const s1 = semis.find((x) => x.position === 1)
    const s2 = semis.find((x) => x.position === 2)
    if (s1 && s1.winner) bronze[0].p1_name = s1.winner === 1 ? s1.p2_name : s1.p1_name
    if (s2 && s2.winner) bronze[0].p2_name = s2.winner === 1 ? s2.p2_name : s2.p1_name
  }

  return { rounds, bronze }
}

// Limpia los ganadores de las rondas posteriores (y del bronce) cuando se
// modifica el resultado de un partido: los cruces cambian y dejan de valer.
// El bronce tiene round = R+1 (mayor que cualquier ronda normal), así que se
// limpia al tocar cualquier partido anterior, pero NO se limpia a sí mismo
// cuando se marca su propio ganador.
export const clearLaterWinners = (matches, fromRound) =>
  matches.map((m) => (m.round > fromRound ? { ...m, winner: null } : m))

// Nombre del ganador final (partido de la última ronda normal).
export function championInfo(rounds) {
  const final = rounds.length ? rounds[rounds.length - 1]?.[0] : null
  if (!final || !final.winner) return null
  return {
    champion: final.winner === 1 ? final.p1_name : final.p2_name,
    second: final.winner === 1 ? final.p2_name : final.p1_name,
  }
}
