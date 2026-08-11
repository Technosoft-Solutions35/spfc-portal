import { useEffect } from 'react'
import { motion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { Crown, Medal, Sparkles } from 'lucide-react'

const WINNER_STYLES = [
  { label: '1er lugar', icon: Crown, cls: 'from-secondary to-amber-500 text-white', glow: 'shadow-glowSecondary' },
  { label: '2º lugar', icon: Medal, cls: 'from-slate-300 to-slate-400 text-slate-900', glow: 'shadow-card' },
  { label: '3er lugar', icon: Medal, cls: 'from-amber-600 to-amber-700 text-white', glow: 'shadow-card' },
]

/**
 * Modal de celebración tras "Generar Sorteo".
 * Muestra los 3 ganadores con animación escalonada y confetti.
 */
export default function WinnerReveal({ winners, totalBalls, onClose }) {
  // Confetti al abrir
  useEffect(() => {
    const end = Date.now() + 1800
    const burst = () => {
      confetti({
        particleCount: 90,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FF3E3E', '#FFB703', '#F4A261', '#ffffff'],
      })
      if (Date.now() < end) {
        // Pequeños estallidos laterales
        confetti({ particleCount: 40, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: ['#FF3E3E', '#FFB703'] })
        confetti({ particleCount: 40, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: ['#FFB703', '#F4A261'] })
      }
    }
    burst()
    const iv = setInterval(burst, 350)
    setTimeout(() => clearInterval(iv), 1800)
    return () => clearInterval(iv)
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-3xl border border-edge bg-elevated p-8 text-center shadow-card"
      >
        <motion.div
          animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="mx-auto mb-3 inline-flex rounded-2xl bg-secondary/15 p-3 text-secondary"
        >
          <Sparkles size={30} />
        </motion.div>

        <h2 className="font-display text-3xl font-black text-text">¡Tenemos ganadores!</h2>
        <p className="mt-1 text-sm text-soft">
          Sorteo realizado sobre {totalBalls} boletas en la urna virtual.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {winners.map((name, i) => {
            const S = WINNER_STYLES[i]
            return (
              <motion.div
                key={name + i}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.35, type: 'spring', stiffness: 260, damping: 20 }}
                className={`rounded-2xl bg-gradient-to-br ${S.cls} ${S.glow} p-5`}
              >
                <S.icon size={26} className="mx-auto mb-2" />
                <p className="text-xs font-bold uppercase tracking-wide opacity-80">{S.label}</p>
                <p className="mt-1 font-display text-lg font-extrabold leading-tight">{name}</p>
              </motion.div>
            )
          })}
        </div>

        <button onClick={onClose} className="btn-primary mt-7 w-full">
          Cerrar
        </button>
      </motion.div>
    </motion.div>
  )
}
