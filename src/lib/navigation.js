import {
  Home,
  Sparkles,
  Swords,
  BookOpen,
  CalendarDays,
  Trophy,
  Settings,
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
  { to: '/gestion', label: 'Gestión', icon: Settings, roles: ['super-admin', 'admin', 'gestor'] },
]
