import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { KeyRound, Lock, Pencil, Shield, Trash2, UserCog, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'
import Modal from '../ui/Modal'
import DeletionPasswordModal from '../ui/DeletionPasswordModal'
import { RoleBadge } from '../ui/Avatar'
import ProfileAvatar from '../ui/ProfileAvatar'
import { canAssignRoles, generateMemberEmail, ROLES } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { usePresence } from '../../context/PresenceContext'
import ProfileModal from '../profile/ProfileModal'

const ROLE_OPTIONS = [
  { value: ROLES.SUPER_ADMIN, label: 'Super Administrador' },
  { value: ROLES.ADMIN, label: 'Administrador' },
  { value: ROLES.GESTOR, label: 'Gestor' },
  { value: ROLES.MEMBER, label: 'Miembro' },
]

const EMPTY_ADD = { username: '', password: '' }

/**
 * Gestión de miembros y roles (CRUD completo).
 * Solo el super-admin puede crear, editar o eliminar miembros;
 * el resto del staff ve la lista en modo lectura.
 */
export default function MembersManager() {
  const { toast } = useToast()
  const { role: myRole, profile: currentUser } = useAuth()
  const { isOnline } = usePresence()
  const canAssign = canAssignRoles(myRole)

  const [members, setMembers] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [modal, setModal] = useState(null) // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null)
  const [addForm, setAddForm] = useState(EMPTY_ADD)
  const [editForm, setEditForm] = useState({})
  const [deletePending, setDeletePending] = useState(null)
  const [deletePwdOpen, setDeletePwdOpen] = useState(false)
  const [resetPwUser, setResetPwUser] = useState(null)
  const [resetPwForm, setResetPwForm] = useState({ password: '', confirm: '' })
  const [resetting, setResetting] = useState(false)

  const totalCount = members?.length ?? 0
  const onlineCount = members ? members.filter((m) => isOnline(m.id)).length : 0
  const offlineCount = Math.max(0, totalCount - onlineCount)

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, role, shinies, avatar_url, title, created_at')
      .order('created_at', { ascending: false })
    setMembers(data || [])
  }

  useEffect(() => {
    load()
  }, [])

  const openAdd = () => {
    setAddForm(EMPTY_ADD)
    setModal('add')
  }

  const openEdit = (m) => {
    setEditingId(m.id)
    setEditForm({
      username: m.username,
      email: m.email,
      role: m.role,
      shinies: m.shinies ?? 0,
      avatar_url: m.avatar_url || '',
      title: m.title || '',
    })
    setModal('edit')
  }

  const addMember = async (e) => {
    e.preventDefault()
    setBusy(true)
    // Supabase Auth necesita un email como identificador; como el clan no
    // valida correos, se genera uno automáticamente a partir del usuario.
    const { error } = await supabase.rpc('admin_invite_member', {
      p_email: generateMemberEmail(addForm.username),
      p_username: addForm.username.trim(),
      p_password: addForm.password,
    })
    setBusy(false)
    if (error) {
      toast('No se pudo crear el miembro: ' + error.message, 'error')
      return
    }
    toast('Miembro creado. Ya puede iniciar sesión con esas credenciales.', 'success')
    setModal(null)
    load()
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        username: editForm.username.trim(),
        role: editForm.role,
        shinies: Number(editForm.shinies) || 0,
        avatar_url: editForm.avatar_url.trim() || null,
        title: editForm.title.trim() || null,
      })
      .eq('id', editingId)
    setBusy(false)
    if (error) {
      toast('No se pudo guardar: ' + error.message, 'error')
      return
    }
    toast('Miembro actualizado', 'success')
    setModal(null)
    load()
  }

  const confirmDelete = (m) => {
    // El super-admin puede borrar sin contraseña de confirmación
    if (myRole === ROLES.SUPER_ADMIN) {
      deleteMember(m)
      return
    }
    setDeletePending(m)
    setDeletePwdOpen(true)
  }

  const deleteMember = async (m) => {
    setDeleting(m.id)
    const { error: delError } = await supabase.rpc('admin_delete_user', { p_user_id: m.id })
    setDeleting(null)
    if (delError) {
      toast('No se pudo eliminar: ' + delError.message, 'error')
      return
    }
    toast('Miembro eliminado', 'info')
    load()
  }

  const handleDeleteWithPassword = async (password) => {
    const { data, error } = await supabase.rpc('verify_deletion_password', { p_password: password })
    let valid = !error && data
    // Si la contraseña de eliminación no está configurada o no coincide,
    // se valida la contraseña real de la cuenta del usuario.
    if (!valid && currentUser?.email) {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password,
      })
      valid = !signErr
    }
    if (!valid) throw new Error('Contraseña incorrecta')

    setDeletePwdOpen(false)
    setDeletePending(null)
    deleteMember(deletePending)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (resetPwForm.password.length < 6) return toast('La contraseña debe tener al menos 6 caracteres', 'error')
    if (resetPwForm.password !== resetPwForm.confirm) return toast('Las contraseñas no coinciden', 'error')
    setResetting(true)
    const { error } = await supabase.rpc('admin_reset_user_password', {
      p_user_id: resetPwUser.id,
      p_new_password: resetPwForm.password,
    })
    setResetting(false)
    if (error) {
      toast('No se pudo resetear la contraseña: ' + error.message, 'error')
      return
    }
    toast(`Contraseña de ${resetPwUser.username} actualizada`, 'success')
    setResetPwUser(null)
    setResetPwForm({ password: '', confirm: '' })
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
            <UserCog size={20} className="text-primary" />
            Miembros y roles
          </h3>
          <p className="text-sm text-soft">
            Roles: <strong>super-admin</strong> (otorga roles y acceso total),{' '}
            <strong>admin</strong> (acceso total), <strong>gestor</strong> (noticias y contadores){' '}
            y <strong>member</strong> (solo lectura).
          </p>
          <div className="mt-3 grid max-w-md grid-cols-3 gap-3">
            <div className="rounded-xl border border-edge bg-surface px-4 py-3">
              <p className="font-display text-2xl font-extrabold leading-none text-text">{totalCount}</p>
              <p className="mt-1 text-xs text-soft">Cuentas registradas</p>
            </div>
            <div className="rounded-xl border border-edge bg-surface px-4 py-3">
              <p className="flex items-center gap-2 font-display text-2xl font-extrabold leading-none text-text">
                {onlineCount}
                <span className="h-2.5 w-2.5 rounded-full bg-success" />
              </p>
              <p className="mt-1 text-xs text-soft">Conectados</p>
            </div>
            <div className="rounded-xl border border-edge bg-surface px-4 py-3">
              <p className="flex items-center gap-2 font-display text-2xl font-extrabold leading-none text-text">
                {offlineCount}
                <span className="h-2.5 w-2.5 rounded-full bg-gray-300" />
              </p>
              <p className="mt-1 text-xs text-soft">Desconectados</p>
            </div>
          </div>
        </div>
        {canAssign && (
          <button onClick={openAdd} className="btn-primary">
            <UserPlus size={17} />
            Agregar miembro
          </button>
        )}
      </div>

      {!members ? (
        <Spinner label="Cargando miembros..." />
      ) : members.length === 0 ? (
        <EmptyState title="Sin miembros" icon={Shield} />
      ) : (
        <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge">
          {members.map((m) => (
            <motion.li
              key={m.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-wrap items-center gap-3 px-4 py-3 transition hover:bg-background"
            >
              <div className="relative shrink-0">
                <ProfileAvatar userId={m.id} name={m.username} src={m.avatar_url} size="sm" />
                <span
                  className={`pointer-events-none absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-background ${
                    isOnline(m.id) ? 'bg-success' : 'bg-gray-300'
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => setViewingId(m.id)}
                  className="truncate font-semibold text-text transition hover:text-primary"
                >
                  {m.username}
                </button>
                <p className="truncate text-xs text-soft">{m.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <RoleBadge role={m.role} />
                {canAssign ? (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(m)}
                      title="Editar miembro"
                      className="rounded-lg p-2 text-soft transition hover:bg-secondary/10 hover:text-secondary"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => { setResetPwUser(m); setResetPwForm({ password: '', confirm: '' }) }}
                      title="Resetear contraseña"
                      className="rounded-lg p-2 text-soft transition hover:bg-warning/10 hover:text-secondary"
                    >
                      <KeyRound size={16} />
                    </button>
                    <button
                      onClick={() => confirmDelete(m)}
                      title="Eliminar miembro"
                      disabled={deleting === m.id}
                      className="rounded-lg p-2 text-soft transition hover:bg-primary/10 hover:text-primary disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <span className="flex items-center gap-1 rounded-lg border border-edge px-2 py-1 text-xs text-soft">
                    <Lock size={12} />
                    Solo super-admin edita
                  </span>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-soft">
        {canAssign
          ? 'Puedes crear miembros, editar sus datos/roles y eliminar cuentas del clan.'
          : 'La gestión de miembros y roles está reservada al super-admin.'}
      </p>

      {/* Modal: agregar miembro */}
      <Modal open={modal === 'add'} onClose={() => setModal(null)} title="Nuevo miembro">
        <form onSubmit={addMember} className="space-y-4">
          <div>
            <label className="label" htmlFor="add-username">Usuario del clan</label>
            <input
              id="add-username"
              type="text"
              required
              className="input"
              placeholder="Nombre de usuario en el clan"
              value={addForm.username}
              onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="add-password">Contraseña inicial</label>
            <input
              id="add-password"
              type="password"
              required
              minLength={6}
              className="input"
              placeholder="••••••••"
              value={addForm.password}
              onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
            />
          </div>
          <p className="rounded-xl bg-secondary/10 px-4 py-3 text-xs text-secondary">
            La cuenta se creará con rol <strong>Miembro</strong> y el correo verificado: podrá
            iniciar sesión de inmediato con las credenciales que le entregues.
          </p>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? 'Creando...' : 'Crear miembro'}
            </button>
            <button type="button" onClick={() => setModal(null)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: editar miembro */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="Editar miembro">
        <form onSubmit={saveEdit} className="space-y-4">
          <div>
            <label className="label" htmlFor="edit-username">Usuario del clan</label>
            <input
              id="edit-username"
              type="text"
              required
              className="input"
              value={editForm.username || ''}
              onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="edit-email">Correo (no editable)</label>
            <input id="edit-email" type="email" readOnly className="input opacity-60" value={editForm.email || ''} />
          </div>
          <div>
            <label className="label" htmlFor="edit-role">Rol</label>
            <select
              id="edit-role"
              className="input"
              value={editForm.role || ROLES.MEMBER}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="edit-shinies">Contador de shinies</label>
            <input
              id="edit-shinies"
              type="number"
              min={0}
              className="input"
              value={editForm.shinies ?? 0}
              onChange={(e) => setEditForm({ ...editForm, shinies: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="edit-title">Título personal (opcional)</label>
            <input
              id="edit-title"
              type="text"
              className="input"
              maxLength={60}
              placeholder="Ej: Youtuber, Capitán, Creador de contenido…"
              value={editForm.title || ''}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="edit-avatar">URL de avatar (opcional)</label>
            <input
              id="edit-avatar"
              type="text"
              className="input"
              placeholder="https://..."
              value={editForm.avatar_url || ''}
              onChange={(e) => setEditForm({ ...editForm, avatar_url: e.target.value })}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={() => setModal(null)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Perfil de un miembro al hacer clic en su nombre */}
      <ProfileModal userId={viewingId} onClose={() => setViewingId(null)} />

      <DeletionPasswordModal
        open={deletePwdOpen}
        onClose={() => { setDeletePwdOpen(false); setDeletePending(null) }}
        onConfirm={handleDeleteWithPassword}
      />

      {/* Modal: resetear contraseña */}
      <Modal
        open={!!resetPwUser}
        onClose={() => { setResetPwUser(null); setResetPwForm({ password: '', confirm: '' }) }}
        title={`Resetear contraseña de ${resetPwUser?.username || ''}`}
      >
        <form onSubmit={handleResetPassword} className="space-y-4">
          <p className="rounded-xl bg-secondary/10 px-4 py-3 text-xs text-secondary">
            El usuario podrá iniciar sesión inmediatamente con la nueva contraseña.
          </p>
          <div>
            <label className="label" htmlFor="reset-pw">Nueva contraseña</label>
            <input
              id="reset-pw"
              type="password"
              required
              minLength={6}
              className="input"
              placeholder="Mínimo 6 caracteres"
              value={resetPwForm.password}
              onChange={(e) => setResetPwForm((f) => ({ ...f, password: e.target.value }))}
            />
          </div>
          <div>
            <label className="label" htmlFor="reset-pw-confirm">Repetir contraseña</label>
            <input
              id="reset-pw-confirm"
              type="password"
              required
              minLength={6}
              className="input"
              value={resetPwForm.confirm}
              onChange={(e) => setResetPwForm((f) => ({ ...f, confirm: e.target.value }))}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={resetting} className="btn-primary flex-1">
              <KeyRound size={16} />
              {resetting ? 'Actualizando...' : 'Resetear contraseña'}
            </button>
            <button type="button" onClick={() => { setResetPwUser(null); setResetPwForm({ password: '', confirm: '' }) }} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
