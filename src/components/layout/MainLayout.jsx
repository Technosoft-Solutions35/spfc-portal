import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Background from './Background'
import Sidebar from './Sidebar'
import MobileHeader from './MobileHeader'
import ContentNotifier from './ContentNotifier'
import FooterLinks from './FooterLinks'
import MaintenanceBanner from '../MaintenanceBanner'
import { useMaintenance } from '../../context/MaintenanceContext'
import { useAuth } from '../../context/AuthContext'
import { NAV_ITEMS } from '../../lib/navigation'

/**
 * Layout principal del portal (solo usuarios logueados).
 * Desktop: sidebar fija + tarjeta central flotante sobre el fondo temático.
 * Móvil: cabecera con hamburguesa + contenido a ancho completo.
 */
export default function MainLayout() {
  const location = useLocation()
  const { maintenance } = useMaintenance()
  const { role } = useAuth()

  const showBanner = maintenance && (role === 'admin' || role === 'super-admin')

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname])

  // Prefetch de todos los chunks de rutas al montar el layout.
  // Así cuando el usuario navega, el chunk ya está en caché y la transición es instantánea.
  useEffect(() => {
    NAV_ITEMS.forEach((item) => item.load?.())
  }, [])

  return (
    <div className="min-h-screen">
      <Background />
      <ContentNotifier />
      {showBanner && <MaintenanceBanner />}

      <div className="flex">
        <Sidebar />

        {/* Contenedor central: tarjeta flotante */}
        <main className="flex min-h-screen flex-1 flex-col">
          <MobileHeader />

          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
            <div className="app-card min-h-[70vh] p-5 sm:p-8">
              <Outlet />
            </div>
          </div>

          <FooterLinks />
        </main>
      </div>
    </div>
  )
}
