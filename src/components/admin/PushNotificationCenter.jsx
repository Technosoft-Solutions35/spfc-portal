import { useState } from 'react'
import { Bell, ChevronDown, ChevronUp, Clock, Send, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import { ROLE_LABELS, ROLES } from '../../lib/utils'

const PUSH_TYPES = [
  { value: 'news', label: 'Nueva noticia' },
  { value: 'event', label: 'Nuevo evento/torneo' },
  { value: 'guide', label: 'Nueva guía' },
  { value: 'pvp_ranking', label: 'Ranking PvP actualizado' },
  { value: 'maintenance', label: 'Aviso de mantenimiento' },
  { value: 'custom', label: 'Mensaje personalizado' },
]

const TARGET_ROLES = [
  { value: 'all', label: 'Todos los miembros' },
  { value: ROLES.MEMBER, label: ROLE_LABELS[ROLES.MEMBER] },
  { value: ROLES.GESTOR, label: ROLE_LABELS[ROLES.GESTOR] },
  { value: ROLES.ADMIN, label: ROLE_LABELS[ROLES.ADMIN] },
  { value: ROLES.SUPER_ADMIN, label: ROLE_LABELS[ROLES.SUPER_ADMIN] },
]

export default function PushNotificationCenter() {
  const { toast } = useToast()
  const [type, setType] = useState('custom')
  const [target, setTarget] = useState('all')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [history, setHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  async function loadHistory() {
    const { data } = await supabase
      .from('push_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setHistory(data || [])
  }

  async function handleSend(e) {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return toast('Título y mensaje son obligatorios', 'error')

    setSending(true)
    try {
      // Build target filter
      let targetFilter = null
      if (target !== 'all') {
        const { data: userIds } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', target)
        targetFilter = (userIds || []).map((u) => u.id)
      }

      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          type,
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || undefined,
          targetUserIds: targetFilter,
        },
      })

      if (error) throw error

      // Log to audit
      await supabase.rpc('log_admin_action', {
        p_action: 'push_sent',
        p_entity: 'push',
        p_details: { type, target, title: title.trim() },
      })

      toast(`Notificación enviada a ${target === 'all' ? 'todos' : ROLE_LABELS[target] || target}`, 'success')
      setTitle('')
      setBody('')
      setUrl('')
    } catch (err) {
      toast('Error al enviar: ' + (err.message || 'desconocido'), 'error')
    }
    setSending(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
          <Bell size={20} className="text-primary" /> Centro de Notificaciones
        </h3>
        <p className="text-sm text-soft">Envía notificaciones push a los miembros del clan por grupo o individualmente.</p>
      </div>

      <form onSubmit={handleSend} className="rounded-2xl border border-edge bg-elevated p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-text">Tipo de notificación</label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="input w-full">
              {PUSH_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-text">Enviar a</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="input w-full">
              {TARGET_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-text">Título *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nuevo torneo disponible"
            className="input w-full"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-text">Mensaje *</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Se ha abierto inscripciones para el torneo OU de este viernes..."
            className="input w-full"
            rows={3}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-bold text-text">URL (opcional)</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://technosoft-solutions35.github.io/spfc-portal/eventos-torneos"
            className="input w-full"
          />
        </div>

        <button type="submit" disabled={sending} className="btn-primary">
          <Send size={16} />
          {sending ? 'Enviando...' : 'Enviar notificación'}
        </button>
      </form>

      <div className="rounded-2xl border border-edge bg-elevated">
        <button
          onClick={() => { setShowHistory(!showHistory); if (!showHistory) loadHistory() }}
          className="flex w-full items-center justify-between p-5 text-left"
        >
          <h4 className="flex items-center gap-2 font-display font-bold text-text">
            <Clock size={18} className="text-soft" /> Historial de envíos
          </h4>
          {showHistory ? <ChevronUp size={18} className="text-soft" /> : <ChevronDown size={18} className="text-soft" />}
        </button>

        {showHistory && (
          <div className="border-t border-edge px-5 pb-5">
            {history.length === 0 ? (
              <p className="py-4 text-center text-sm text-soft">Sin envíos recientes.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[500px] border-separate border-spacing-0 text-left">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-soft">
                      <th className="border-b border-edge px-3 py-2">Fecha</th>
                      <th className="border-b border-edge px-3 py-2">Tipo</th>
                      <th className="border-b border-edge px-3 py-2">Título</th>
                      <th className="border-b border-edge px-3 py-2">Enviado por</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-b border-edge">
                        <td className="px-3 py-2 text-xs text-soft">
                          {new Date(h.created_at).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                        </td>
                        <td className="px-3 py-2 text-xs font-medium text-text">{h.type || '—'}</td>
                        <td className="px-3 py-2 text-sm text-text truncate max-w-[200px]">{h.title || '—'}</td>
                        <td className="px-3 py-2 text-xs text-soft">{h.sent_by || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
