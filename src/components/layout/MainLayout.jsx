import { useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'
import Background from './Background'
import Sidebar from './Sidebar'
import MobileHeader from './MobileHeader'
import ContentNotifier from './ContentNotifier'
import FooterLinks from './FooterLinks'

/**
 * Layout principal del portal (solo usuarios logueados).
 * Desktop: sidebar fija + tarjeta central flotante sobre el fondo temático.
 * Móvil: cabecera con hamburguesa + contenido a ancho completo.
 *
 * Transición entre secciones: monta la página al instante (sin animación de
 * salida, que provocaba pantallas en blanco con navegación rápida) con una
 * entrada muy corta. Al cambiar de ruta se sube al tope para no arrastrar el
 * scroll de la sección anterior.
 */
export default function MainLayout() {
  const location = useLocation()
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
  }, [location.pathname])

  return (
    <div className="min-h-screen">
      <Background />
      <ContentNotifier />

      <div className="flex">
        <Sidebar />

        {/* Contenedor central: tarjeta flotante */}
        <main className="flex min-h-screen flex-1 flex-col">
          <MobileHeader />

          <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 lg:py-10">
            <motion.div
              key={location.pathname}
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="app-card min-h-[70vh] p-5 sm:p-8"
            >
              <Outlet />
            </motion.div>
          </div>

          <FooterLinks />
        </main>
      </div>
    </div>
  )
}
