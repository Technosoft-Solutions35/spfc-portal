import {
  Home,
  Newspaper,
  Sparkles,
  Swords,
  BookOpen,
  CalendarDays,
  Trophy,
  Settings,
  User,
  Send,
  ClipboardCheck,
} from 'lucide-react'

// Definición única de navegación (sidebar y menú móvil comparten esta lista).
// Cada elemento lleva un `load` que precarga su página (chunk lazy) al pasar
// el ratón/enfocar el enlace: así el clic navega al instante.
export const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true, load: () => import('../pages/Dashboard') },
  { to: '/noticias', label: 'Noticias', icon: Newspaper, section: 'news', load: () => import('../pages/News') },
  { to: '/shiny-hunt', label: 'Shiny Hunt', icon: Sparkles, load: () => import('../pages/ShinyHunt') },
  { to: '/torneos', label: 'Torneos', icon: Swords, section: 'tournaments', load: () => import('../pages/Tournaments') },
  { to: '/guias', label: 'Guías y Buildeos', icon: BookOpen, section: 'guides', load: () => import('../pages/Guides') },
  { to: '/eventos', label: 'Eventos', icon: CalendarDays, section: 'events', load: () => import('../pages/Events') },
  // Secciones reservadas al staff / admin (se filtran según el rol)
  // Sorteos lo ve todo el clan; la gestión de tickets es solo admin.
  { to: '/sorteos', label: 'Sorteos', icon: Trophy, load: () => import('../pages/Raffles') },
  // DLC 1: perfil propio (todos los miembros)
  { to: '/perfil', label: 'Mi perfil', icon: User, load: () => import('../pages/Profile') },
  // DLC 2: reportes de shinies para todos; revisión solo staff
  { to: '/mis-shinies', label: 'Mis shinies', icon: Send, load: () => import('../pages/MyShinies') },
  { to: '/revisar-shinies', label: 'Revisar shinies', icon: ClipboardCheck, roles: ['super-admin', 'admin', 'gestor'], reports: true, load: () => import('../pages/ReviewShinies') },
  { to: '/gestion', label: 'Gestión', icon: Settings, roles: ['super-admin', 'admin', 'gestor'], load: () => import('../pages/ContentManagement') },
]

// Precarga el chunk de la página destino (si aún no está cargado).
export function prefetchPage(to) {
  NAV_ITEMS.find((item) => item.to === to)?.load?.()
}
