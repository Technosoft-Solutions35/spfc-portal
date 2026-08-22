import { useState } from 'react'
import { AlertTriangle, Key, Power, PowerOff, ShieldAlert } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import Modal from '../ui/Modal'

export default function EmergencyActions() {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [confirmModal, setConfirmModal] = useState(null) // 'nuke' | 'reactivate'
  const [pwdModal, setPwdModal] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)

  const handleNuke = async () => {
    setBusy(true)
    const { data, error } = await supabase.rpc('nuke_all_accounts')
    setBusy(false)
    if (error) { toast('Error: ' + error.message, 'error'); return }
    toast(`${data} cuentas desactivadas. Solo tu cuenta de super-admin permanece activa.`, 'success')
    setConfirmModal(null)
  }

  const handleReactivate = async () => {
    setBusy(true)
    const { data, error } = await supabase.rpc('reactivate_all_accounts')
    setBusy(false)
    if (error) { toast('Error: ' + error.message, 'error'); return }
    toast(`${data} cuentas reactivadas con rol Miembro.`, 'success')
    setConfirmModal(null)
  }

  const handleSavePassword = async (e) => {
    e.preventDefault()
    if (!newPassword.trim()) { toast('Ingresa una contraseña', 'error'); return }
    setPwdSaving(true)
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key: 'deletion_password', value: newPassword.trim(), updated_at: new Date().toISOString() })
    setPwdSaving(false)
    if (error) { toast('Error: ' + error.message, 'error'); return }
    toast('Contraseña de eliminación actualizada', 'success')
    setPwdModal(false)
    setNewPassword('')
    setCurrentPassword('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
          <ShieldAlert size={20} className="text-primary" /> Acciones de Emergencia
        </h3>
        <p className="text-sm text-soft">Medidas de protección ante situaciones de ciberseguridad internas.</p>
      </div>

      {/* ── Nuke accounts ── */}
      <div className="rounded-2xl border border-primary/30 bg-elevated p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-primary/15 p-2.5 text-primary shrink-0">
            <AlertTriangle size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="font-display font-bold text-text">Desactivar Todas las Cuentas</h4>
            <p className="mt-1 text-sm leading-relaxed text-soft">
              Desactiva <strong>todas</strong> las cuentas excepto la tuya de Super Administrador.
              Los usuarios desactivados no podrán iniciar sesión ni acceder a ninguna función del portal.
              Úsalo si un admin se vuelve loco o detectas acceso no autorizado.
            </p>
            <button
              onClick={() => setConfirmModal('nuke')}
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              <PowerOff size={16} /> Desactivar todas las cuentas
            </button>
          </div>
        </div>
      </div>

      {/* ── Reactivate accounts ── */}
      <div className="rounded-2xl border border-success/30 bg-elevated p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-success/15 p-2.5 text-success shrink-0">
            <Power size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="font-display font-bold text-text">Reactivar Todas las Cuentas</h4>
            <p className="mt-1 text-sm leading-relaxed text-soft">
              Restaura todas las cuentas desactivadas con rol <strong>Miembro</strong>.
              Solo se reactivan cuentas que estén en estado desactivado.
            </p>
            <button
              onClick={() => setConfirmModal('reactivate')}
              disabled={busy}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-success px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              <Power size={16} /> Reactivar todas las cuentas
            </button>
          </div>
        </div>
      </div>

      {/* ── Deletion password ── */}
      <div className="rounded-2xl border border-edge bg-elevated p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-secondary/15 p-2.5 text-secondary shrink-0">
            <Key size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h4 className="font-display font-bold text-text">Contraseña de Eliminación</h4>
            <p className="mt-1 text-sm leading-relaxed text-soft">
              Establece una contraseña que se required para eliminar contenido o miembros.
              Esto impide eliminaciones no autorizadas incluso desde cuentas con permisos.
            </p>
            <button
              onClick={() => setPwdModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-secondary px-5 py-2.5 text-sm font-bold text-white transition hover:brightness-110"
            >
              <Key size={16} /> Configurar contraseña
            </button>
          </div>
        </div>
      </div>

      {/* Confirm nuke/reactivate modal */}
      <Modal open={!!confirmModal} onClose={() => setConfirmModal(null)} title={confirmModal === 'nuke' ? '⚠️ Desactivar todas las cuentas' : 'Reactivar todas las cuentas'}>
        {confirmModal === 'nuke' ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-primary/10 px-4 py-3 text-sm text-primary">
              <p className="font-bold">¿Estás seguro?</p>
              <p className="mt-1">
                Esto desactivará <strong>todas</strong> las cuentas excepto la tuya de Super Administrador.
                Nadie más podrá iniciar sesión hasta que las reactive.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleNuke} disabled={busy} className="btn-primary flex-1">
                {busy ? 'Procesando...' : 'Sí, desactivar todo'}
              </button>
              <button onClick={() => setConfirmModal(null)} className="btn-ghost">Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">
              <p className="font-bold">¿Reactivar todas las cuentas?</p>
              <p className="mt-1">
                Todas las cuentas en estado desactivado serán restauradas con rol <strong>Miembro</strong>.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleReactivate} disabled={busy} className="btn-primary flex-1">
                {busy ? 'Procesando...' : 'Sí, reactivar'}
              </button>
              <button onClick={() => setConfirmModal(null)} className="btn-ghost">Cancelar</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Password config modal */}
      <Modal open={pwdModal} onClose={() => setPwdModal(false)} title="Contraseña de Eliminación">
        <form onSubmit={handleSavePassword} className="space-y-4">
          <p className="text-sm text-soft">
            Esta contraseña se pedirá cada vez que se intente eliminar contenido o miembros.
          </p>
          <div>
            <label className="label" htmlFor="new-del-pwd">Nueva contraseña</label>
            <input
              id="new-del-pwd"
              type="password"
              className="input"
              required
              minLength={4}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={pwdSaving} className="btn-primary flex-1">
              {pwdSaving ? 'Guardando...' : 'Guardar contraseña'}
            </button>
            <button type="button" onClick={() => setPwdModal(false)} className="btn-ghost">Cancelar</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
