import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, Sparkles, Swords, Trophy, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import NewsBanner from '../components/NewsBanner'
import ForumNewsBanner from '../components/ForumNewsBanner'
import BirthdayBanner from '../components/ui/BirthdayBanner'
import DashboardWidgets from '../components/DashboardWidgets'
import PushNotificationsCard from '../components/ui/PushNotificationsCard'
import { RoleBadge } from '../components/ui/Avatar'

/**
 * Dashboard / Inicio: saludo + stats + banner noticias + banner foro + widgets.
 */
export default function Dashboard() {
  const { profile } = useAuth()

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <LayoutDashboard size={22} />
          </span>
          <div>
            <h2 className="font-display text-2xl font-extrabold text-text">
              Hola, {profile?.username} 👋
            </h2>
            <p className="text-sm text-soft">
              Bienvenido al portal oficial del clan SpFc/Gd.
            </p>
          </div>
        </div>
        <RoleBadge role={profile?.role} />
      </motion.div>

      {/* Estadísticas en vivo */}
      <StatsBar />

      <NewsBanner />

      <ForumNewsBanner />

      <BirthdayBanner />

      <div className="mt-6">
        <PushNotificationsCard />
      </div>

      <div className="mt-6">
        <DashboardWidgets />
      </div>
    </div>
  )
}

/**
 * Barra de estadísticas en vivo del clan.
 */
function StatsBar() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    async function load() {
      const now = new Date()
      const weekAgo = new Date(now)
      weekAgo.setDate(weekAgo.getDate() - 7)

      const [
        { count: shiniesWeek },
        { count: totalMembers },
        { data: nextTournament },
        { data: topHunter },
      ] = await Promise.all([
        supabase.from('shiny_reports').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString()),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('tournaments').select('title, start_date').gte('start_date', now.toISOString()).order('start_date', { ascending: true }).limit(1).maybeSingle(),
        supabase.from('profiles').select('username, shinies').order('shinies', { ascending: false }).limit(1).maybeSingle(),
      ])

      setStats({
        shiniesWeek: shiniesWeek || 0,
        totalMembers: totalMembers || 0,
        nextTournament: nextTournament || null,
        topHunter: topHunter || null,
      })
    }
    load()
  }, [])

  if (!stats) return null

  const items = [
    {
      icon: Sparkles,
      label: 'Shinies esta semana',
      value: stats.shiniesWeek,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
    {
      icon: Users,
      label: 'Miembros activos',
      value: stats.totalMembers,
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      icon: Swords,
      label: 'Próximo torneo',
      value: stats.nextTournament ? stats.nextTournament.title : 'Ninguno',
      sub: stats.nextTournament ? new Date(stats.nextTournament.start_date).toLocaleDateString('es', { day: 'numeric', month: 'short' }) : null,
      color: 'text-red',
      bg: 'bg-red/10',
    },
    {
      icon: Trophy,
      label: '#1 cazador shiny',
      value: stats.topHunter ? stats.topHunter.username : '—',
      sub: stats.topHunter ? `${stats.topHunter.shinies} shinies` : null,
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
  ]

  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="flex items-center gap-3 rounded-xl border border-edge bg-elevated p-3"
        >
          <span className={`shrink-0 rounded-lg p-2 ${item.bg}`}>
            <item.icon size={18} className={item.color} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-soft">{item.label}</p>
            <p className={`truncate text-sm font-extrabold ${item.color}`}>
              {typeof item.value === 'number' ? item.value : (item.value || '—')}
            </p>
            {item.sub && <p className="text-[10px] text-soft">{item.sub}</p>}
          </div>
        </motion.div>
      ))}
    </div>
  )
}
