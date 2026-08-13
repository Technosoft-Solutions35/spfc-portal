import { motion } from 'framer-motion'
import { LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import NewsBanner from '../components/NewsBanner'
import BirthdayBanner from '../components/ui/BirthdayBanner'
import DashboardWidgets from '../components/DashboardWidgets'
import PushNotificationsCard from '../components/ui/PushNotificationsCard'
import { RoleBadge } from '../components/ui/Avatar'

/**
 * Dashboard / Inicio: banner de noticias + grid de vista rápida.
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

      <NewsBanner />

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
