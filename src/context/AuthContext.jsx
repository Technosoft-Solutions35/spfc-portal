import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES } from '../lib/utils'

const AuthContext = createContext(null)

/**
 * Contexto global de autenticación.
 * Mantiene la sesión de Supabase, el perfil del usuario (con su rol) y los
 * permisos que tiene según la matriz role_permissions (DLC 14).
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  // Carga los permisos que tiene el rol del usuario en la matriz
  const loadPermissions = useCallback(async (role) => {
    if (!role) {
      setPermissions([])
      return
    }
    const { data, error } = await supabase
      .from('role_permissions')
      .select('permission')
      .eq('role', role)
    if (!error) setPermissions((data || []).map((r) => r.permission))
  }, [])

  // Carga el perfil público del usuario logueado
  const loadProfile = useCallback(
    async (userId) => {
      if (!userId) {
        setProfile(null)
        setPermissions([])
        return
      }
      setProfileLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (!error) {
        setProfile(data)
        await loadPermissions(data.role)
      }
      setProfileLoading(false)
    },
    [loadPermissions]
  )

  useEffect(() => {
    let active = true

    // Sesión inicial (ya persistida por Supabase en localStorage)
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session?.user) {
        await loadProfile(data.session.user.id)
      }
      setLoading(false)
    })

    // Reacciona a login / logout / refresh de token
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!active) return
        setSession(newSession)
        loadProfile(newSession?.user?.id)
      }
    )

    return () => {
      active = false
      listener?.subscription?.unsubscribe()
    }
  }, [loadProfile])

  // Permite refrescar el perfil tras una actualización (ej: cambio de rol)
  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user?.id)
  }, [session, loadProfile])

  // Recarga los permisos del rol actual (tras guardar cambios en la matriz)
  const refreshPermissions = useCallback(async () => {
    await loadPermissions(profile?.role)
  }, [profile, loadPermissions])

  // ¿Tiene un permiso concreto de la matriz? El super-admin siempre tiene todo.
  const can = useCallback(
    (perm) => {
      if (profile?.role === ROLES.SUPER_ADMIN) return true
      return Array.isArray(permissions) && permissions.includes(perm)
    },
    [profile, permissions]
  )

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    permissions,
    loading,
    profileLoading,
    refreshProfile,
    refreshPermissions,
    logout,
    can,
    // Rol del usuario logueado ('' si no hay sesión)
    role: profile?.role ?? '',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
