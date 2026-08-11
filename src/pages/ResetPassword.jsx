import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { KeyRound, ShieldAlert, ShieldCheck } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout'
import { useToast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'

/**
 * Restablecimiento de contraseña.
 * El enlace de recuperación llega con un token_hash (type=recovery);
 * aquí se procesa y se guarda la nueva contraseña del usuario.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const tokenHash = searchParams.get('token_hash')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!tokenHash) {
      setError('Enlace no válido. Vuelve a solicitar la recuperación.')
    }
  }, [tokenHash])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (password !== confirm) return setError('Las contraseñas no coinciden.')

    setLoading(true)

    // Verifica el token de recuperación y establece la sesión
    if (tokenHash) {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      })
      if (verifyErr) {
        setLoading(false)
        setError('El enlace de recuperación ha caducado. Solicita uno nuevo.')
        return
      }
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (updateErr) {
      setError(updateErr.message)
      return
    }

    toast('¡Contraseña actualizada! Inicia sesión.', 'success')
    navigate('/login', { replace: true })
  }

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
          <KeyRound size={28} />
        </div>
        <h2 className="font-display text-xl font-extrabold text-text">Nueva contraseña</h2>
        <p className="mt-1 text-sm text-soft">Establece una contraseña nueva y segura.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="new-pass">Nueva contraseña</label>
          <input
            id="new-pass"
            type="password"
            required
            autoComplete="new-password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className="label" htmlFor="new-pass-2">Repetir contraseña</label>
          <input
            id="new-pass-2"
            type="password"
            required
            autoComplete="new-password"
            className="input"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            <ShieldAlert size={17} />
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || !tokenHash} className="btn-primary w-full">
          <ShieldCheck size={18} />
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </AuthLayout>
  )
}
