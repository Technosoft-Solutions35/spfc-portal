import { motion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import Background from './Background'
import Sidebar from './Sidebar'
import MobileHeader from './MobileHeader'

/**
 * Layout principal del portal (solo usuarios logueados).
 * Desktop: sidebar fija + tarjeta central flotante sobre el fondo temático.
 * Móvil: cabecera con hamburguesa + contenido a ancho completo.
 *
 * Nota: la tarjeta usa una animación de entrada SOLO (sin AnimatePresence /
 * exit). AnimatePresence con mode="wait" + navegación rápida entre pestañas
 * provocaba que la nueva página se quedara en blanco al interrumpir la
 * animación de salida. Ahora cada ruta monta al instante.
 */
export default function MainLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen">
      <Background />

      <div className="flex">
        <Sidebar />

        {/* Contenedor central: tarjeta flotante */}
        <main className="flex min-h-screen flex-1 flex-col">
          <MobileHeader />

          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="app-card min-h-[70vh] p-5 sm:p-8"
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  )
}
