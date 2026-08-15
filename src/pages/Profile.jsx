import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, KeyRound, Lock, Pencil, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import ImageInput from '../components/ui/ImageInput'
import ProfileView from '../components/profile/ProfileView'
import { AFFILIATIONS, BIO_MAX, GAME_ROLES } from '../lib/utils'

/**
 * DLC 1 — Perfil propio.
 * Modo lectura: igual que el perfil de terceros. Al pulsar el lápiz se abren
 * los campos editables (avatar, IGN, afiliación, roles de juego y bio).
 * El email y el username de acceso son fijos (gestionados por Supabase).
 * El super-admin también puede cambiar su propia contraseña desde aquí.
 */
export default function Profile() {
  const { user, profile: authProfile, role, refreshProfile } = useAuth()
  const { toast } = useToast()

  const [profile, setProfile] = useState(null)
  const [hall, setHall] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [changing, setChanging] = useState(false)

  const [form, setForm] = useState({
    avatar_url: '',
    title: '',
    ign: '',
    affiliation: '',
    game_roles: [],
    bio: '',
    birth_date: '',
  })

  useEffect(() => {
    if (!authProfile?.id) return
    let mounted = true

    supabase
      .from('profiles')
      .select('*')
      .eq('id', authProfile.id)
      .single()
      .then(({ data }) => {
        if (!mounted) return
        setProfile(data)
        setForm({
          avatar_url: data.avatar_url || '',
          title: data.title || '',
          ign: data.ign || '',
          affiliation: data.affiliation || '',
          game_roles: data.game_roles || [],
          bio: data.bio || '',
          birth_date: data.birth_date || '',
        })
      })

    supabase
      .from('hall_of_fame')
      .select('id, pokemon_name, image_url, created_at')
      .eq('user_id', authProfile.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => mounted && setHall(data || []))

    return () => {
      mounted = false
    }
  }, [authProfile?.id])

  const toggleRole = (role) => {
    setForm((f) => ({
      ...f,
      game_roles: f.game_roles.includes(role)
        ? f.game_roles.filter((r) => r !== role)
        : [...f.game_roles, role],
    }))
  }

  const save = async () => {
    if (form.bio.length > BIO_MAX) {
      toast(`La bio no puede superar ${BIO_MAX} caracteres`, 'error')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: form.avatar_url || null,
        title: form.title.trim() || null,
        ign: form.ign.trim() || null,
        affiliation: form.affiliation || null,
        game_roles: form.game_roles,
        bio: form.bio.trim() || null,
        birth_date: form.birth_date || null,
      })
      .eq('id', authProfile.id)

    setSaving(false)
    if (error) {
      toast('No se pudo guardar: ' + error.message, 'error')
      return
    }
    toast('Perfil actualizado', 'success')
    setEditing(false)
    refreshProfile?.()
  }

  // Cambio de contraseña (solo super-admin). Verifica la contraseña actual
  // re-autenticando con ella y después aplica la nueva en Supabase Auth.
  const changePassword = async (e) => {
    e.preventDefault()
    if (pwForm.next.length < 6) return toast('La nueva contraseña debe tener al menos 6 caracteres.', 'error')
    if (pwForm.next !== pwForm.confirm) return toast('Las contraseñas nuevas no coinciden.', 'error')
    if (!pwForm.current) return toast('Introduce tu contraseña actual.', 'error')
    setChanging(true)
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: user?.email || '',
      password: pwForm.current,
    })
    if (verifyErr) {
      setChanging(false)
      return toast('La contraseña actual es incorrecta.', 'error')
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: pwForm.next })
    setChanging(false)
    if (updErr) return toast('No se pudo cambiar la contraseña: ' + updErr.message, 'error')
    toast('Contraseña actualizada. Úsala en tu próximo inicio de sesión.', 'success')
    setPwForm({ current: '', next: '', confirm: '' })
  }

  // Elimina un shiny aprobado por error (solo super-admin) del perfil mostrado
  const deleteShiny = async (h) => {
    if (!window.confirm(`¿Eliminar "${h.pokemon_name}" de este perfil? Se quitará 1 shiny del contador.`)) return
    const { error } = await supabase.rpc('delete_hall_of_fame_entry', { p_id: h.id })
    if (error) return toast('No se pudo eliminar: ' + error.message, 'error')
    setHall((prev) => prev.filter((x) => x.id !== h.id))
    toast('Shiny eliminado del perfil', 'success')
    refreshProfile?.()
  }

  if (!profile) return <Spinner full label="Cargando tu perfil..." />

  return (
    <div>
      <PageHeader
        title="Mi Perfil"
        subtitle="Tus datos públicos de juego y tu historial de shinies aprobados."
        icon={User}
      />

      {/* Lápiz flotante: activa el modo edición */}
      {!editing && (
        <button
          onClick={() => setEditing(true)}
          className="fixed right-5 top-[132px] z-[60] flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg transition hover:brightness-110 sm:right-6 lg:right-8 lg:top-24"
          title="Editar perfil"
          aria-label="Editar perfil"
        >
          <Pencil size={18} />
        </button>
      )}

      {editing ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Avatar */}
          <div>
            <label className="label">Foto de perfil</label>
            <ImageInput
              value={form.avatar_url}
              onChange={(url) => setForm((f) => ({ ...f, avatar_url: url }))}
              allowUrl={false}
              folder={`${authProfile.id}/avatars`}
            />
          </div>

          {/* Título personal */}
          <div>
            <label className="label">Título personal (opcional)</label>
            <input
              type="text"
              className="input"
              maxLength={60}
              placeholder="Ej: Youtuber, Capitán, Creador de contenido…"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
            <p className="mt-1 text-[10px] text-soft">
              Aparece junto a tu nombre en tu perfil. Déjalo vacío para no mostrar título.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Nombre en el juego (IGN)</label>
              <input
                type="text"
                className="input"
                placeholder="Tu personaje de PokeMMO"
                value={form.ign}
                onChange={(e) => setForm((f) => ({ ...f, ign: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Afiliación de clan</label>
              <select
                className="input"
                value={form.affiliation}
                onChange={(e) => setForm((f) => ({ ...f, affiliation: e.target.value }))}
              >
                <option value="">Sin especificar</option>
                {AFFILIATIONS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fecha de nacimiento */}
          <div>
            <label className="label">Fecha de nacimiento (opcional)</label>
            <input
              type="date"
              className="input"
              value={form.birth_date}
              onChange={(e) => setForm((f) => ({ ...f, birth_date: e.target.value }))}
            />
            <p className="mt-1 text-[10px] text-soft">
              Se usa solo para el calendario de cumpleaños del clan. Puedes dejarla vacía.
            </p>
          </div>

          {/* Roles de juego */}
          <div>
            <label className="label">Roles / profesiones en el juego</label>
            <div className="flex flex-wrap gap-2">
              {GAME_ROLES.map((role) => {
                const active = form.game_roles.includes(role)
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-edge text-soft hover:border-primary/40 hover:text-text'
                    }`}
                  >
                    {active ? '✓ ' : ''}{role}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center justify-between">
              <label className="label">Descripción (bio)</label>
              <span
                className={`text-[11px] font-semibold ${
                  form.bio.length > BIO_MAX ? 'text-primary' : 'text-soft'
                }`}
              >
                {form.bio.length}/{BIO_MAX}
              </span>
            </div>
            <textarea
              className="input min-h-[100px]"
              maxLength={BIO_MAX}
              placeholder="Cuéntale al clan quién eres en PokeMMO…"
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={save} disabled={saving} className="btn-primary">
              <Check size={17} />
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button onClick={() => setEditing(false)} className="btn-ghost">
              Cancelar
            </button>
          </div>

          {/* Seguridad: solo el super-admin puede cambiar su propia contraseña */}
          {role === 'super-admin' && (
            <div className="mt-8 rounded-2xl border border-edge bg-elevated p-5">
              <h3 className="flex items-center gap-2 font-display font-bold text-text">
                <KeyRound size={18} className="text-primary" />
                Seguridad · Cambiar contraseña
              </h3>
              <p className="mt-1 text-xs text-soft">
                Tu contraseña nunca se muestra en el código. Cámbiala aquí siempre que quieras.
              </p>
              <form onSubmit={changePassword} className="mt-4 space-y-4">
                <div>
                  <label className="label" htmlFor="pw-current">Contraseña actual</label>
                  <input
                    id="pw-current"
                    type="password"
                    required
                    autoComplete="current-password"
                    className="input"
                    value={pwForm.current}
                    onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="label" htmlFor="pw-next">Nueva contraseña</label>
                    <input
                      id="pw-next"
                      type="password"
                      required
                      autoComplete="new-password"
                      minLength={6}
                      className="input"
                      placeholder="Mínimo 6 caracteres"
                      value={pwForm.next}
                      onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="label" htmlFor="pw-confirm">Repite la nueva contraseña</label>
                    <input
                      id="pw-confirm"
                      type="password"
                      required
                      autoComplete="new-password"
                      minLength={6}
                      className="input"
                      value={pwForm.confirm}
                      onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                    />
                  </div>
                </div>
                <button type="submit" disabled={changing} className="btn-primary">
                  <Lock size={16} />
                  {changing ? 'Actualizando…' : 'Cambiar contraseña'}
                </button>
              </form>
            </div>
          )}
        </motion.div>
      ) : (
        <ProfileView
          profile={profile}
          hall={hall}
          loadingHall={!hall}
          canDeleteShinies={role === 'super-admin'}
          onDeleteShiny={role === 'super-admin' ? deleteShiny : undefined}
        />
      )}
    </div>
  )
}
