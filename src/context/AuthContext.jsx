import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

/**
 * Contexto global de autenticación.
 * Mantiene la sesión de Supabase y el perfil del usuario (con su rol),
 * refrescándolo cuando cambia la sesión.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Carga el perfil público del usuario logueado
  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error) setProfile(data)
  }, [])

  useEffect(() => {
    let active = true

    // Sesión inicial (ya persistida por Supabase en localStorage)
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      if (data.session?.user) {
        loadProfile(data.session.user.id)
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

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    refreshProfile,
    logout,
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
