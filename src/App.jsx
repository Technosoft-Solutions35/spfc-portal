import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { PresenceProvider } from './context/PresenceContext'
import { ThemeProvider } from './context/ThemeContext'
import { MaintenanceProvider } from './context/MaintenanceContext'
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
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const News = lazy(() => import('./pages/News'))
const ShinyHunt = lazy(() => import('./pages/ShinyHunt'))
const EventosTorneos = lazy(() => import('./pages/EventosTorneos'))
const Guides = lazy(() => import('./pages/Guides'))
const Birthdays = lazy(() => import('./pages/Birthdays'))
const Builds = lazy(() => import('./pages/Builds'))
const Commerce = lazy(() => import('./pages/Commerce'))
const Brackets = lazy(() => import('./pages/Brackets'))
const Raffles = lazy(() => import('./pages/Raffles'))
const ContentManagement = lazy(() => import('./pages/ContentManagement'))
const Profile = lazy(() => import('./pages/Profile'))
const MyShinies = lazy(() => import('./pages/MyShinies'))
const ReviewShinies = lazy(() => import('./pages/ReviewShinies'))
const MemberSearch = lazy(() => import('./pages/MemberSearch'))
const Mods = lazy(() => import('./pages/Mods'))
const PokeMMOForum = lazy(() => import('./pages/PokeMMOForum'))

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
          <MaintenanceProvider>
            <PresenceProvider>
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

                  {/* ── Mantenimiento (pública) ── */}
                  <Route path="/mantenimiento" element={<MaintenancePage />} />

                  {/* ── Portal (sesión requerida) ── */}
                  <Route
                    element={
                      <ProtectedRoute>
                        <MainLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/noticias" element={<News />} />
                    <Route path="/shiny-hunt" element={<ShinyHunt />} />
                    <Route path="/eventos-torneos" element={<EventosTorneos />} />
                    <Route path="/guias" element={<Guides />} />
                    <Route path="/cumpleanos" element={<Birthdays />} />
                    <Route path="/builds" element={<Builds />} />
                    <Route path="/comercio" element={<Commerce />} />
                    <Route path="/brackets" element={<Brackets />} />

                    {/* DLC 1: perfil propio */}
                    <Route path="/perfil" element={<Profile />} />

                    {/* DLC 2: reportes de shinies (miembro) y revisión (staff) */}
                    <Route path="/mis-shinies" element={<MyShinies />} />
                    <Route
                      path="/revisar-shinies"
                      element={
                        <ProtectedRoute anyPermission={['shinies_review']}>
                          <ReviewShinies />
                        </ProtectedRoute>
                      }
                    />

                    {/* Panel de sorteos: lo ve todo el clan; gestión solo con permiso */}
                    <Route path="/sorteos" element={<Raffles />} />

                    {/* DLC 15: directorio de miembros (todos) */}
                    <Route path="/directorio" element={<MemberSearch />} />

                    {/* DLC 16: biblioteca de mods (todos) */}
                    <Route path="/mods" element={<Mods />} />

                    {/* Noticias del foro PokeMMO vía RSS (todos) */}
                    <Route path="/pokemmo-forum" element={<PokeMMOForum />} />

                    {/* Gestión de contenido: quien tenga permiso de contenido o miembros */}
                    <Route
                      path="/gestion"
                      element={
                        <ProtectedRoute anyPermission={['content', 'members']}>
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
            </PresenceProvider>
          </MaintenanceProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  )
}
