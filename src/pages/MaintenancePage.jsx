import { Wrench } from 'lucide-react'

/**
 * Página mostrada a usuarios no autorizados cuando el modo mantenimiento
 * está activo. Informa claramente que el portal está temporalmente fuera de servicio.
 */
export default function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      {/* Icono animado */}
      <div className="relative mb-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-yellow-500/15">
          <Wrench size={48} className="text-yellow-500" />
        </div>
        {/* Rayas de fondo animadas */}
        <div
          className="pointer-events-none absolute -inset-4 rounded-full opacity-10"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, transparent, transparent 6px, #000 6px, #000 12px)',
            backgroundSize: '20px 20px',
            animation: 'maintenance-scroll 1.2s linear infinite',
          }}
        />
        <style>{`
          @keyframes maintenance-scroll {
            0% { background-position: 0 0 }
            100% { background-position: 20px 0 }
          }
        `}</style>
      </div>

      <h1 className="mb-3 font-display text-3xl font-extrabold text-text">
        Portal en mantenimiento
      </h1>
      <p className="mb-6 max-w-md text-soft">
        Estamos realizando mejoras en el portal. El acceso está temporalmente
        restringido al superadmin del clan.
      </p>
      <p className="mb-8 text-sm text-soft">
        Vuelve a intentarlo más tarde. ⏳
      </p>
      <a
        href="#/login"
        className="rounded-xl bg-primary px-6 py-3 text-sm font-bold text-white transition hover:bg-primary/90"
      >
        Ir al inicio de sesión
      </a>
    </div>
  )
}
