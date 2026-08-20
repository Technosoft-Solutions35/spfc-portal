import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const MaintenanceContext = createContext(null)

/**
 * Proveedor del modo mantenimiento. Consulta `site_settings` en la BD
 * y mantiene el estado en tiempo real para que toda la app reaccione.
 */
export function MaintenanceProvider({ children }) {
  const [maintenance, setMaintenance] = useState(null) // null = cargando, true/false = estado

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'maintenance_mode')
      .maybeSingle()
    setMaintenance(data?.value === true || data?.value === 'true')
  }, [])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('maintenance-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, load)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [load])

  const toggle = useCallback(async () => {
    const next = !maintenance
    const { error } = await supabase
      .from('site_settings')
      .update({ value: next, updated_at: new Date().toISOString() })
      .eq('key', 'maintenance_mode')
    if (!error) setMaintenance(next)
    return { ok: !error, error }
  }, [maintenance])

  return (
    <MaintenanceContext.Provider value={{ maintenance, toggle, loading: maintenance === null }}>
      {children}
    </MaintenanceContext.Provider>
  )
}

export function useMaintenance() {
  return useContext(MaintenanceContext)
}
