import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMaintenance } from '../context/MaintenanceContext'
import Spinner from './ui/Spinner'

/**
 * Guarda de rutas: exige sesión iniciada y, opcionalmente, un rol o uno de
 * varios permisos de la matriz (DLC 14).
 * Cuando el modo mantenimiento está activo, solo admin/super-admin pasan.
 * Usuarios baneados son bloqueados completamente (DLC Security).
 */
export default function ProtectedRoute({ roles, anyPermission, children }) {
  const { session, role, can, loading: authLoading, profileLoading, isBanned, banInfo } = useAuth()
  const { maintenance, loading: maintLoading } = useMaintenance()
  const location = useLocation()

  if (authLoading || maintLoading) return <Spinner full label="Comprobando sesión..." />

  // Si hay sesión pero el profile aún carga, esperamos antes de decidir
  if (session && profileLoading) return <Spinner full label="Cargando perfil..." />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  // Usuarios baneados no pueden acceder a ninguna ruta protegida (excepto super-admin)
  if (isBanned && role !== 'super-admin') {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-8">
          <h2 className="font-display text-xl font-extrabold text-primary">Cuenta baneada</h2>
          <p className="mt-2 max-w-md text-sm text-soft">
            Tu cuenta ha sido {banInfo?.ban_type === 'perm' ? 'baneada permanentemente' : 'baneada temporalmente'}.
          </p>
          {banInfo?.reason && (
            <p className="mt-2 text-sm text-text">Razón: <strong>{banInfo.reason}</strong></p>
          )}
          {banInfo?.expires_at && banInfo?.ban_type === 'temp' && (
            <p className="mt-1 text-xs text-soft">
              Expira: {new Date(banInfo.expires_at).toLocaleString('es-ES')}
            </p>
          )}
          <p className="mt-3 text-xs text-soft">
            Si crees que esto es un error, contacta al administrador del clan.
          </p>
        </div>
      </div>
    )
  }

  // Modo mantenimiento: solo admin y super-admin pasan
  if (maintenance && (!session || (role !== 'admin' && role !== 'super-admin'))) {
    return <Navigate to="/mantenimiento" replace />
  }

  if (roles && roles.length > 0 && !roles.includes(role)) {
    return <Navigate to="/" replace />
  }

  if (anyPermission && anyPermission.length > 0 && !anyPermission.some(can)) {
    return <Navigate to="/" replace />
  }

  return children
}
