import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './components/ui/Toast'
import ProtectedRoute from './components/ProtectedRoute'
import MainLayout from './components/layout/MainLayout'
import ThemeToggle from './components/layout/ThemeToggle'
import Spinner from './components/ui/Spinner'

// Carga diferida de páginas: cada ruta se descarga en su propio chunk,
// así el bundle inicial es más ligero y al navegar todo va bajo demanda.
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Verify = lazy(() => import('./pages/Verify'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ShinyHunt = lazy(() => import('./pages/ShinyHunt'))
const Tournaments = lazy(() => import('./pages/Tournaments'))
const Guides = lazy(() => import('./pages/Guides'))
const Events = lazy(() => import('./pages/Events'))
const Raffles = lazy(() => import('./pages/Raffles'))
const ContentManagement = lazy(() => import('./pages/ContentManagement'))

/**
 * Raíz de la aplicación: proveedores globales + rutas.
 * Se usa HashRouter para que los enlaces de verificación/recovery
 * de Supabase (que llegan con token_hash en la URL) funcionen en
 * cualquier hosting estático sin configuración extra.
 */
export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <HashRouter>
            <ThemeToggle />

            <Suspense fallback={<Spinner full label="Cargando..." />}>
              <Routes>
                {/* ── Autenticación ── */}
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                <Route path="/verificar" element={<Verify />} />
                <Route path="/recuperar" element={<ForgotPassword />} />
                <Route path="/restablecer" element={<ResetPassword />} />

                {/* ── Portal (sesión requerida) ── */}
                <Route
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/shiny-hunt" element={<ShinyHunt />} />
                  <Route path="/torneos" element={<Tournaments />} />
                  <Route path="/guias" element={<Guides />} />
                  <Route path="/eventos" element={<Events />} />

                  {/* Panel de sorteos: lo ve todo el clan; gestión solo admin */}
                  <Route path="/sorteos" element={<Raffles />} />

                  {/* Gestión de contenido: admin, gestor y super-admin */}
                  <Route
                    path="/gestion"
                    element={
                      <ProtectedRoute roles={['super-admin', 'admin', 'gestor']}>
                        <ContentManagement />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </HashRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
