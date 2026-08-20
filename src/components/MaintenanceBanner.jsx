import { Wrench } from 'lucide-react'

/**
 * Banner de mantenimiento con rayas amarillas/negras animadas (hazard stripes).
 * Se muestra arriba de todo cuando el modo mantenimiento está activo.
 */
export default function MaintenanceBanner() {
  return (
    <div className="relative z-50 w-full overflow-hidden border-b-2 border-yellow-600 bg-yellow-500">
      {/* Rayas animadas */}
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 14px, #000 14px, #000 28px)',
          backgroundSize: '40px 40px',
          animation: 'maintenance-scroll 1.2s linear infinite',
        }}
      />
      <style>{`
        @keyframes maintenance-scroll {
          0% { background-position: 0 0 }
          100% { background-position: 40px 0 }
        }
      `}</style>
      <div className="relative flex items-center justify-center gap-3 px-4 py-3 text-sm font-bold text-black">
        <Wrench size={18} className="shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
        <span>
          🔧 El portal está en <strong>modo mantenimiento</strong>. Solo los administradores pueden acceder.
        </span>
        <Wrench size={18} className="shrink-0 animate-spin" style={{ animationDuration: '3s' }} />
      </div>
    </div>
  )
}

/**
 * Versión inline para mostrar dentro del Dashboard cuando el admin tiene sesión.
 */
export function MaintenanceInlineBanner() {
  return (
    <div className="relative mb-4 overflow-hidden rounded-xl border-2 border-yellow-600 bg-yellow-500/15">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, transparent, transparent 10px, #000 10px, #000 20px)',
          backgroundSize: '28px 28px',
          animation: 'maintenance-scroll 1.2s linear infinite',
        }}
      />
      <div className="relative flex items-center gap-3 px-4 py-3 text-sm font-bold text-yellow-700 dark:text-yellow-300">
        <Wrench size={16} className="shrink-0" />
        <span>Modo mantenimiento activo. Los miembros normales no pueden acceder al portal.</span>
      </div>
    </div>
  )
}
