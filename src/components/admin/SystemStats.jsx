import { useEffect, useState } from 'react'
import { BarChart3, CalendarDays, Newspaper, Send, Shield, Sparkles, Swords, TrendingUp, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const COLOR_MAP = {
  primary: { bg: 'bg-primary/15', text: 'text-primary' },
  info: { bg: 'bg-info/15', text: 'text-info' },
  secondary: { bg: 'bg-secondary/15', text: 'text-secondary' },
  success: { bg: 'bg-success/15', text: 'text-success' },
  warning: { bg: 'bg-yellow-500/15', text: 'text-yellow-500' },
}

const CARDS = [
  { key: 'profiles', label: 'Miembros', icon: Users, color: 'primary' },
  { key: 'news', label: 'Noticias', icon: Newspaper, color: 'info' },
  { key: 'events', label: 'Eventos / Torneos', icon: Swords, color: 'secondary' },
  { key: 'guides', label: 'Guías', icon: CalendarDays, color: 'success' },
  { key: 'shinies', label: 'Shinies reportados', icon: Sparkles, color: 'warning' },
  { key: 'pvp', label: 'Ranking PvP', icon: Shield, color: 'primary' },
]

export default function SystemStats() {
  const [stats, setStats] = useState(null)
  const [recentActivity, setRecentActivity] = useState([])
  const [roleDistribution, setRoleDistribution] = useState([])

  useEffect(() => {
    let mounted = true
    async function load() {
      const counts = {}
      for (const c of CARDS) {
        const table = c.key === 'profiles' ? 'profiles' : c.key === 'pvp' ? 'pvp_rankings' : c.key
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
        counts[c.key] = count || 0
      }
      if (mounted) setStats(counts)

      const { data: recentProfiles } = await supabase
        .from('profiles')
        .select('username, created_at')
        .order('created_at', { ascending: false })
        .limit(5)
      if (mounted && recentProfiles) setRecentActivity(recentProfiles)

      const { data: roleData } = await supabase
        .from('profiles')
        .select('role')
      if (mounted && roleData) {
        const dist = {}
        roleData.forEach((r) => { dist[r.role] = (dist[r.role] || 0) + 1 })
        setRoleDistribution(Object.entries(dist).map(([role, count]) => ({ role, count })))
      }
    }
    load()
    return () => { mounted = false }
  }, [])

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => (
          <div key={c.key} className="animate-pulse rounded-2xl border border-edge bg-elevated p-5">
            <div className="h-4 w-24 rounded bg-edge" />
            <div className="mt-3 h-8 w-16 rounded bg-edge" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-lg font-extrabold text-text">Estadísticas del Portal</h3>
        <p className="text-sm text-soft">Resumen general de contenido y actividad.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CARDS.map((c) => {
          const Icon = c.icon
          const colors = COLOR_MAP[c.color] || COLOR_MAP.primary
          return (
            <div key={c.key} className="rounded-2xl border border-edge bg-elevated p-5">
              <div className="flex items-center justify-between">
                <span className={`rounded-xl ${colors.bg} p-2.5 ${colors.text}`}>
                  <Icon size={22} />
                </span>
                <span className="text-2xl font-extrabold text-text">{stats[c.key]}</span>
              </div>
              <p className="mt-2 text-sm font-medium text-soft">{c.label}</p>
            </div>
          )
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-edge bg-elevated p-5">
          <h4 className="flex items-center gap-2 font-display font-bold text-text">
            <Users size={18} className="text-primary" /> Distribución por Rol
          </h4>
          <div className="mt-4 space-y-3">
            {roleDistribution.map(({ role, count }) => (
              <div key={role} className="flex items-center gap-3">
                <span className="min-w-[120px] text-sm font-medium text-text">{role}</span>
                <div className="flex-1 overflow-hidden rounded-full bg-edge h-2">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, (count / (stats.profiles || 1)) * 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-text">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-edge bg-elevated p-5">
          <h4 className="flex items-center gap-2 font-display font-bold text-text">
            <TrendingUp size={18} className="text-success" /> Últimos Miembros
          </h4>
          <div className="mt-4 space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-sm text-soft">Sin actividad reciente.</p>
            ) : (
              recentActivity.map((p, i) => (
                <div key={i} className="flex items-center justify-between border-b border-edge pb-2 last:border-0">
                  <span className="text-sm font-medium text-text">{p.username || 'Sin nombre'}</span>
                  <span className="text-xs text-soft">{new Date(p.created_at).toLocaleDateString('es')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
