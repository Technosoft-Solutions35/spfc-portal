import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut } from 'lucide-react'
import { NAV_ITEMS, prefetchPage } from '../../lib/navigation'
import { useNewContent } from '../../lib/newContent'
import { useAuth } from '../../context/AuthContext'
import Avatar, { RoleBadge } from '../ui/Avatar'
import NewContentDot from '../ui/NewContentDot'

/**
 * Sidebar vertical fija (escritorio).
 * En móviles se sustituye por el menú hamburguesa (MobileHeader).
 */
export default function Sidebar() {
  const { profile, can, logout } = useAuth()
  const { hasNew, pendingReports } = useNewContent()
  const navigate = useNavigate()

  // Filtra los enlaces según el rol y los permisos del usuario logueado
  const items = NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(profile?.role)) return false
    if (item.permissions && !item.permissions.some((p) => can(p))) return false
    return true
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-edge bg-surface/70 backdrop-blur-lg lg:flex">
      {/* Logo del clan */}
      <div className="flex items-center gap-3 px-6 py-6">
        <img
          src="images/logo-clan.png"
          alt="Logo SpFc/Gd"
          className="h-14 w-14 rounded-xl object-cover shadow-glow"
        />
        <div>
          <p className="font-display text-lg font-extrabold leading-tight text-text">
            SpFc<span className="text-primary">/Gd</span>
          </p>
          <p className="text-xs font-medium text-soft">Special Force</p>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4">
        {items.map(({ to, label, icon: Icon, end, section, reports }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onMouseEnter={() => prefetchPage(to)}
            onFocus={() => prefetchPage(to)}
          >
            {({ isActive }) => (
              <div
                className={`group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-soft hover:bg-primary/5 hover:text-text'
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-full bg-primary"
                  />
                )}
                <Icon size={19} className="shrink-0" />
                {label}
                <NewContentDot show={hasNew[section] || (reports && pendingReports)} />
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Usuario + logout */}
      <div className="border-t border-edge p-4">
        <div className="flex items-center gap-3 rounded-xl bg-background p-3">
          <Avatar name={profile?.username} src={profile?.avatar_url} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-text">
              {profile?.username}
            </p>
            <RoleBadge role={profile?.role} />
          </div>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="rounded-lg p-2 text-soft transition hover:bg-primary/10 hover:text-primary"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  )
}
