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
  Users,
  Send,
  ClipboardCheck,
  Cake,
  Layers,
  Handshake,
  Network,
  Box,
  Globe,
} from 'lucide-react'

// Definición única de navegación (sidebar y menú móvil comparten esta lista).
// Cada elemento lleva un `load` que precarga su página (chunk lazy) al pasar
// el ratón/enfocar el enlace: así el clic navega al instante.
export const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true, load: () => import('../pages/Dashboard') },
  { to: '/noticias', label: 'Noticias', icon: Newspaper, section: 'news', load: () => import('../pages/News') },
  { to: '/shiny-hunt', label: 'Shiny Hunt', icon: Sparkles, load: () => import('../pages/ShinyHunt') },
  { to: '/eventos-torneos', label: 'Eventos / Torneos', icon: Swords, section: 'events', load: () => import('../pages/EventosTorneos') },
  // DLC 8: llaves de torneo e historial de campeones (todos)
  { to: '/brackets', label: 'Brackets', icon: Network, load: () => import('../pages/Brackets') },
  { to: '/guias', label: 'Guías y Buildeos', icon: BookOpen, section: 'guides', load: () => import('../pages/Guides') },
  // DLC 9: almacén de builds por tier (todos)
  { to: '/builds', label: 'Almacén de Builds', icon: Layers, load: () => import('../pages/Builds') },
  // DLC 10: comercio del clan (todos)
  { to: '/comercio', label: 'Comercio', icon: Handshake, load: () => import('../pages/Commerce') },
  // DLC 15: directorio de miembros con búsqueda en vivo (todos)
  { to: '/directorio', label: 'Miembros', icon: Users, load: () => import('../pages/MemberSearch') },
  // DLC 16: biblioteca de mods (todos)
  { to: '/mods', label: 'Biblioteca de MODs', icon: Box, load: () => import('../pages/Mods') },
  // Noticias del foro PokeMMO vía RSS (todos)
  { to: '/pokemmo-forum', label: 'Foro PokeMMO', icon: Globe, load: () => import('../pages/PokeMMOForum') },
  // Calendario del Team: cumpleaños + eventos/torneos (todos)
  { to: '/cumpleanos', label: 'Calendario del Team', icon: CalendarDays, load: () => import('../pages/Birthdays') },
  // Secciones reservadas al staff / admin (se filtran según el rol)
  // Sorteos lo ve todo el clan; la gestión de tickets es solo admin.
  { to: '/sorteos', label: 'Sorteos', icon: Trophy, load: () => import('../pages/Raffles') },
  // DLC 1: perfil propio (todos los miembros)
  { to: '/perfil', label: 'Mi perfil', icon: User, load: () => import('../pages/Profile') },
  // DLC 2: reportes de shinies para todos; revisión con permiso
  { to: '/mis-shinies', label: 'Mis shinies', icon: Send, load: () => import('../pages/MyShinies') },
  { to: '/revisar-shinies', label: 'Revisar shinies', icon: ClipboardCheck, permissions: ['shinies_review'], reports: true, load: () => import('../pages/ReviewShinies') },
  { to: '/gestion', label: 'Gestión', icon: Settings, permissions: ['content', 'members'], load: () => import('../pages/ContentManagement') },
]

// Precarga el chunk de la página destino (si aún no está cargado).
export function prefetchPage(to) {
  NAV_ITEMS.find((item) => item.to === to)?.load?.()
}
