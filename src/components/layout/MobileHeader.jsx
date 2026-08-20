import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LogOut, Menu, Moon, X, Sun } from 'lucide-react'
import { NAV_ITEMS, prefetchPage } from '../../lib/navigation'
import { useNewContent } from '../../lib/newContent'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import Avatar, { RoleBadge } from '../ui/Avatar'
import NewContentDot from '../ui/NewContentDot'

/**
 * Cabecera móvil: logo compacto + botón hamburguesa.
 * El menú se despliega como un drawer lateral animado (solo animación de
 * ENTRADA; la salida es instantánea para que el cierre nunca se quede
 * "pegado" tapando la pantalla, como pasaba con AnimatePresence).
 */
export default function MobileHeader() {
  const [open, setOpen] = useState(false)
  const { profile, can, logout } = useAuth()
  const { hasNew, pendingReports } = useNewContent()
  const { theme, toggle: toggleTheme } = useTheme()
  const navigate = useNavigate()

  const items = NAV_ITEMS.filter((item) => {
    if (item.roles && !item.roles.includes(profile?.role)) return false
    if (item.permissions && !item.permissions.some((p) => can(p))) return false
    return true
  })

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Barra superior móvil */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-edge bg-surface/95 px-4 py-3 backdrop-blur-lg lg:hidden">
        <div className="flex items-center gap-2.5">
          <img
            src="images/logo-clan.png"
            alt="Logo SpFc/Gd"
            className="h-10 w-10 rounded-lg object-cover"
          />
          <span className="font-display text-base font-extrabold text-text">
            SpFc<span className="text-primary">/Gd</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            className="rounded-xl border border-edge bg-elevated p-2.5 text-text"
          >
            {theme === 'dark' ? <Sun size={20} className="text-secondary" /> : <Moon size={20} className="text-primary" />}
          </button>
          <button
            onClick={() => setOpen(true)}
            aria-label="Abrir menú"
            className="rounded-xl border border-edge bg-elevated p-2.5 text-text"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      {/* Drawer móvil */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="absolute left-0 top-0 flex h-full w-80 max-w-[85vw] flex-col border-r border-edge bg-surface"
          >
            <div className="flex items-center justify-between px-5 py-5">
              <div className="flex items-center gap-3">
                <img
                  src="images/logo-clan.png"
                  alt="Logo SpFc/Gd"
                  className="h-12 w-12 rounded-xl object-cover"
                />
                <div>
                  <p className="font-display text-lg font-extrabold text-text">
                    SpFc<span className="text-primary">/Gd</span>
                  </p>
                  <p className="text-xs text-soft">Special Force</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar menú"
                className="rounded-lg p-2 text-soft"
              >
                <X size={22} />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
              {items.map(({ to, label, icon: Icon, end, section, reports }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => prefetchPage(to)}
                  onFocus={() => prefetchPage(to)}
                >
                  {({ isActive }) => (
                    <div
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-soft hover:bg-primary/5 hover:text-text'
                      }`}
                    >
                      <Icon size={19} />
                      {label}
                      <NewContentDot show={hasNew[section] || (reports && pendingReports)} />
                    </div>
                  )}
                </NavLink>
              ))}
            </nav>

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
          </motion.div>
        </div>
      )}
    </>
  )
}
