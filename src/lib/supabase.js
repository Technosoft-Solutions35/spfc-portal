import { createClient } from '@supabase/supabase-js'

// Cliente único de Supabase para toda la SPA.
// Las credenciales se cargan desde las variables de entorno (ver .env.example).

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // No lanzamos error para que el frontend pueda renderizarse en modo desarrollo
  // sin backend; solo avisamos en consola.
  console.warn(
    '[SpFc] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'Copia .env.example a .env y completa los valores.'
  )
}

// Preconecta con Supabase en cuanto carga la app: el navegador abre la conexión
// TLS antes de la primera petición real, así login/consultas arrancan antes.
if (typeof document !== 'undefined' && supabaseUrl?.startsWith('https://')) {
  const link = document.createElement('link')
  link.rel = 'preconnect'
  link.href = supabaseUrl
  document.head.appendChild(link)
  const dns = document.createElement('link')
  dns.rel = 'dns-prefetch'
  dns.href = supabaseUrl
  document.head.appendChild(dns)
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

/**
 * Sube un archivo al bucket de Storage con barra de progreso REAL.
 * La librería de Supabase actual sube con fetch, que no reporta avance
 * (por eso la barra se quedaba en 0%). Este helper hace la misma llamada
 * REST (`POST /storage/v1/object/<bucket>/<path>` con multipart) pero usando
 * XMLHttpRequest, que sí emite eventos de progreso en todos los navegadores.
 * Devuelve `{ path }` (la ruta limpia, sin el bucket) como la API oficial.
 */
export function uploadWithProgress({ bucket, path, file, cacheControl = '3600', onProgress }) {
  return new Promise((resolve, reject) => {
    supabase.auth.getSession().then(({ data }) => {
      const token = data?.session?.access_token
      const xhr = new XMLHttpRequest()
      const form = new FormData()
      form.append('cacheControl', cacheControl)
      form.append('', file)

      xhr.open('POST', `${supabaseUrl}/storage/v1/object/${bucket}/${path}`)
      xhr.setRequestHeader('apikey', supabaseAnonKey)
      xhr.setRequestHeader('x-upsert', 'false')
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && e.total > 0 && onProgress) {
          onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)))
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ path })
        } else {
          let msg = `HTTP ${xhr.status}`
          try {
            const parsed = JSON.parse(xhr.responseText)
            msg = parsed?.error || parsed?.message || msg
          } catch {
            // cuerpo no JSON
          }
          reject(new Error(msg))
        }
      }
      xhr.onerror = () => reject(new Error('Error de red'))
      xhr.send(form)
    }, reject)
  })
}
