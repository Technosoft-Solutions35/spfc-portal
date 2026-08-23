import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, MailCheck, ShieldAlert, Shield } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout'
import { useToast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'

/**
 * Recuperación de contraseña.
 * Ofrece dos vías: envío de enlace por correo (puede fallar) o
 * contactar al super-admin para un reseteo directo.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${window.location.pathname}#/restablecer`,
    })
    setLoading(false)

    if (err) {
      setError('No pudimos enviar el enlace. Revisa el correo e inténtalo de nuevo.')
      toast('Error al enviar el enlace', 'error')
      return
    }

    setSent(true)
    toast('Enlace de recuperación enviado', 'success')
  }

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 inline-flex rounded-2xl bg-secondary/15 p-3 text-secondary">
          <KeyRound size={28} />
        </div>
        <h2 className="font-display text-xl font-extrabold text-text">Recuperar contraseña</h2>
        <p className="mt-1 text-sm text-soft">
          Elige cómo quieres recuperar el acceso a tu cuenta.
        </p>
      </div>

      {sent ? (
        <div className="space-y-4 text-center">
          <div className="flex flex-col items-center gap-3 rounded-xl bg-success/10 px-4 py-6 text-success">
            <MailCheck size={32} />
            <p className="text-sm font-medium">
              Revisa la bandeja de <strong>{email}</strong> (o la carpeta de spam) y sigue el
              enlace que te hemos enviado.
            </p>
          </div>
          <Link to="/login" className="btn-secondary w-full">
            Volver al inicio de sesión
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Opción 1: Email */}
          <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-edge bg-elevated p-4">
            <h3 className="flex items-center gap-2 font-display font-bold text-text">
              <MailCheck size={18} className="text-secondary" />
              Opción 1: Enviar enlace por correo
            </h3>
            <p className="text-xs text-soft">
              Te enviaremos un enlace de recuperación a tu correo registrado.
            </p>
            <div>
              <label className="label" htmlFor="recover-email">Correo electrónico</label>
              <input
                id="recover-email"
                type="email"
                required
                className="input"
                placeholder="tucorreo@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
                <ShieldAlert size={17} />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              <MailCheck size={18} />
              {loading ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </button>
          </form>

          {/* Opción 2: Contactar admin */}
          <div className="rounded-xl border border-edge bg-elevated p-4">
            <h3 className="flex items-center gap-2 font-display font-bold text-text">
              <Shield size={18} className="text-primary" />
              Opción 2: Contactar al super-admin
            </h3>
            <p className="mt-1 text-xs text-soft">
              Si el correo no te llega (puede ir a spam), contacta al super-admin del clan
              para que te resetee la contraseña directamente desde el panel de administración.
            </p>
            <p className="mt-2 text-xs text-soft">
              El super-admin puede encontrar esta opción en{' '}
              <strong>Gestión → Miembros → Resetear contraseña</strong> (ícono de llave).
            </p>
          </div>

          <p className="pt-1 text-center text-sm text-soft">
            ¿Recordaste tu contraseña?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Inicia sesión
            </Link>
          </p>
        </div>
      )}
    </AuthLayout>
  )
}
