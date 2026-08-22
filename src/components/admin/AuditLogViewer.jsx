import { useEffect, useState } from 'react'
import { Activity, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Spinner from '../ui/Spinner'

const PAGE_SIZE = 20

const ACTION_LABELS = {
  'role_changed': 'Cambio de rol',
  'user_deleted': 'Usuario eliminado',
  'event_created': 'Evento creado',
  'event_updated': 'Evento actualizado',
  'event_deleted': 'Evento eliminado',
  'news_created': 'Noticia creada',
  'news_updated': 'Noticia actualizada',
  'news_deleted': 'Noticia eliminada',
  'permission_updated': 'Permisos actualizados',
  'maintenance_toggled': 'Modo mantenimiento cambiado',
  'pvp_ranking_updated': 'Ranking PvP actualizado',
  'integration_updated': 'Integración actualizada',
  'image_uploaded': 'Imagen subida',
  'image_deleted': 'Imagen eliminada',
  'push_sent': 'Notificación push enviada',
}

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('')

  async function loadLogs(p = 0, actionFilter = '') {
    setLoading(true)
    let query = supabase
      .from('audit_log')
      .select('id, user_id, username, action, entity, entity_id, details, created_at')
      .order('created_at', { ascending: false })
      .range(p * PAGE_SIZE, (p + 1) * PAGE_SIZE - 1)

    if (actionFilter) query = query.eq('action', actionFilter)

    const { data, error } = await query
    if (!error) {
      setLogs(data || [])
      setHasMore((data || []).length === PAGE_SIZE)
    }
    setLoading(false)
  }

  useEffect(() => {
    setPage(0)
    loadLogs(0, filter)
  }, [filter])

  const uniqueActions = [...new Set(logs.map((l) => l.action))].sort()

  function getActionLabel(action) {
    return ACTION_LABELS[action] || action
  }

  function formatDetails(details) {
    if (!details || Object.keys(details).length === 0) return null
    return Object.entries(details).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(', ')
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
            <Activity size={20} className="text-primary" /> Registro de Actividad
          </h3>
          <p className="text-sm text-soft">Historial de acciones administrativas del portal.</p>
        </div>
        <button onClick={() => loadLogs(page, filter)} className="btn-secondary">
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-soft" />
          <input
            type="text"
            placeholder="Buscar por usuario o entidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input"
        >
          <option value="">Todas las acciones</option>
          {uniqueActions.map((a) => (
            <option key={a} value={a}>{getActionLabel(a)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <Spinner label="Cargando registros..." />
      ) : logs.length === 0 ? (
        <div className="rounded-2xl border border-edge bg-elevated p-8 text-center">
          <Activity size={32} className="mx-auto mb-3 text-soft" />
          <p className="text-sm text-soft">Sin registros de actividad.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-edge">
            <table className="w-full min-w-[700px] border-separate border-spacing-0 text-left">
              <thead>
                <tr className="bg-elevated text-[11px] uppercase tracking-wider text-soft">
                  <th className="border-b border-edge px-4 py-3">Fecha</th>
                  <th className="border-b border-edge px-4 py-3">Usuario</th>
                  <th className="border-b border-edge px-4 py-3">Acción</th>
                  <th className="border-b border-edge px-4 py-3">Entidad</th>
                  <th className="border-b border-edge px-4 py-3">Detalles</th>
                </tr>
              </thead>
              <tbody>
                {logs
                  .filter((l) => {
                    if (!search) return true
                    const s = search.toLowerCase()
                    return (l.username || '').toLowerCase().includes(s) || (l.entity || '').toLowerCase().includes(s) || (l.entity_id || '').toLowerCase().includes(s)
                  })
                  .map((log) => (
                    <tr key={log.id} className="border-b border-edge hover:bg-background">
                      <td className="px-4 py-3 text-xs text-soft">
                        {new Date(log.created_at).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-text">{log.username || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                          {getActionLabel(log.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text">
                        {log.entity || '—'}
                        {log.entity_id && <span className="ml-1 text-soft text-xs">({log.entity_id.slice(0, 8)}…)</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-soft max-w-[200px] truncate">
                        {formatDetails(log.details) || '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-xs text-soft">Página {page + 1}</p>
            <div className="flex gap-2">
              <button
                onClick={() => { const p = page - 1; setPage(p); loadLogs(p, filter) }}
                disabled={page === 0}
                className="btn-secondary disabled:opacity-40"
              >
                <ChevronLeft size={16} /> Anterior
              </button>
              <button
                onClick={() => { const p = page + 1; setPage(p); loadLogs(p, filter) }}
                disabled={!hasMore}
                className="btn-secondary disabled:opacity-40"
              >
                Siguiente <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
