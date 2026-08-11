import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'

/**
 * Modal animado reutilizable (Framer Motion).
 * Bloquea el scroll del fondo mientras está abierto.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-2xl',
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            className={`relative z-10 w-full ${maxWidth} max-h-[88vh] overflow-y-auto rounded-2xl border border-edge bg-elevated shadow-card`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-edge bg-elevated px-6 py-4">
              <h3 className="font-display text-lg font-bold text-text">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-soft transition hover:bg-primary/10 hover:text-primary"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
