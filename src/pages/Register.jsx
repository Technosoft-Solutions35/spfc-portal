import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck, ShieldAlert, UserPlus } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout'
import { useToast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'
import { generateMemberEmail } from '../lib/utils'

/**
 * Registro de nuevos miembros del clan.
 * Crea la cuenta directamente en la base (correo verificado al instante,
 * sin emails de confirmación ni rate limits de Supabase Auth) y arranca
 * sesión automáticamente.
 */
export default function Register() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const name = username.trim()
    if (name.length < 3) return setError('El nombre de usuario debe tener al menos 3 caracteres.')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (password !== confirm) return setError('Las contraseñas no coinciden.')

    // Supabase Auth necesita un email como identificador; como el clan no
    // valida correos, se genera uno automáticamente a partir del usuario.
    const email = generateMemberEmail(name)

    setLoading(true)

    const { error: err } = await supabase.rpc('public_register_member', {
      p_email: email,
      p_username: name,
      p_password: password,
    })

    if (err) {
      setLoading(false)
      setError(err.message)
      return
    }

    // Inicia sesión automáticamente con las credenciales recién creadas
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    setLoading(false)

    if (signErr) {
      toast('Cuenta creada. Inicia sesión con tus credenciales.', 'success')
      navigate('/login', { replace: true })
      return
    }

    toast('¡Cuenta creada! Bienvenido al clan.', 'success')
    navigate('/', { replace: true })
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="username">Nombre de usuario (en el juego)</label>
          <input
            id="username"
            type="text"
            required
            className="input"
            placeholder="Ramón, KarpadorPro, ..."
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">Contraseña</label>
            <input
              id="password"
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
            <label className="label" htmlFor="confirm">Repetir contraseña</label>
            <input
              id="confirm"
              type="password"
              required
              autoComplete="new-password"
              className="input"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            <ShieldAlert size={17} />
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <MailCheck size={18} className="animate-pulse" /> : <UserPlus size={18} />}
          {loading ? 'Creando cuenta...' : 'Crear cuenta'}
        </button>

        <p className="pt-1 text-center text-xs text-soft">
          Tu cuenta quedará activa al instante, sin necesidad de verificar correo.
        </p>

        <p className="pt-1 text-center text-sm text-soft">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
