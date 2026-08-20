import { useEffect, useState } from 'react'
import { BookOpen, Box, CalendarDays, Newspaper, Settings, ShieldCheck, Swords, Users, Wrench } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useMaintenance } from '../context/MaintenanceContext'
import { useToast } from '../components/ui/Toast'
import { canAssignRoles, ROLES, PVP_TIERS, PVE_TIERS } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import ContentManager from '../components/management/ContentManager'
import MembersManager from '../components/management/MembersManager'
import RolesManager from '../components/management/RolesManager'
import { NEWS_CATEGORIES, GUIDE_CATEGORIES, MOD_CATEGORIES } from '../lib/utils'
import { useCrud } from '../hooks/useCrud'
import { MaintenanceInlineBanner } from '../components/MaintenanceBanner'

const TABS = {
  news: { label: 'Noticias', icon: Newspaper, permission: 'content' },
  'eventos-torneos': { label: 'Eventos / Torneos', icon: CalendarDays, permission: 'content' },
  guides: { label: 'Guías y Buildeos', icon: BookOpen, permission: 'content' },
  mods: { label: 'Biblioteca de MODs', icon: Box, permission: 'content' },
  members: { label: 'Miembros y roles', icon: Users, permission: 'members' },
  permissions: { label: 'Roles y Permisos', icon: ShieldCheck, superAdminOnly: true },
  'admin-tools': { label: 'Herramientas Avanzadas', icon: Wrench, superAdminOnly: true },
}

const FIELD_CONFIGS = {
  news: {
    table: 'news',
    orderBy: { column: 'created_at', ascending: false },
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Nuevo evento de la semana' },
      { key: 'excerpt', label: 'Extracto corto', type: 'textarea', placeholder: 'Resumen breve que aparece en el banner' },
      { key: 'content', label: 'Contenido completo', type: 'textarea', placeholder: 'Cuerpo de la noticia...' },
      { key: 'image_url', label: 'Imagen de la noticia', type: 'image' },
      { key: 'url', label: 'URL (web o video de YouTube)', type: 'url', placeholder: 'https://www.youtube.com/watch?v=...' },
      { key: 'categories', label: 'Categorías (selección múltiple)', type: 'categories', options: NEWS_CATEGORIES },
    ],
    columns: ['title'],
    emptyHint: 'Publica la primera noticia del clan.',
  },
  'eventos-torneos': {
    table: 'events',
    orderBy: { column: 'date', ascending: true },
    fields: [
      { key: 'title', label: 'Nombre del evento', type: 'text', placeholder: 'Torneo OU, ShinyHunt grupal...' },
      { key: 'description', label: 'Descripción', type: 'textarea', placeholder: 'Describe el evento o torneo...' },
      {
        key: 'event_type',
        label: 'Tipo',
        type: 'select',
        options: [
          { value: 'PvP', label: 'PvP' },
          { value: 'PvE/Mixtos', label: 'PvE / Mixtos' },
        ],
      },
      {
        key: 'tier',
        label: 'Tier / Formato',
        type: 'dependent-select',
        parentKey: 'event_type',
        parentPlaceholder: 'Primero elige el tipo',
        optionsByParent: {
          PvP: PVP_TIERS,
          'PvE/Mixtos': PVE_TIERS,
        },
      },
      { key: 'prize_count', label: 'Cantidad de premios', type: 'number', placeholder: '3' },
      { key: 'prizes', label: 'Premios por lugar', type: 'dynamic-prizes', countKey: 'prize_count' },
      { key: 'moderator', label: 'Moderador', type: 'text', placeholder: 'Nombre del moderador' },
      { key: 'date', label: 'Fecha de inicio y hora', type: 'date' },
      {
        key: 'status',
        label: 'Estado',
        type: 'select',
        options: [
          { value: 'open', label: 'Inscripciones abiertas' },
          { value: 'in_progress', label: 'En curso' },
          { value: 'finished', label: 'Finalizado' },
        ],
      },
      { key: 'rules', label: 'Reglas', type: 'textarea', placeholder: 'Reglas del evento...' },
      { key: 'images', label: 'Imágenes (1 o más)', type: 'multi-image', allowUrl: true },
    ],
    columns: ['title'],
    emptyHint: 'Crea el primer evento o torneo del clan.',
  },
  guides: {
    table: 'guides',
    orderBy: { column: 'created_at', ascending: false },
    fields: [
      { key: 'title', label: 'Título de la guía', type: 'text' },
      { key: 'excerpt', label: 'Extracto corto', type: 'textarea' },
      { key: 'categories', label: 'Categorías (selección múltiple)', type: 'categories', options: GUIDE_CATEGORIES },
      { key: 'tags', label: 'Etiquetas', type: 'tags' },
      { key: 'content', label: 'Contenido completo', type: 'textarea' },
      { key: 'documents', label: 'Documentos adjuntos (cualquier tipo)', type: 'documents' },
      { key: 'image_url', label: 'Imagen', type: 'image', allowUrl: false },
      {
        key: 'video_url',
        label: 'Video de referencia (YouTube)',
        type: 'url',
        placeholder: 'https://www.youtube.com/watch?v=...',
      },
    ],
    columns: ['title'],
    emptyHint: 'Comparte la primera guía o buildeo con el clan.',
  },
  mods: {
    table: 'mods',
    orderBy: { column: 'created_at', ascending: false },
    fields: [
      { key: 'title', label: 'Nombre del MOD', type: 'text', placeholder: 'Nombre del MOD o theme' },
      { key: 'excerpt', label: 'Extracto corto', type: 'textarea', placeholder: 'Descripción breve del MOD' },
      { key: 'categories', label: 'Categorías (selección múltiple)', type: 'categories', options: MOD_CATEGORIES },
      { key: 'tags', label: 'Etiquetas', type: 'tags' },
      { key: 'content', label: 'Descripción completa', type: 'textarea', placeholder: 'Instrucciones de uso, compatibilidad, etc.' },
      { key: 'image_url', label: 'Imagen de portada', type: 'image', allowUrl: false },
      { key: 'download_url', label: 'Enlace de descarga', type: 'url', placeholder: 'https://www.mediafire.com/...' },
    ],
    columns: ['title'],
    emptyHint: 'Sube el primer MOD a la biblioteca del clan.',
  },
}

