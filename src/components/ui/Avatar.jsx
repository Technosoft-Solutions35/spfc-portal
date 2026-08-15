import { useState } from 'react'
import { Crown, Shield, ShieldCheck } from 'lucide-react'

// Foto de perfil predeterminada para quienes no hayan subido una propia.
const DEFAULT_AVATAR = `${import.meta.env.BASE_URL}img/default-avatar.png`

// Avatar del miembro: usa avatar_url si existe; si no, muestra la foto
// predeterminada. Si la imagen falla (red/offline), cae a la inicial.
export default function Avatar({ name = '', src, size = 'md', className = '' }) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-2xl',
  }
  const sizeClass = className || sizes[size]
  const initial = (name || '?').trim().charAt(0).toUpperCase()
  const [broken, setBroken] = useState(false)

  if (broken) {
    return (
      <div
        className={`${sizeClass} flex items-center justify-center rounded-full bg-primary/15 font-bold text-primary ring-2 ring-primary/20`}
      >
        {initial}
      </div>
    )
  }

  return (
    <img
      src={src || DEFAULT_AVATAR}
      alt={name || 'Avatar'}
      onError={() => setBroken(true)}
      className={`${sizeClass} rounded-full object-cover ring-2 ring-primary/30`}
    />
  )
}

// Badge de rol con icono
export function RoleBadge({ role }) {
  if (role === 'super-admin') {
    return (
      <span className="badge bg-secondary/15 text-secondary">
        <Crown size={13} />
        Super Admin
      </span>
    )
  }
  if (role === 'admin') {
    return (
      <span className="badge-admin">
        <ShieldCheck size={13} />
        Admin
      </span>
    )
  }
  if (role === 'gestor') {
    return (
      <span className="badge-gestor">
        <Shield size={13} />
        Gestor
      </span>
    )
  }
  return <span className="badge-member">Miembro</span>
}
