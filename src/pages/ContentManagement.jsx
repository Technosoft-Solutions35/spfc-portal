import { useEffect, useState } from 'react'
import { BookOpen, CalendarDays, Newspaper, Settings, Swords, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { canAssignRoles, canManageAll } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import ContentManager from '../components/management/ContentManager'
import MembersManager from '../components/management/MembersManager'
import { useCrud } from '../hooks/useCrud'

const TABS = {
  news: { label: 'Noticias', icon: Newspaper, roles: ['super-admin', 'admin', 'gestor'] },
  events: { label: 'Eventos', icon: CalendarDays, roles: ['super-admin', 'admin'] },
  tournaments: { label: 'Torneos', icon: Swords, roles: ['super-admin', 'admin'] },
  guides: { label: 'Guías y Buildeos', icon: BookOpen, roles: ['super-admin', 'admin'] },
  members: { label: 'Miembros y roles', icon: Users, roles: ['super-admin', 'admin'] },
}

const FIELD_CONFIGS = {
  news: {
    table: 'news',
    orderBy: { column: 'created_at', ascending: false },
    fields: [
      { key: 'title', label: 'Título', type: 'text', placeholder: 'Nuevo evento de la semana' },
      { key: 'excerpt', label: 'Extracto corto', type: 'textarea', placeholder: 'Resumen breve que aparece en el banner' },
      { key: 'content', label: 'Contenido completo', type: 'textarea', placeholder: 'Cuerpo de la noticia...' },
      { key: 'image_url', label: 'Imagen de portada', type: 'image' },
    ],
    columns: ['title'],
    emptyHint: 'Publica la primera noticia del clan.',
  },
  events: {
    table: 'events',
    orderBy: { column: 'date', ascending: true },
    fields: [
      { key: 'title', label: 'Título del evento', type: 'text' },
      { key: 'description', label: 'Descripción', type: 'textarea' },
      { key: 'date', label: 'Fecha y hora', type: 'date' },
      { key: 'location', label: 'Lugar (in-game)', type: 'text', placeholder: 'Isla Cinabio, PokeMMO' },
      { key: 'image_url', label: 'Imagen', type: 'image' },
    ],
    columns: ['title'],
    emptyHint: 'Crea el primer evento del clan.',
  },
  tournaments: {
    table: 'tournaments',
    orderBy: { column: 'start_date', ascending: true },
    fields: [
      { key: 'title', label: 'Nombre del torneo', type: 'text' },
      { key: 'description', label: 'Descripción', type: 'textarea' },
      { key: 'format', label: 'Formato', type: 'text', placeholder: 'OU Singles · Bo3' },
      { key: 'prize', label: 'Premio', type: 'text', placeholder: '100k PokeYen + medalla' },
      { key: 'start_date', label: 'Fecha de inicio', type: 'date' },
      { key: 'status', label: 'Estado', type: 'select', options: [
        { value: 'open', label: 'Inscripciones abiertas' },
        { value: 'in_progress', label: 'En curso' },
        { value: 'finished', label: 'Finalizado' },
      ] },
      { key: 'rules', label: 'Reglas', type: 'textarea', placeholder: 'Reglas del torneo...' },
      { key: 'image_url', label: 'Imagen', type: 'image' },
    ],
    columns: ['title'],
    emptyHint: 'Organiza el primer torneo del clan.',
  },
  guides: {
    table: 'guides',
    orderBy: { column: 'created_at', ascending: false },
    fields: [
      { key: 'title', label: 'Título de la guía', type: 'text' },
      { key: 'excerpt', label: 'Extracto corto', type: 'textarea' },
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
}

/**
 * Página de Gestión: CRUD de contenido según el rol.
 * - admin: noticias, eventos, torneos, guías y roles de miembros.
 * - gestor: solo noticias (puede publicar y anunciar).
 */
export default function ContentManagement() {
  const { role } = useAuth()
  const [tab, setTab] = useState('news')

  const availableTabs = Object.entries(TABS).filter(([, t]) => t.roles.includes(role))

  // Si el rol actual no tiene acceso a la pestaña activa, vuelve a la primera disponible
  useEffect(() => {
    if (!availableTabs.some(([key]) => key === tab)) {
      setTab(availableTabs[0]?.[0] || 'news')
    }
  }, [tab, availableTabs])

  const isAdmin = canManageAll(role)

  return (
    <div>
      <PageHeader
        title="Gestión"
        subtitle="Administra el contenido del portal y los roles de los miembros."
        icon={Settings}
      />

      {/* Pestañas */}
      <div className="mb-6 flex flex-wrap gap-2">
        {availableTabs.map(([key, t]) => {
          const Icon = t.icon
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                active
                  ? 'bg-primary text-white shadow-glow'
                  : 'border border-edge bg-elevated text-soft hover:text-text'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Contenido de la pestaña activa */}
      {tab === 'members' ? (
        isAdmin ? (
          <MembersManager />
        ) : (
          <p className="text-sm text-soft">No tienes permisos para gestionar roles.</p>
        )
      ) : (
        <ActiveTab key={tab} tab={tab} />
      )}

      {!isAdmin && (
        <p className="mt-4 rounded-xl bg-secondary/10 px-4 py-3 text-xs text-secondary">
          Como gestor puedes publicar y editar noticias. El resto del contenido lo gestiona un
          administrador.
        </p>
      )}

      {isAdmin && !canAssignRoles(role) && (
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
      title={TABS[tab].label}
      fields={config.fields}
      columns={config.columns}
      emptyHint={config.emptyHint}
      useCrudResult={crud}
    />
  )
}
