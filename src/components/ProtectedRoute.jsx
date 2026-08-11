import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './ui/Spinner'

/**
 * Guarda de rutas: exige sesión iniciada y, opcionalmente, un rol concreto.
 * Uso: <ProtectedRoute roles={['admin']}><Raffles /></ProtectedRoute>
 */
export default function ProtectedRoute({ roles, children }) {
  const { session, role, loading } = useAuth()
  const location = useLocation()

  if (loading) return <Spinner full label="Comprobando sesión..." />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (roles && roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/" replace />
  }

  return children
}
