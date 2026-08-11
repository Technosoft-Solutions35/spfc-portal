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

// ¿Puede gestionar TODO el contenido (super-admin + admin)?
export const canManageAll = (role) =>
  role === ROLES.SUPER_ADMIN || role === ROLES.ADMIN

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

// Iniciales del username para el avatar generado
export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

// Primer plano del fondo: genera una URL de imágenes con formato (p. ej. Unsplash)
export function seededImage(id = 'spfc', w = 800, h = 450) {
  return `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop`
}