/**
 * Página de Gestión: CRUD de contenido según los permisos de la matriz.
 * - Los sorteos se gestionan aparte en /sorteos (permiso "raffles").
 * - El super-admin ve además la pestaña "Roles y Permisos" para editar la matriz.
 * - Asignar/cambiar roles sigue siendo exclusivo del super-admin.
 */
export default function ContentManagement() {
  const { role, can, profileLoading } = useAuth()
  const [tab, setTab] = useState(() => sessionStorage.getItem('cm-tab') || 'news')

  const isSuperAdmin = role === ROLES.SUPER_ADMIN
  const availableTabs = Object.entries(TABS).filter(([, t]) =>
    t.superAdminOnly ? isSuperAdmin : can(t.permission)
  )

  // Si el rol actual no tiene acceso a la pestaña activa, vuelve a la primera disponible
  // (pero solo si ya cargó el profile, para no resetear prematuramente)
  useEffect(() => {
    if (profileLoading) return
    if (availableTabs.length > 0 && !availableTabs.some(([key]) => key === tab)) {
      setTab(availableTabs[0]?.[0] || 'news')
    }
  }, [tab, availableTabs, profileLoading])

  // Guardar pestaña activa en sessionStorage para que sobreviva recargas
  useEffect(() => {
    sessionStorage.setItem('cm-tab', tab)
  }, [tab])

  const canManageMembers = can('members')

  return (
    <div>
      <PageHeader
        title="Gestión"
        subtitle="Administra el contenido del portal y los roles de los miembros."
        icon={Settings}
      />

      {/* Pestañas */}
      <div className="mb-6 flex flex-wrap gap-2.5">
        {availableTabs.map(([key, t]) => {
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

      {/* Contenido de la pestaña activa */}
      {tab === 'members' ? (
        canManageMembers ? (
          <MembersManager />
        ) : (
          <p className="text-sm text-soft">No tienes permisos para gestionar roles.</p>
        )
      ) : tab === 'permissions' ? (
        <RolesManager />
      ) : tab === 'admin-tools' ? (
        <AdminToolsPanel />
      ) : (
        <ActiveTab key={tab} tab={tab} />
      )}

      {canManageMembers && !canAssignRoles(role) && (
        <p className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-xs text-primary">
          Solo el <strong>super-admin</strong> puede otorgar o cambiar roles a los usuarios.
        </p>
      )}
    </div>
  )
}

// Monta el CRUD SOLO de la pestaña activa (con key), evitando consultar
// las 4 tablas cada vez que se entra a Gestión.
function ActiveTab({ tab }) {
  const config = FIELD_CONFIGS[tab]
  const crud = useCrud(config.table, config.orderBy && { orderBy: config.orderBy })
  return (
    <ContentManager
      type={tab}
      title={TABS[tab].label}
      fields={config.fields}
      columns={config.columns}
      emptyHint={config.emptyHint}
      useCrudResult={crud}
    />
  )
}

/**
 * Panel de herramientas avanzadas (solo super-admin).
 * Actualmente: toggle de modo mantenimiento.
 */
function AdminToolsPanel() {
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
        <h3 className="font-display text-lg font-extrabold text-text">Herramientas Avanzadas</h3>
        <p className="text-sm text-soft">Configuración del portal disponible solo para super-administradores.</p>
      </div>

      {maintenance && <MaintenanceInlineBanner />}

      {/* Modo Mantenimiento */}
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
