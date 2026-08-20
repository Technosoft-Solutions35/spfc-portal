import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  CalendarDays, ChevronDown, ClipboardList, MapPin, Network, Shield, Swords, Tag, Trophy, Users,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { markSeen, useLiveSection } from '../lib/newContent'
import {
  EVENT_TYPES, PVP_TIERS, PVE_TIERS, EVENT_STATUS,
  formatDate, formatShortDate, canHaveBrackets,
} from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import CommentSection from '../components/ui/CommentSection'
import RsvpBox from '../components/ui/RsvpBox'
import PostActions from '../components/ui/PostActions'
import { readDeepLink } from '../lib/share'

const TYPE_ICON = { PvP: Swords, 'PvE/Mixtos': Shield }

function typeBadgeClass(type) {
  if (type === 'PvE/Mixtos') return 'bg-secondary/90'
  return 'bg-primary/90'
}

function typeBadgeClassLight(type) {
  if (type === 'PvE/Mixtos') return 'bg-secondary/10 text-secondary'
  return 'bg-primary/10 text-primary'
}

function tierBadgeClass(tier) {
  if (PVP_TIERS.includes(tier)) return 'bg-primary/10 text-primary'
  if (PVE_TIERS.includes(tier)) return 'bg-secondary/10 text-secondary'
  return 'bg-soft/10 text-soft'
}

/**
 * Eventos/Torneos unificados: grid de 3 columnas con tarjetas de imagen,
 * click para abrir modal con toda la información.
 */
