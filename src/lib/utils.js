// Utilidades de roles y formato compartidas por toda la app.

// Roles estrictos de la plataforma
export const ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  GESTOR: 'gestor',
  MEMBER: 'member',
}

// ¿Puede otorgar/cambiar roles a otros usuarios? (solo super-admin)
export const canAssignRoles = (role) => role === ROLES.SUPER_ADMIN

// ¿Puede gestionar contenido (super-admin + admin + gestor)?
export const canManageContent = (role) =>
  role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.GESTOR

// ¿Puede gestionar TODO el contenido (super-admin + admin + gestor)?
// Desde el ajuste de permisos, gestor == admin en todo excepto sorteos.
export const canManageAll = (role) =>
  role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.GESTOR

// ¿Puede corregir contadores de Shiny Hunt (+ / -)?
export const canManageShinies = (role) =>
  role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN || role === ROLES.GESTOR

// ¿Tiene acceso al panel de sorteos? (super-admin + admin)
export const canAccessRaffles = (role) =>
  role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN

// Texto legible del rol para la UI
export const ROLE_LABELS = {
  'super-admin': 'Super Administrador',
  admin: 'Administrador',
  gestor: 'Gestor',
  member: 'Miembro',
}

// ── DLC 1: Datos personalizables del perfil ──
// Afiliación de clan (solo estas dos opciones, como se definió)
export const AFFILIATIONS = ['SpFc', 'SpGd']

// Roles / profesiones en el juego (multiselección con tags)
export const GAME_ROLES = ['Criador', 'Entrenador EVs', 'Jugador PvP', 'ShinyHunter', 'Jugador PvE']

// Límite de la bio (caracteres)
export const BIO_MAX = 200

// ── DLC 4: Categorías de noticias (selección múltiple)
export const NEWS_CATEGORIES = [
  'Eventos',
  'Nuevas Mecánicas',
  'Mods',
  'Informaciones del juego',
  'Informaciones del clan',
  'Otras',
]

// Categorías de guías (selección múltiple)
export const GUIDE_CATEGORIES = [
  'Farmeo NPCs',
  'Farmeo Objetos',
  'Farmeo Plantación',
  'Crianza',
  'Raids Legendarias',
  'Raids Estacionarias/Evento',
  'Eventos Estacionales',
]

// Fecha legible en español (ej: 11/08/2026 · 20:30)
export function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Fecha corta (ej: 11 ago 2026)
export function formatShortDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// Convierte "YYYY-MM-DD" (columna date de Supabase) a un Date local a medianoche.
// new Date("2026-06-23") se interpreta como UTC y en zonas al oeste de UTC
// muestra el día anterior; este parseo evita ese desplazamiento.
export function parseDateOnly(value) {
  if (!value) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number)
    return new Date(y, m - 1, d)
  }
  return new Date(value)
}

// Día de cumpleaños (ej: 13 de agosto) — sin año
export function formatBirthDay(value) {
  if (!value) return '—'
  return parseDateOnly(value).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
  })
}

// Email interno derivado del username: Supabase Auth exige un correo como
// identificador, pero el clan no valida emails reales. Se genera uno
// automáticamente a partir del usuario (que sí es único) para no pedirlo.
export function generateMemberEmail(username = '') {
  const slug =
    username
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita acentos
      .replace(/[^a-z0-9._-]+/g, '') // solo caracteres válidos
      .replace(/^[^a-z0-9]+/, '')
      .slice(0, 32) || 'member'
  return `${slug}@spfc.gd`
}

// Iniciales del username para el avatar generado
export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// ── Ordenación de la sección Comunidad (eventos, torneos, brackets) ──
// Los contenidos se ordenan por fecha de creación (más recientes arriba),
// dando prioridad a los activos: torneos que aceptan inscripciones (open) o
// están en curso (in_progress) primero, y finalizados al final.
const TOURNAMENT_RANK = { open: 0, in_progress: 1, finished: 2 }

// Más recientes primero (por created_at)
export function sortByCreatedDesc(list) {
  return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
}

// Torneos activos primero y, dentro de cada grupo, por fecha de creación
export function sortTournaments(list) {
  return [...list].sort((a, b) => {
    const ra = TOURNAMENT_RANK[a.status] ?? 0
    const rb = TOURNAMENT_RANK[b.status] ?? 0
    if (ra !== rb) return ra - rb
    return new Date(b.created_at) - new Date(a.created_at)
  })
}

// Extrae la ruta del objeto Storage desde su URL pública
// (…/storage/v1/object/public/media/<carpeta>/<archivo> → <carpeta>/<archivo>)
export function storagePathFromUrl(url = '') {
  const m = url.match(/\/object\/public\/[^/]+\/(.+)$/)
  return m ? m[1] : null
}

// Primer plano del fondo: genera una URL de imágenes con formato (p. ej. Unsplash)
export function seededImage(id = 'spfc', w = 800, h = 450) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop`
}
