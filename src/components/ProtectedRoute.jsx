import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMaintenance } from '../context/MaintenanceContext'
import Spinner from './ui/Spinner'

/**
 * Guarda de rutas: exige sesión iniciada y, opcionalmente, un rol o uno de
 * varios permisos de la matriz (DLC 14).
 * Cuando el modo mantenimiento está activo, solo admin/super-admin pasan.
 */
export default function ProtectedRoute({ roles, anyPermission, children }) {
  const { session, role, can, loading: authLoading } = useAuth()
  const { maintenance, loading: maintLoading } = useMaintenance()
  const location = useLocation()

  if (authLoading || maintLoading) return <Spinner full label="Comprobando sesión..." />

  // Modo mantenimiento: solo admin y super-admin pasan
  if (maintenance && (!session || (role !== 'admin' && role !== 'super-admin'))) {
    return <Navigate to="/mantenimiento" replace />
  }

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
