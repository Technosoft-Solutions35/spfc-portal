import { useEffect, useRef } from 'react'
import { subscribeContentCreated } from '../../lib/notifications'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'

const CONTENT_META = {
  news: 'Nueva noticia',
  events: 'Nuevo evento',
  tournaments: 'Nuevo torneo',
  guides: 'Nueva guía',
}

/**
 * Escucha los avisos de contenido nuevo publicados por el staff y los muestra
 * como toast en tiempo real (se omite el propio usuario que lo publicó).
 * Se monta dentro de MainLayout, así que solo corre con sesión iniciada.
 */
export default function ContentNotifier() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const uidRef = useRef(profile?.id)
  uidRef.current = profile?.id

  useEffect(() => {
    return subscribeContentCreated((payload) => {
      // Avisos personales: solo para el destinatario
      if (payload.forUserId) {
        if (payload.forUserId === uidRef.current && payload.message) {
          toast(payload.message, 'info', 6000)
        }
        return
      }
      // Avisos globales: se omite el propio usuario que los publicó
      if (payload.uid && payload.uid === uidRef.current) return
      const label = CONTENT_META[payload.type] || 'Nuevo contenido'
      toast(`${label}: ${payload.title || ''}`.trim(), 'info', 5000)
    })
  }, [toast])

  return null
}
