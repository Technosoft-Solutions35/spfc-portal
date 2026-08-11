import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { LogIn, ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import AuthLayout from '../components/layout/AuthLayout'
import { supabase } from '../lib/supabase'

/**
 * Pantalla de inicio de sesión (usuario + contraseña).
 * Acepta nombre de usuario del clan o, si se introduce un correo
 * (contiene "@"), se autentica directamente con él.
 */
export default function Login() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { toast } = useToast()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from || '/'

  // Resuelve el email a partir del nombre de usuario del clan
  const resolveEmail = async (identifierValue) => {
    const value = identifierValue.trim()
    if (value.includes('@')) return value

    const { data, error } = await supabase.rpc('get_login_email', {
      p_username: value,
    })
    if (error) throw new Error('No se pudo verificar el usuario')
    return data || null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const email = await resolveEmail(identifier)
      if (!email) {
        setError('El usuario no existe en el clan. Verifica tu nombre de usuario.')
        setLoading(false)
        return
      }

      const { error: err } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (err) {
        if (err.message?.toLowerCase().includes('email not confirmed')) {
          setError('Tu correo aún no está verificado. Revisa tu bandeja de entrada.')
        } else if (err.message?.toLowerCase().includes('invalid login')) {
          setError('Usuario o contraseña incorrectos.')
        } else {
          setError('No se pudo iniciar sesión: ' + err.message)
        }
        toast('Credenciales incorrectas', 'error')
        setLoading(false)
        return
      }

      toast(`¡Bienvenido de nuevo, ${profile?.username || ''}!`, 'success')
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message || 'Error inesperado. Inténtalo de nuevo.')
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="identifier">Usuario del clan</label>
          <input
            id="identifier"
            type="text"
            required
            autoComplete="username"
            className="input"
            placeholder="Tu nombre de usuario en el clan"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
          />
          <p className="mt-1 text-[11px] text-soft">
            También puedes iniciar con tu correo electrónico.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Contraseña</label>
            <Link
              to="/recuperar"
              className="mb-1.5 text-xs font-semibold text-primary hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            required
            autoComplete="current-password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            <ShieldAlert size={17} />
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          <LogIn size={18} />
          {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
        </button>

        <p className="pt-2 text-center text-sm text-soft">
          ¿Aún no tienes cuenta?{' '}
          <Link to="/registro" className="font-semibold text-primary hover:underline">
            Crear cuenta
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
