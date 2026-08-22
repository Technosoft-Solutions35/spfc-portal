import { useEffect, useState } from 'react'
import { Activity, BarChart3, Bell, CheckSquare, Database, Download, HardDrive, Image, Shield, ShieldCheck, Upload, Zap, Wrench } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useMaintenance } from '../context/MaintenanceContext'
import { useToast } from '../components/ui/Toast'
import { ROLES } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import SystemStats from '../components/admin/SystemStats'
import AuditLogViewer from '../components/admin/AuditLogViewer'
import PushNotificationCenter from '../components/admin/PushNotificationCenter'
import SystemImagesManager from '../components/admin/SystemImagesManager'
import DataExporter from '../components/admin/DataExporter'
import SystemHealth from '../components/admin/SystemHealth'
import IntegrationsManager from '../components/admin/IntegrationsManager'
import { MaintenanceInlineBanner } from '../components/MaintenanceBanner'

const TABS = {
  stats: { label: 'Estadísticas', icon: BarChart3 },
  audit: { label: 'Registro de Actividad', icon: Activity },
  actions: { label: 'Acciones Inmediatas', icon: Zap },
  roles: { label: 'Roles y Permisos', icon: ShieldCheck },
  push: { label: 'Notificaciones', icon: Bell },
  images: { label: 'Imágenes del Sistema', icon: Image },
  export: { label: 'Exportar Datos', icon: Download },
  health: { label: 'Salud del Sistema', icon: HardDrive },
  integrations: { label: 'Integraciones', icon: Database },
}

export default function AdminDashboard() {
  const { role, profileLoading } = useAuth()
  const [tab, setTab] = useState('stats')

  useEffect(() => {
    if (!profileLoading && role !== ROLES.SUPER_ADMIN) {
      setTab('stats')
    }
  }, [role, profileLoading])

  if (role !== ROLES.SUPER_ADMIN) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-soft">Acceso restringido a super-administradores.</p>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="Panel de Administración"
        subtitle="Estadísticas, auditoría, configuración del sistema y herramientas avanzadas."
        icon={Shield}
      />

      <div className="mb-6 flex flex-wrap gap-2.5">
        {Object.entries(TABS).map(([key, t]) => {
          const Icon = t.icon
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-xl px-5 py-3 text-base font-semibold transition ${
                active
                  ? 'bg-primary text-white shadow-glow'
                  : 'border border-edge bg-elevated text-soft hover:text-text'
              }`}
            >
              <Icon size={18} />
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'stats' && <SystemStats />}
      {tab === 'audit' && <AuditLogViewer />}
      {tab === 'actions' && <ActionsPanel />}
      {tab === 'roles' && <RolesManager />}
      {tab === 'push' && <PushNotificationCenter />}
      {tab === 'images' && <SystemImagesManager />}
      {tab === 'export' && <DataExporter />}
      {tab === 'health' && <SystemHealth />}
      {tab === 'integrations' && <IntegrationsManager />}
    </div>
  )
}

// ── Acciones Inmediatas (mantenimiento, etc.) ──
function ActionsPanel() {
  const { maintenance, toggle } = useMaintenance()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  const handleToggle = async () => {
    setBusy(true)
    const { ok, error } = await toggle()
    setBusy(false)
    if (ok) {
      toast(
        maintenance
          ? 'Modo mantenimiento desactivado. Todos los miembros pueden acceder.'
          : 'Modo mantenimiento activado. Solo admin/super-admin pueden acceder.',
        maintenance ? 'success' : 'info',
      )
    } else {
      toast('Error al cambiar modo mantenimiento: ' + (error?.message || 'desconocido'), 'error')
    }
  }

  if (maintenance === null) {
    return <p className="text-sm text-soft">Cargando configuración...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
          <Zap size={20} className="text-primary" /> Acciones Inmediatas
        </h3>
        <p className="text-sm text-soft">Controles de emergencia del portal. Solo super-administradores.</p>
      </div>

      {maintenance && <MaintenanceInlineBanner />}

      <div className="rounded-2xl border border-edge bg-elevated p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="rounded-xl bg-yellow-500/15 p-2.5 text-yellow-600">
                <Wrench size={20} />
              </span>
              <div>
                <h4 className="font-display font-bold text-text">Modo Mantenimiento</h4>
                <p className="text-xs text-soft">
                  Bloquea el acceso a todos los miembros excepto admin y super-admin.
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-soft">
              Cuando está activo, los miembros con sesión iniciada son redirigidos
              a la página de mantenimiento. Los usuarios no autenticados no pueden
              iniciar sesión. Tú y los demás administradores pueden seguir navegando normalmente.
            </p>
          </div>
          <button
            onClick={handleToggle}
            disabled={busy}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
              maintenance ? 'bg-yellow-500' : 'bg-edge'
            } ${busy ? 'opacity-60' : ''}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                maintenance ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              maintenance
                ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300'
                : 'bg-success/15 text-success'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${maintenance ? 'bg-yellow-500' : 'bg-success'}`} />
            {maintenance ? 'Activo — Solo administradores' : 'Inactivo — Acceso abierto'}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Roles & Permissions (CRUD roles + matriz) ──
import { Check, Save } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { PERMISSIONS, ROLE_LABELS } from '../lib/utils'
import Spinner from '../components/ui/Spinner'

const EDITABLE_ROLES = [ROLES.ADMIN, ROLES.GESTOR, ROLES.MEMBER]

function RolesManager() {
  const { profile, refreshPermissions } = useAuth()
  const { toast } = useToast()
  const [state, setState] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase.from('role_permissions').select('role, permission')
      if (!error && mounted) {
        const next = { [ROLES.ADMIN]: [], [ROLES.GESTOR]: [], [ROLES.MEMBER]: [] }
        ;(data || []).forEach((r) => {
          if (next[r.role]) next[r.role].push(r.permission)
        })
        setState(next)
      }
    })()
    return () => { mounted = false }
  }, [])

  if (!state) return <Spinner label="Cargando matriz de permisos..." />

  const toggle = (role, perm) => {
    setState((prev) => ({
      ...prev,
      [role]: prev[role].includes(perm) ? prev[role].filter((p) => p !== perm) : [...prev[role], perm],
    }))
  }

  const save = async () => {
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
        active ? 'border-primary bg-primary text-white' : 'border-edge bg-surface text-transparent'
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
            Marca qué puede hacer cada rol. El <strong>Super Administrador</strong> siempre tiene acceso total (fijo).
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
                <th key={r} className="border-b border-edge px-3 py-3 text-center">{ROLE_LABELS[r]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSIONS.map((perm) => (
              <tr key={perm.key} className="border-b border-edge">
                <td className="border-b border-edge px-4 py-2.5 text-sm text-text">{perm.label}</td>
                <td className="border-b border-edge px-3 py-2.5 text-center"><Cell active disabled /></td>
                {EDITABLE_ROLES.map((role) => (
                  <td key={role} className="border-b border-edge px-3 py-2.5 text-center">
                    <Cell active={state[role].includes(perm.key)} onClick={() => toggle(role, perm.key)} />
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
