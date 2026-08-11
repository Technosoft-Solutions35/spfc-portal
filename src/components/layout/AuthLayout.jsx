import Background from '../layout/Background'

/**
 * Pantalla común para Login / Registro / Verificación / Recuperación:
 * tarjeta glassmorphism centrada sobre el fondo temático del clan.
 */
export default function AuthLayout({ children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center p-4">
      <Background />
      <div className="glass w-full max-w-md rounded-2xl p-8 sm:p-10">
        {/* Marca del clan */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img
            src="images/logo-clan.png"
            alt="Logo SpFc/Gd"
            className="h-20 w-20 rounded-2xl object-cover shadow-glow"
          />
          <div>
            <h1 className="font-display text-2xl font-extrabold text-text">
              SpFc<span className="text-primary">/Gd</span>
            </h1>
            <p className="text-sm font-medium text-soft">
              Portal oficial del clan — Special Force
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
