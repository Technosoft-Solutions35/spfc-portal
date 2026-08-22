import { useState } from 'react'
import { Download, FileText, Users, CalendarDays, Sparkles, Shield } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'

const EXPORTS = [
  { key: 'profiles', label: 'Miembros', icon: Users, table: 'profiles', columns: 'id, username, email, role, affiliation, created_at' },
  { key: 'events', label: 'Eventos / Torneos', icon: CalendarDays, table: 'events', columns: 'id, title, event_type, tier, date, status, created_at' },
  { key: 'news', label: 'Noticias', icon: FileText, table: 'news', columns: 'id, title, excerpt, created_at' },
  { key: 'shinies', label: 'Shinies', icon: Sparkles, table: 'shinies', columns: 'id, user_id, pokemon, method, encounters, created_at' },
  { key: 'pvp_rankings', label: 'Ranking PvP', icon: Shield, table: 'pvp_rankings_full', columns: 'user_id, username, victories, defeats, total, winrate' },
]

function toCSV(rows) {
  if (!rows || rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  rows.forEach((row) => {
    lines.push(headers.map((h) => {
      const val = row[h]
      if (val === null || val === undefined) return ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(','))
  })
  return lines.join('\n')
}

function downloadCSV(csv, filename) {
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function DataExporter() {
  const { toast } = useToast()
  const [exporting, setExporting] = useState(null)

  async function handleExport(item) {
    setExporting(item.key)
    try {
      const { data, error } = await supabase
        .from(item.table)
        .select(item.columns)
        .limit(10000)

      if (error) throw error

      const csv = toCSV(data || [])
      if (!csv) {
        toast('No hay datos para exportar', 'info')
        setExporting(null)
        return
      }

      downloadCSV(csv, `${item.key}_${new Date().toISOString().slice(0, 10)}.csv`)
      toast(`${item.label} exportado (${(data || []).length} registros)`, 'success')

      await supabase.rpc('log_admin_action', {
        p_action: 'data_exported',
        p_entity: item.key,
        p_details: { rows: (data || []).length },
      })
    } catch (err) {
      toast('Error: ' + err.message, 'error')
    }
    setExporting(null)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
          <Download size={20} className="text-primary" /> Exportar Datos
        </h3>
        <p className="text-sm text-soft">Descarga copias en CSV de las tablas del portal.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EXPORTS.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.key} className="rounded-2xl border border-edge bg-elevated p-5">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-primary/15 p-2.5 text-primary">
                  <Icon size={22} />
                </span>
                <div>
                  <h4 className="font-display font-bold text-text">{item.label}</h4>
                  <p className="text-xs text-soft">Tabla: {item.table}</p>
                </div>
              </div>
              <button
                onClick={() => handleExport(item)}
                disabled={exporting === item.key}
                className="btn-primary mt-4 w-full justify-center"
              >
                <Download size={16} />
                {exporting === item.key ? 'Exportando...' : 'Descargar CSV'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
