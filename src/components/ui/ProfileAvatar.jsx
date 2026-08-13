import { useState } from 'react'
import Avatar from './Avatar'
import ProfileModal from '../profile/ProfileModal'

/**
 * Avatar clicable: al tocar la foto de un miembro se abre su perfil superpuesto.
 * Sustituye a <Avatar> en listados/tablas para que cualquier foto de portada
 * abra el perfil, no solo el nombre.
 *
 * Si el contenedor padre ya maneja el clic (filas/botones que abren su propio
 * modal), pasa interactive={false} para renderizar el avatar como imagen simple
 * y evitar que se apilen dos modales por un solo toque.
 */
export default function ProfileAvatar({
  userId,
  name,
  src,
  size = 'sm',
  title,
  className,
  interactive = true,
}) {
  const [viewing, setViewing] = useState(null)

  if (!userId || !interactive)
    return <Avatar name={name} src={src} size={size} className={className} />

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setViewing(userId)
        }}
        title={title || `Ver perfil de ${name || 'este usuario'}`}
        className="shrink-0 rounded-full transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <Avatar name={name} src={src} size={size} className={className} />
      </button>
      <ProfileModal userId={viewing} onClose={() => setViewing(null)} />
    </>
  )
}
