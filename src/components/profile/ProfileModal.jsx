import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import ProfileView from './ProfileView'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'
import { storagePathFromUrl } from '../../lib/utils'

/**
 * Modal de perfil de TERCEROS (solo lectura + Colección Shiny).
 * Se abre al hacer clic en el nombre de un miembro en las tablas o listados.
 * El super-admin puede eliminar de aquí los shinies aprobados por error.
 */
export default function ProfileModal({ userId, onClose }) {
  const { can } = useAuth()
  const { toast } = useToast()
  const [profile, setProfile] = useState(null)
  const [hall, setHall] = useState(null)

  useEffect(() => {
    if (!userId) return
    let mounted = true

    supabase
      .from('profiles')
      .select('id, username, avatar_url, title, role, shinies, ign, affiliation, game_roles, bio, created_at')
      .eq('id', userId)
      .single()
      .then(({ data }) => mounted && setProfile(data))

    supabase
      .from('hall_of_fame')
      .select('id, pokemon_name, image_url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => mounted && setHall(data || []))

    return () => {
      mounted = false
    }
  }, [userId])

  const deleteShiny = async (h) => {
    if (!window.confirm(`¿Eliminar "${h.pokemon_name}" del perfil de ${profile?.username || 'este usuario'}? Se quitará 1 shiny de su contador.`)) return
    const { error } = await supabase.rpc('delete_hall_of_fame_entry', { p_id: h.id })
    if (error) return toast('No se pudo eliminar: ' + error.message, 'error')
    const path = storagePathFromUrl(h.image_url)
    if (path) await supabase.storage.from('media').remove([path]).catch(() => {})
    setHall((prev) => prev.filter((x) => x.id !== h.id))
    setProfile((p) => (p ? { ...p, shinies: Math.max(0, (p.shinies ?? 0) - 1) } : p))
    toast('Shiny eliminado del perfil', 'success')
  }

  return (
    <Modal open={!!userId} onClose={onClose} title={profile?.username || 'Perfil'} maxWidth="max-w-2xl">
      <ProfileView
        profile={profile}
        hall={hall}
        loadingHall={!!userId && !hall}
        canDeleteShinies={can('shinies_delete')}
        onDeleteShiny={can('shinies_delete') ? deleteShiny : undefined}
      />
    </Modal>
  )
}
