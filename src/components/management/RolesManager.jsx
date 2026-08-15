import { useEffect, useState } from 'react'
import { Check, Save, ShieldCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'
import { PERMISSIONS, ROLE_LABELS, ROLES } from '../../lib/utils'
import Spinner from '../ui/Spinner'

const EDITABLE_ROLES = [ROLES.ADMIN, ROLES.GESTOR, ROLES.MEMBER]

export default function RolesManager() {
  const { profile, refreshPermissions } = useAuth()
  const { toast } = useToast()

  const [state, setState] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role, permission')
      if (!error && mounted) {
        const next = {
          [ROLES.ADMIN]: [],
          [ROLES.GESTOR]: [],
          [ROLES.MEMBER]: [],
        }
        ;(data || []).forEach((r) => {
          if (next[r.role]) next[r.role].push(r.permission)
        })
        setState(next)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  if (!state) return <Spinner label="Cargando matriz de permisos..." />

  const toggle = (role, perm) => {
    setState((prev) => ({
      ...prev,
      [role]: prev[role].includes(perm)
        ? prev[role].filter((p) => p !== perm)
        : [...prev[role], perm],
    }))
  }

  const save = async () => {
    if (profile?.role !== ROLES.SUPER_ADMIN) return
    setSaving(true)
    const { error } = await supabase.rpc('save_role_permissions', { p_permissions: state })
    setSaving(false)
    if (error) return toast('No se pudieron guardar: ' + error.message, 'error')
    await refreshPermissions()
    toast('Permisos actualizados', 'success')
  }

  const Cell = ({ active, disabled, onClick }) => (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex h-7 w-7 items-center justify-center rounded-lg border transition ${
        active
          ? 'border-primary bg-primary text-white'
          : 'border-edge bg-surface text-transparent'
      } ${disabled ? 'cursor-not-allowed opacity-60' : 'hover:brightness-110'}`}
      aria-pressed={active}
    >
      <Check size={15} />
    </button>
  )

  return (
    <div className="rounded-2xl border border-edge bg-elevated p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
            <ShieldCheck size={20} className="text-primary" />
            Roles y Permisos
          </h3>
          <p className="mt-1 max-w-xl text-xs text-soft">
            Marca qué puede hacer cada rol. El <strong>Super Administrador</strong> siempre tiene
            acceso total (fijo). Los cambios aplican al próximo inicio de sesión de cada miembro.
          </p>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary">
          <Save size={17} />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-soft">
              <th className="border-b border-edge px-4 py-3">Permiso</th>
              {[ROLES.SUPER_ADMIN, ...EDITABLE_ROLES].map((r) => (
                <th key={r} className="border-b border-edge px-3 py-3 text-center">
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm) => (
              <tr key={perm.key} className="border-b border-edge">
                <td className="border-b border-edge px-4 py-2.5 text-sm text-text">
                  {perm.label}
                </td>
                <td className="border-b border-edge px-3 py-2.5 text-center">
                  <Cell active disabled />
                </td>
                {EDITABLE_ROLES.map((role) => (
                  <td key={role} className="border-b border-edge px-3 py-2.5 text-center">
                    <Cell
                      active={state[role].includes(perm.key)}
                      onClick={() => toggle(role, perm.key)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