export default function EventosTorneos() {
  const [events, setEvents] = useState(null)
  const [active, setActive] = useState(null)
  const [typeFilter, setTypeFilter] = useState(null)
  const [tierFilter, setTierFilter] = useState(null)
  const [rulesExpanded, setRulesExpanded] = useState(false)
  const deepHandled = useRef(false)

  const allTiers = events
    ? [...new Set(events.map((e) => e.tier).filter(Boolean))].sort()
    : []

  const load = useCallback(() => {
    return supabase
      .from('events')
      .select('*')
      .order('date', { ascending: true })
      .then(({ data }) => {
        setEvents(data || [])
        const dl = readDeepLink()
        if (dl?.param === 'event' && !deepHandled.current) {
          deepHandled.current = true
          const found = (data || []).find((e) => e.id === dl.id)
          if (found) setActive(found)
        }
      })
  }, [])

  useEffect(() => {
    markSeen('events')
    load()
  }, [load])

  useLiveSection('events', load)

  const filtered = events?.filter((e) => {
    if (typeFilter && e.event_type !== typeFilter) return false
    if (tierFilter && e.tier !== tierFilter) return false
    return true
  })

  const now = new Date()
  const upcoming = filtered?.filter((e) => new Date(e.date) >= now) ?? []
  const past = filtered?.filter((e) => new Date(e.date) < now) ?? []

  return (
    <div>
      <PageHeader
        title="Eventos / Torneos"
        subtitle="Competiciones, hunts grupales, quedadas y toda actividad del clan en un solo lugar."
        icon={CalendarDays}
      />

      {/* Filtros */}
      {!events && <Spinner label="Cargando eventos..." />}
      {events && (
        <div className="mb-6 space-y-3">
          {/* Tipo */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => { setTypeFilter(null); setTierFilter(null) }}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                !typeFilter
                  ? 'bg-primary text-white shadow'
                  : 'border border-edge bg-surface text-soft hover:border-primary/40 hover:text-text'
              }`}
            >
              Todos
            </button>
            {EVENT_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => { setTypeFilter(typeFilter === t ? null : t); setTierFilter(null) }}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  typeFilter === t
                    ? 'bg-primary text-white shadow'
                    : 'border border-edge bg-surface text-soft hover:border-primary/40 hover:text-text'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {/* Tier (solo si hay tipo seleccionado) */}
          {typeFilter && (
            <div className="flex flex-wrap gap-2">
              {(typeFilter === 'PvP' ? PVP_TIERS : PVE_TIERS).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTierFilter(tierFilter === t ? null : t)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                    tierFilter === t
                      ? 'bg-secondary text-white shadow'
                      : 'border border-edge bg-surface text-soft hover:border-secondary/40 hover:text-text'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {!events ? null : upcoming.length === 0 && past.length === 0 ? (
        typeFilter || tierFilter ? (
          <EmptyState title="Sin resultados" hint="No hay eventos con esos filtros." icon={Tag} />
        ) : (
          <EmptyState
            title="No hay eventos publicados"
            hint="El staff publicará aquí las próximas actividades del clan."
            icon={CalendarDays}
          />
        )
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((e, i) => (
                <EventCard key={e.id} e={e} i={i} onClick={() => setActive(e)} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <>
              <h3 className="pt-2 font-display text-sm font-bold text-soft">Eventos pasados</h3>
              <div className="grid gap-5 opacity-70 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((e, i) => (
                  <EventCard key={e.id} e={e} i={i} onClick={() => setActive(e)} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Modal detalle */}
      <Modal open={!!active} onClose={() => { setActive(null); setRulesExpanded(false) }} title={active?.title}>
        {active && (
          <EventDetail
            e={active}
            rulesExpanded={rulesExpanded}
            onToggleRules={() => setRulesExpanded((v) => !v)}
          />
        )}
      </Modal>
    </div>
  )
}

// ── Tarjeta de evento ─────────────────────────────────────────────
function EventCard({ e, i, onClick }) {
  const status = EVENT_STATUS[e.status] || EVENT_STATUS.open
  const TypeIcon = TYPE_ICON[e.event_type] || CalendarDays

  const img = e.images?.[0] || e.image_url

  return (
    <motion.div
      data-item-id={e.id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.05 }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); onClick() } }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-edge bg-elevated text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
    >
      {/* Imagen */}
      <div
        className="relative h-36 w-full bg-cover bg-center transition group-hover:scale-[1.03]"
        style={{
          backgroundImage: `url(${img || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200"><rect width="400" height="200" fill="%231A1D24"/><rect width="400" height="200" fill="url(%23g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%23${e.event_type === 'PvE/Mixtos' ? 'F97316' : 'EF4444'}" stop-opacity="0.4"/><stop offset="1" stop-color="%2306B6D4" stop-opacity="0.25"/></linearGradient></defs></svg>`})`,
        }}
      >
        <span className={`absolute top-2 left-2 flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-white shadow-lg ${typeBadgeClass(e.event_type)}`}>
          <TypeIcon size={12} />
          {e.event_type}
        </span>
        <span className={`absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold ${status.class}`}>
          {status.label}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-display font-bold text-text transition group-hover:text-primary">
          {e.title}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-soft">
          <span className="flex items-center gap-1">
            <CalendarDays size={11} />
            {formatDate(e.date)}
          </span>
          {e.tier && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tierBadgeClass(e.tier)}`}>
              {e.tier}
            </span>
          )}
        </div>
        {e.description && (
          <p className="mt-2 line-clamp-2 text-sm text-soft">{e.description}</p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-edge pt-3">
          <PostActions
            parentType="event"
            parentId={e.id}
            shareRoute="/eventos-torneos"
            shareParam="event"
            shareText={e.title}
          />
          <p className="text-[11px] text-soft">{formatShortDate(e.created_at)}</p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Detalle del evento en modal ───────────────────────────────────
function EventDetail({ e, rulesExpanded, onToggleRules }) {
  const status = EVENT_STATUS[e.status] || EVENT_STATUS.open
  const TypeIcon = TYPE_ICON[e.event_type] || CalendarDays
  const allImages = e.images?.length ? e.images : (e.image_url ? [e.image_url] : [])
  const [imgIdx, setImgIdx] = useState(0)

  const canBracket = canHaveBrackets(e)

  return (
    <div className="space-y-4">
      {/* Imagen principal + galería */}
      {allImages.length > 0 && (
        <div>
          <img
            src={allImages[imgIdx]}
            alt={e.title}
            className="w-full rounded-xl object-cover"
            style={{ maxHeight: 260 }}
          />
          {allImages.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {allImages.map((url, idx) => (
                <button
                  key={idx}
                  onClick={() => setImgIdx(idx)}
                  className={`h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    idx === imgIdx ? 'border-primary' : 'border-edge opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${typeBadgeClassLight(e.event_type)}`}>
          <TypeIcon size={13} />
          {e.event_type}
        </span>
        {e.tier && (
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tierBadgeClass(e.tier)}`}>
            <Tag size={13} />
            {e.tier}
          </span>
        )}
        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${status.class}`}>
          {status.label}
        </span>
      </div>

      {/* Descripción */}
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text">{e.description}</p>

      {/* Info grid */}
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-2">
          <CalendarDays size={13} className="text-primary" />
          <span className="text-soft">Inicio</span>
          <span className="ml-auto text-right font-semibold text-text">
            {formatDate(e.date)}
            <span className="ml-1 font-normal text-soft">· hora local</span>
          </span>
        </div>
        {e.moderator && (
          <div className="flex items-center gap-1.5 rounded-lg bg-background px-2.5 py-2">
            <Users size={13} className="text-secondary" />
            <span className="text-soft">Moderador</span>
            <span className="ml-auto truncate font-semibold text-text">{e.moderator}</span>
          </div>
        )}
      </dl>

      {/* Premios */}
      {e.prize_count > 0 && e.prizes?.length > 0 && (
        <div className="rounded-xl bg-background p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-text">
            <Trophy size={13} className="text-secondary" />
            Premios ({e.prize_count} lugar{e.prize_count > 1 ? 'es' : ''})
          </p>
          <ul className="space-y-1">
            {e.prizes.map((p, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs text-text">
                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                  idx === 0 ? 'bg-secondary' : idx === 1 ? 'bg-soft' : 'bg-edge text-text'
                }`}>
                  {p.position || idx + 1}
                </span>
                {p.prize || p.description || 'Sin definir'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reglas */}
      {e.rules && (
        <div>
          <button
            onClick={onToggleRules}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {rulesExpanded ? 'Ocultar reglas' : 'Ver reglas'}
          </button>
          {rulesExpanded && (
            <p className="mt-2 whitespace-pre-wrap rounded-xl bg-background p-3 text-sm leading-relaxed text-text">
              {e.rules}
            </p>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PostActions
          parentType="event"
          parentId={e.id}
          shareRoute="/eventos-torneos"
          shareParam="event"
          shareText={e.title}
        />
        {canBracket && (
          <a
            href={`#/brackets?brackets=${e.id}`}
            className="flex items-center gap-1.5 rounded-full border border-edge px-3 py-1.5 text-xs font-bold text-soft transition hover:border-secondary hover:text-secondary"
          >
            <Network size={14} />
            Ver llaves
          </a>
        )}
      </div>

      <RsvpBox parentType="event" parentId={e.id} />
      <CommentSection parentType="event" parentId={e.id} />
    </div>
  )
}
