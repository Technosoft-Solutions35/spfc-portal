import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { ROLES } from '../lib/utils'

const AuthContext = createContext(null)

/**
 * Contexto global de autenticación.
 * Mantiene la sesión de Supabase, el perfil del usuario (con su rol) y los
 * permisos que tiene según la matriz role_permissions (DLC 14).
 * Además verifica si el usuario está baneado (DLC Security).
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [permissions, setPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [banInfo, setBanInfo] = useState(null) // { banned: true, ... } or null
  const profileLoadedRef = useRef(false)

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

  const checkBan = useCallback(async (userId) => {
    if (!userId) { setBanInfo(null); return }
    const { data } = await supabase.rpc('is_user_banned', { p_user_id: userId })
    setBanInfo(data?.banned ? data : null)
  }, [])

  const loadProfile = useCallback(
    async (userId) => {
      if (!userId) {
        setProfile(null)
        setPermissions([])
        setBanInfo(null)
        profileLoadedRef.current = false
        return
      }
      if (!profileLoadedRef.current) setProfileLoading(true)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (!error) {
        setProfile(data)
        await loadPermissions(data.role)
        await checkBan(userId)
      }
      profileLoadedRef.current = true
      setProfileLoading(false)
    },
    [loadPermissions, checkBan]
  )

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session?.user) {
        await loadProfile(data.session.user.id)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!active) return
        setSession(newSession)
        if (event === 'TOKEN_REFRESHED') return
        loadProfile(newSession?.user?.id)
      }
    )

    return () => {
      active = false
      listener?.subscription?.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user?.id)
  }, [session, loadProfile])

  const refreshPermissions = useCallback(async () => {
    await loadPermissions(profile?.role)
  }, [profile, loadPermissions])

  const refreshBanInfo = useCallback(async () => {
    await checkBan(session?.user?.id)
  }, [session, checkBan])

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
    banInfo,
    isBanned: !!banInfo?.banned,
    refreshProfile,
    refreshPermissions,
    refreshBanInfo,
    logout,
    can,
    role: profile?.role ?? '',
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
