import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './ui/Spinner'

/**
 * Guarda de rutas: exige sesión iniciada y, opcionalmente, un rol o uno de
 * varios permisos de la matriz (DLC 14).
 * Uso: <ProtectedRoute roles={['admin']}><Raffles /></ProtectedRoute>
 *      <ProtectedRoute anyPermission={['content', 'members']}><ContentManagement /></ProtectedRoute>
 */
export default function ProtectedRoute({ roles, anyPermission, children }) {
  const { session, role, can, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner full label="Comprobando sesión..." />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/" replace />
  }

  if (anyPermission && anyPermission.length > 0 && !anyPermission.some(can)) {
    return <Navigate to="/" replace />
  }

  return children
}
