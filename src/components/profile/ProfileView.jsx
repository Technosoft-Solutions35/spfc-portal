import { useState } from 'react'
import { CalendarDays, Sparkles, Trophy, X, ZoomIn } from 'lucide-react'
import Avatar, { RoleBadge } from '../ui/Avatar'
import { formatShortDate, GAME_ROLES, AFFILIATIONS } from '../../lib/utils'
import EmptyState from '../ui/EmptyState'
import Spinner from '../ui/Spinner'

const ROLE_ICONS = {
  Criador: '🥚',
  'Entrenador EVs': '📈',
  'Jugador PvP': '⚔️',
  ShinyHunter: '✨',
  'Jugador PvE': '🎮',
}

/**
 * Vista de perfil (leer): datos públicos de juego + Colección Shiny.
 * La usan el perfil propio (página) y el de terceros (modal).
 */
export default function ProfileView({ profile, hall, loadingHall = false }) {
  const [zoomed, setZoomed] = useState(null)

  if (!profile) return <Spinner label="Cargando perfil..." />

  const affiliation = AFFILIATIONS.includes(profile.affiliation)
    ? profile.affiliation
    : null
  const roles = (profile.game_roles || []).filter((r) => GAME_ROLES.includes(r))

  return (
    <div>
      {/* Cabecera del perfil */}
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
        <Avatar name={profile.username} src={profile.avatar_url} size="xl" />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h3 className="font-display text-2xl font-extrabold text-text">{profile.username}</h3>
            <RoleBadge role={profile.role} />
          </div>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            {affiliation && (
              <span className="badge bg-primary/10 text-primary">{affiliation}</span>
            )}
            {profile.ign && (
              <span className="badge bg-edge text-soft">IGN: {profile.ign}</span>
            )}
            <span className="badge bg-secondary/10 text-secondary">
              <Sparkles size={12} />
              {profile.shinies ?? 0} shinies
            </span>
            <span className="badge bg-edge text-soft">
              <CalendarDays size={12} />
              {formatShortDate(profile.created_at)}
            </span>
          </div>

          {roles.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
              {roles.map((r) => (
                <span
                  key={r}
                  className="inline-flex items-center gap-1 rounded-full bg-background px-2.5 py-0.5 text-xs font-semibold text-soft"
                >
                  {ROLE_ICONS[r] || '🎯'} {r}
                </span>
              ))}
            </div>
          )}

          {profile.bio && (
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-soft">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Colección Shiny */}
      <div className="mt-6">
        <h4 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-text">
          <Trophy size={18} className="text-secondary" />
          Colección Shiny
        </h4>

        {loadingHall ? (
          <Spinner label="Cargando shinies..." />
        ) : !hall || hall.length === 0 ? (
          <EmptyState
            title="Aún sin shinies aprobados"
            hint="Cuando se aprueben sus reportes aparecerán aquí sus capturas."
            icon={Trophy}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {hall.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setZoomed(h)}
                className="group overflow-hidden rounded-xl border border-edge bg-background text-left transition hover:border-secondary/40"
              >
                <div className="relative aspect-square">
                  <img
                    src={h.image_url}
                    alt={h.pokemon_name}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
                    <ZoomIn size={15} />
                  </span>
                </div>
                <div className="px-3 py-2">
                  <p className="truncate font-display font-bold text-text">{h.pokemon_name}</p>
                  <p className="text-[10px] text-soft">{formatShortDate(h.created_at)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Visor ampliado de la captura */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center p-4"
          onClick={() => setZoomed(null)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div
            className="relative z-10 max-h-[90vh] w-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={zoomed.image_url}
              alt={zoomed.pokemon_name}
              className="max-h-[82vh] w-full rounded-xl border border-edge object-contain shadow-card"
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-extrabold text-white">
                  {zoomed.pokemon_name}
                </p>
                <p className="text-xs text-white/60">{formatShortDate(zoomed.created_at)}</p>
              </div>
              <button
                onClick={() => setZoomed(null)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Cerrar vista ampliada"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
