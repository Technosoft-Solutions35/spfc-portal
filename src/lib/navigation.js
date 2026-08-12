import {
  Home,
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
export const NAV_ITEMS = [
  { to: '/', label: 'Inicio', icon: Home, end: true },
  { to: '/shiny-hunt', label: 'Shiny Hunt', icon: Sparkles },
  { to: '/torneos', label: 'Torneos', icon: Swords },
  { to: '/guias', label: 'Guías y Buildeos', icon: BookOpen },
  { to: '/eventos', label: 'Eventos', icon: CalendarDays },
  // Secciones reservadas al staff / admin (se filtran según el rol)
  // Sorteos lo ve todo el clan; la gestión de tickets es solo admin.
  { to: '/sorteos', label: 'Sorteos', icon: Trophy },
  // DLC 1: perfil propio (todos los miembros)
  { to: '/perfil', label: 'Mi perfil', icon: User },
  // DLC 2: reportes de shinies para todos; revisión solo staff
  { to: '/mis-shinies', label: 'Mis shinies', icon: Send },
  { to: '/revisar-shinies', label: 'Revisar shinies', icon: ClipboardCheck, roles: ['super-admin', 'admin', 'gestor'] },
  { to: '/gestion', label: 'Gestión', icon: Settings, roles: ['super-admin', 'admin', 'gestor'] },
]
