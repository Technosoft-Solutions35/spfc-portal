import { useEffect, useState } from 'react'
import { CheckCircle2, Database, MessageSquare, Server, Settings, ToggleLeft, ToggleRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import Spinner from '../ui/Spinner'

const ICON_MAP = {
  Database: Database,
  MessageSquare: MessageSquare,
  HardDrive: Settings,
  Server: Server,
}

export default function IntegrationsManager() {
  const { toast } = useToast()
  const [integrations, setIntegrations] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState({})

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .order('name')
      if (!error && mounted) setIntegrations(data || [])
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  async function toggleActive(id, current) {
    const { error } = await supabase
      .from('integrations')
      .update({ active: !current, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return toast('Error: ' + error.message, 'error')

    await supabase.rpc('log_admin_action', {
      p_action: 'integration_updated',
      p_entity: 'integration',
      p_entity_id: id,
      p_details: { active: !current },
    })

    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, active: !current } : i))
    toast(`Integración ${!current ? 'activada' : 'desactivada'}`, 'success')
  }

  function startEdit(integration) {
    setEditing(integration.id)
    setEditForm({ ...integration.settings })
  }

  async function saveEdit(id) {
    const { error } = await supabase
      .from('integrations')
      .update({ settings: editForm, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return toast('Error: ' + error.message, 'error')

    await supabase.rpc('log_admin_action', {
      p_action: 'integration_updated',
      p_entity: 'integration',
      p_entity_id: id,
      p_details: { settings: editForm },
    })

    setIntegrations((prev) => prev.map((i) => i.id === id ? { ...i, settings: editForm } : i))
    setEditing(null)
    toast('Configuración guardada', 'success')
  }

  if (loading) return <Spinner label="Cargando integraciones..." />

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
          <Database size={20} className="text-primary" /> Integraciones
        </h3>
        <p className="text-sm text-soft">Gestiona los servicios externos conectados al portal.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((integ) => {
          const Icon = ICON_MAP[integ.icon] || Database
          const isEditing = editing === integ.id
          return (
            <div key={integ.id} className="rounded-2xl border border-edge bg-elevated p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className={`rounded-xl p-2.5 ${integ.active ? 'bg-success/15 text-success' : 'bg-edge text-soft'}`}>
                    <Icon size={22} />
                  </span>
                  <div>
                    <h4 className="font-bold text-text">{integ.label}</h4>
                    <p className="text-xs text-soft">
                      {integ.active ? (
                        <span className="flex items-center gap-1 text-success">
                          <CheckCircle2 size={12} /> Activo
                        </span>
                      ) : (
                        <span className="text-soft">Inactivo</span>
                      )}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => toggleActive(integ.id, integ.active)}
                  className={`shrink-0 ${integ.active ? 'text-success' : 'text-soft'}`}
                  aria-label={integ.active ? 'Desactivar' : 'Activar'}
                >
                  {integ.active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>

              {isEditing ? (
                <div className="mt-4 space-y-3">
                  {Object.entries(editForm).map(([key, val]) => (
                    <div key={key}>
                      <label className="mb-1 block text-[11px] uppercase tracking-wider text-soft">{key}</label>
                      {typeof val === 'boolean' ? (
                        <button
                          type="button"
                          onClick={() => setEditForm((p) => ({ ...p, [key]: !val }))}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${val ? 'bg-primary' : 'bg-edge'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${val ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      ) : (
                        <input
                          type={typeof val === 'number' ? 'number' : 'text'}
                          value={val}
                          onChange={(e) => setEditForm((p) => ({
                            ...p,
                            [key]: typeof val === 'number' ? Number(e.target.value) : e.target.value,
                          }))}
                          className="input-field w-full"
                        />
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(integ.id)} className="btn-primary text-xs">Guardar</button>
                    <button onClick={() => setEditing(null)} className="btn-secondary text-xs">Cancelar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => startEdit(integ)} className="btn-secondary mt-3 text-xs">
                  <Settings size={14} /> Configurar
                </button>
              )}

              {integ.updated_at && (
                <p className="mt-2 text-[10px] text-soft">
                  Última actualización: {new Date(integ.updated_at).toLocaleString('es')}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
