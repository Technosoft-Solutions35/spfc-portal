import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MailCheck, RefreshCcw, ShieldAlert, ShieldCheck } from 'lucide-react'
import AuthLayout from '../components/layout/AuthLayout'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

/**
 * Verificación de registro por correo.
 * Dos vías de activación:
 *   1) Código de 6 dígitos introducido en el input dedicado (email OTP).
 *   2) Si el usuario pulsa el enlace del email de confirmación de Supabase,
 *      la URL llega con un token_hash que se procesa automáticamente aquí.
 */
export default function Verify() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { session } = useAuth()

  const emailFromUrl = searchParams.get('email') || ''
  const tokenHash = searchParams.get('token_hash')

  const [email, setEmail] = useState(emailFromUrl)
  const [digits, setDigits] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const inputsRef = useRef([])
  const autoVerified = useRef(false)

  // Si ya hay sesión (verificación hecha) → al portal
  useEffect(() => {
    if (session) navigate('/', { replace: true })
  }, [session, navigate])

  // Vía 2: token_hash del enlace del email de confirmación
  useEffect(() => {
    if (!tokenHash || autoVerified.current) return
    autoVerified.current = true
    const verifyWithHash = async () => {
      setLoading(true)
      const { error: err } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'email',
      })
      setLoading(false)
      if (err) {
        setError('El enlace de verificación no es válido o ha caducado.')
        return
      }
      toast('¡Cuenta verificada! Bienvenido al clan.', 'success')
      navigate('/', { replace: true })
    }
    verifyWithHash()
  }, [tokenHash, navigate, toast])

  // Enviar / reenviar el código de 6 dígitos por email
  const sendCode = async () => {
    if (!email.trim()) {
      setError('Introduce tu correo para recibir el código.')
      return
    }
    setSending(true)
    setMessage('')
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}${window.location.pathname}#/verificar`,
      },
    })
    setSending(false)
    if (err) {
      setError(err.message)
      return
    }
    setMessage('Hemos enviado un código de 6 dígitos a tu correo.')
    toast('Código enviado a tu correo', 'success')
  }

  // Envía el código automáticamente al entrar a la pantalla
  const sentOnce = useRef(false)
  useEffect(() => {
    if (sentOnce.current) return
    sentOnce.current = true
    if (emailFromUrl) sendCode()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDigit = (index, value) => {
    // Solo dígitos
    const clean = value.replace(/\D/g, '')
    setDigits((prev) => {
      const next = [...prev]
      next[index] = clean.slice(-1)
      return next
    })
    if (clean && index < 5) inputsRef.current[index + 1]?.focus()
  }

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const token = digits.join('')
    if (token.length !== 6) {
      setError('Introduce los 6 dígitos del código.')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: 'email',
    })
    setLoading(false)
    if (err) {
      setError('Código incorrecto o caducado. Vuelve a intentarlo.')
      toast('Código no válido', 'error')
      return
    }
    toast('¡Cuenta verificada! Bienvenido al clan.', 'success')
    navigate('/', { replace: true })
  }

  const pasteCode = (e) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      e.preventDefault()
      setDigits(text.split(''))
      inputsRef.current[5]?.focus()
    }
  }

  return (
    <AuthLayout>
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 inline-flex rounded-2xl bg-primary/10 p-3 text-primary">
          <MailCheck size={28} />
        </div>
        <h2 className="font-display text-xl font-extrabold text-text">Verifica tu cuenta</h2>
        <p className="mt-1 text-sm text-soft">
          Introduce el código de <strong>6 dígitos</strong> que enviamos a tu correo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label" htmlFor="email-verify">Correo registrado</label>
          <input
            id="email-verify"
            type="email"
            required
            className="input text-center"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tucorreo@gmail.com"
          />
        </div>

        {/* Input dedicado de 6 dígitos */}
        <div
          className="flex justify-center gap-2 sm:gap-3"
          onPaste={pasteCode}
        >
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputsRef.current[i] = el)}
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleDigit(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className="input h-14 w-11 rounded-xl text-center text-2xl font-extrabold sm:w-13"
              style={{ width: '3.25rem' }}
              aria-label={`Dígito ${i + 1}`}
            />
          ))}
        </div>

        {message && (
          <p className="flex items-center justify-center gap-2 text-center text-sm font-medium text-success">
            <ShieldCheck size={16} /> {message}
          </p>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            <ShieldAlert size={17} />
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          <ShieldCheck size={18} />
          {loading ? 'Verificando...' : 'Verificar y activar cuenta'}
        </button>

        <button
          type="button"
          onClick={sendCode}
          disabled={sending}
          className="btn-ghost w-full"
        >
          <RefreshCcw size={17} className={sending ? 'animate-spin' : ''} />
          {sending ? 'Enviando...' : 'Reenviar código'}
        </button>
      </form>
    </AuthLayout>
  )
}
