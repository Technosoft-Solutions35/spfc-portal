import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Lock, Pencil, Shield, Trash2, UserCog, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'
import Modal from '../ui/Modal'
import Avatar, { RoleBadge } from '../ui/Avatar'
import { canAssignRoles, generateMemberEmail, ROLES } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
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
  const { role: myRole } = useAuth()
  const canAssign = canAssignRoles(myRole)

  const [members, setMembers] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [viewingId, setViewingId] = useState(null)
  const [modal, setModal] = useState(null) // 'add' | 'edit'
  const [editingId, setEditingId] = useState(null)
  const [addForm, setAddForm] = useState(EMPTY_ADD)
  const [editForm, setEditForm] = useState({})

  const load = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, role, shinies, avatar_url, created_at')
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

  const confirmDelete = async (m) => {
    if (
      !window.confirm(
        `¿Eliminar a "${m.username}"? Perderá el acceso al portal y no se podrá deshacer.`
      )
    )
      return
    setDeleting(m.id)
    const { error } = await supabase.rpc('admin_delete_user', { p_user_id: m.id })
    setDeleting(null)
    if (error) {
      toast('No se pudo eliminar: ' + error.message, 'error')
      return
    }
    toast('Miembro eliminado', 'info')
    load()
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
              <Avatar name={m.username} src={m.avatar_url} size="sm" />
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
    </div>
  )
}
