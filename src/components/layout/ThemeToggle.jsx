import { Moon, Sun } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'

/**
 * Botón flotante para alternar modo claro / modo oscuro.
 * En desktop: posición fija esquina superior derecha.
 * En móvil: se renderiza inline dentro del MobileHeader (ver MobileHeader.jsx).
 */
export default function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={toggle}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      className="fixed right-4 top-[74px] z-[70] flex h-11 w-11 items-center justify-center rounded-full border border-edge bg-surface text-text shadow-card lg:right-5 lg:top-5 max-lg:hidden"
    >
      <motion.span
        key={theme}
        initial={{ rotate: -90, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
      >
        {isDark ? <Sun size={20} className="text-secondary" /> : <Moon size={20} className="text-primary" />}
      </motion.span>
    </motion.button>
  )
}
