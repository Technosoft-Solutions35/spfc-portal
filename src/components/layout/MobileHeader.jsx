import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { LogOut, Menu, X } from 'lucide-react'
import { NAV_ITEMS } from '../../lib/navigation'
import { useAuth } from '../../context/AuthContext'
import Avatar, { RoleBadge } from '../ui/Avatar'

/**
 * Cabecera móvil: logo compacto + botón hamburguesa.
 * El menú se despliega como un drawer lateral animado.
 */
export default function MobileHeader() {
  const [open, setOpen] = useState(false)
  const { profile, logout } = useAuth()
  const navigate = useNavigate()

  const items = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(profile?.role)
  )

  const handleLogout = async () => {
    setOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <>
      {/* Barra superior móvil */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-edge bg-surface/80 px-4 py-3 backdrop-blur-lg lg:hidden">
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
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="rounded-xl border border-edge bg-elevated p-2.5 text-text"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* Drawer móvil */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
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
                {items.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} onClick={() => setOpen(false)}>
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
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
