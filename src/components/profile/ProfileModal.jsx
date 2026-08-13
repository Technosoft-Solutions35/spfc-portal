import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'
import ProfileView from './ProfileView'

/**
 * Modal de perfil de TERCEROS (solo lectura + Colección Shiny).
 * Se abre al hacer clic en el nombre de un miembro en las tablas o listados.
 */
export default function ProfileModal({ userId, onClose }) {
  const [profile, setProfile] = useState(null)
  const [hall, setHall] = useState(null)

  useEffect(() => {
    if (!userId) return
    let mounted = true

    supabase
      .from('profiles')
      .select('id, username, email, avatar_url, title, role, shinies, ign, affiliation, game_roles, bio, created_at')
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

  return (
    <Modal open={!!userId} onClose={onClose} title={profile?.username || 'Perfil'} maxWidth="max-w-2xl">
      <ProfileView profile={profile} hall={hall} loadingHall={!!userId && !hall} />
    </Modal>
  )
}
