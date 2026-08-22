import { useState } from 'react'
import { Lock } from 'lucide-react'
import Modal from './Modal'

/**
 * Modal de confirmación con contraseña para acciones destructivas.
 * `open` activa el modal; `onConfirm` se llama con la contraseña validada;
 * `onClose` lo cierra.
 */
export default function DeletionPasswordModal({ open, onClose, onConfirm }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('Ingresa la contraseña.')
      return
    }
    setChecking(true)
    setError('')
    try {
      await onConfirm(password)
      setPassword('')
    } catch (err) {
      setError(err?.message || 'Contraseña incorrecta.')
    } finally {
      setChecking(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setError('')
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Confirmar eliminación">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-xl bg-primary/10 px-4 py-3">
          <Lock size={18} className="shrink-0 text-primary" />
          <p className="text-sm text-text">
            Se requiere la <strong>contraseña de eliminación</strong> para realizar esta acción.
          </p>
        </div>

        <div>
          <label className="label" htmlFor="del-pwd">Contraseña</label>
          <input
            id="del-pwd"
            type="password"
            className="input"
            placeholder="••••••••"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            autoFocus
          />
          {error && <p className="mt-1 text-xs text-primary">{error}</p>}
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={checking} className="btn-primary flex-1">
            {checking ? 'Verificando...' : 'Confirmar eliminación'}
          </button>
          <button type="button" onClick={handleClose} className="btn-ghost">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}
