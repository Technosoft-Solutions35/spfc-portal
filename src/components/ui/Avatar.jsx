import { Crown, Shield, ShieldCheck } from 'lucide-react'

// Avatar con la inicial del usuario; usa avatar_url si existe.
export default function Avatar({ name = '', src, size = 'md' }) {
  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg',
    xl: 'h-20 w-20 text-2xl',
  }
  const initial = (name || '?').trim().charAt(0).toUpperCase()

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover ring-2 ring-primary/30`}
      />
    )
  }
  return (
    <div
      className={`${sizes[size]} flex items-center justify-center rounded-full bg-primary/15 font-bold text-primary ring-2 ring-primary/20`}
    >
      {initial}
    </div>
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
