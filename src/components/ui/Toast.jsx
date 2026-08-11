import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, XCircle } from 'lucide-react'

const ToastContext = createContext(null)

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
}

/**
 * Sistema minimalista de notificaciones toast.
 * Uso: const { toast } = useToast(); toast('Guardado', 'success')
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (message, type = 'info', duration = 3200) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      setToasts((prev) => [...prev, { id, message, type }])
      setTimeout(() => dismiss(id), duration)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Contenedor flotante de toasts */}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon = TOAST_ICONS[t.type] ?? Info
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                onClick={() => dismiss(t.id)}
                className="pointer-events-auto flex cursor-pointer items-center gap-3 rounded-xl border border-edge bg-elevated px-4 py-3 shadow-card"
              >
                <Icon
                  size={20}
                  className={
                    t.type === 'success'
                      ? 'text-success'
                      : t.type === 'error'
                        ? 'text-primary'
                        : 'text-secondary'
                  }
                />
                <p className="text-sm font-medium text-text">{t.message}</p>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return ctx
}
