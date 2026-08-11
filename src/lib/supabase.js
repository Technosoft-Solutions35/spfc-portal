import { createClient } from '@supabase/supabase-js'

// Cliente único de Supabase para toda la SPA.
// Las credenciales se cargan desde las variables de entorno (ver .env.example).

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // No lanzamos error para que el frontend pueda renderizarse en modo desarrollo
  // sin backend; solo avisamos en consola.
  console.warn(
    '[SpFc] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y completa los valores.'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'public-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)
