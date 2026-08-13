import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, ImagePlus, Plus, Swords } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import CommentSection from '../components/ui/CommentSection'
import PostActions from '../components/ui/PostActions'
import ImageInput from '../components/ui/ImageInput'
import ProfileAvatar from '../components/ui/ProfileAvatar'
import { readDeepLink } from '../lib/share'
import { formatShortDate } from '../lib/utils'

/**
 * DLC 9 — Almacén de Builds.
 * Publicaciones de equipos/pastes por tier: OU, UU, NU, Doubles VGC,
 * Little Cup y Monotype. Cada build se abre en una pestaña con like,
 * compartir y comentarios (tanto en la tarjeta como en el modal).
 */

const TIERS = [
  { slug: 'ou', label: 'Over Used' },
  { slug: 'uu', label: 'Under Used' },
  { slug: 'nu', label: 'Never Used' },
  { slug: 'vgc', label: 'Doubles VGC' },
  { slug: 'lc', label: 'Little Cup' },
  { slug: 'mono', label: 'Monotype' },
]

const tierLabel = (slug) => TIERS.find((t) => t.slug === slug)?.label ?? slug

export default function Builds() {
  const { user, profile } = useAuth()
  const { toast } = useToast()

  const [builds, setBuilds] = useState(null)
  const [activeTier, setActiveTier] = useState('all')
  const [active, setActive] = useState(null)
  const [publishing, setPublishing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ creator_name: '', tier: 'ou', paste_url: '', image_url: '' })
  const deepHandled = useRef(false)

  const load = async () => {
    const { data } = await supabase
      .from('builds')
      .select('*, author:profiles(username, avatar_url, role)')
      .order('created_at', { ascending: false })
    setBuilds(data || [])
    // Enlace directo: ?build=<id> abre esa build directamente (solo la primera vez)
    if (!deepHandled.current) {
      deepHandled.current = true
      const dl = readDeepLink()
      if (dl?.param === 'build') {
        const found = (data || []).find((b) => b.id === dl.id)
        if (found) setActive(found)
      }
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = (builds || []).filter(
    (b) => activeTier === 'all' || b.tier === activeTier,
  )

  const openPublish = (tier = activeTier === 'all' ? 'ou' : activeTier) => {
    setForm({
      creator_name: profile?.username || '',
      tier,
      paste_url: '',
      image_url: '',
    })
    setPublishing(true)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.paste_url.trim() && !form.image_url.trim()) {
      toast('Necesitas un enlace al paste o una imagen de la build', 'error')
      return
    }
    setSaving(true)
    const { error } = await supabase.from('builds').insert({
      author_id: user.id,
      tier: form.tier,
      creator_name: form.creator_name.trim() || profile?.username || '',
      paste_url: form.paste_url.trim() || null,
      image_url: form.image_url.trim() || null,
    })
    setSaving(false)
    if (error) {
      toast('No se pudo publicar la build: ' + error.message, 'error')
      return
    }
    toast('Build publicada', 'success')
    setPublishing(false)
    load()
  }

  const remove = async (build) => {
    if (!window.confirm('¿Eliminar esta build?')) return
    const { error } = await supabase.from('builds').delete().eq('id', build.id)
    if (error) {
      toast('No se pudo eliminar la build', 'error')
      return
    }
    toast('Build eliminada', 'info')
    setActive(null)
    load()
  }

  const canModerate = (build) =>
    build.author_id === user?.id ||
    profile?.role === 'admin' ||
    profile?.role === 'gestor' ||
    profile?.role === 'super-admin'

  return (
    <div>
      <PageHeader
        title="Almacén de Builds"
        subtitle="Equipos y pastes del clan por tier: comparte tu build con link o imagen."
        icon={Swords}
      />

      {/* Subsecciones por tier */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTier('all')}
          className={`rounded-full px-3.5 py-2 text-sm font-bold transition ${
            activeTier === 'all' ? 'bg-primary/15 text-primary' : 'border border-edge text-soft hover:text-text'
          }`}
        >
          Todas
        </button>
        {TIERS.map((t) => (
          <button
            key={t.slug}
            onClick={() => setActiveTier(t.slug)}
            className={`rounded-full px-3.5 py-2 text-sm font-bold transition ${
              activeTier === t.slug ? 'bg-primary/15 text-primary' : 'border border-edge text-soft hover:text-text'
            }`}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => openPublish()}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-sm font-bold text-white transition hover:brightness-110"
        >
          <Plus size={16} />
          Publicar build
        </button>
      </div>

      {!builds ? (
        <Spinner label="Cargando builds..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={`Sin builds${activeTier === 'all' ? '' : ' en ' + tierLabel(activeTier)}`}
          hint="Sé el primero en compartir tu equipo con el clan."
          icon={Swords}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((b, i) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActive(b)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActive(b)
                }
              }}
              className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-edge bg-elevated text-left transition hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-card"
            >
              {b.image_url ? (
                <div
                  className="relative h-32 w-full bg-cover bg-center transition group-hover:scale-[1.03]"
                  style={{ backgroundImage: `url(${b.image_url})` }}
                />
              ) : (
                <div className="flex h-32 w-full items-center justify-center gap-2 bg-gradient-to-br from-primary/10 to-secondary/10 text-soft">
                  <Swords size={22} className="text-secondary" />
                  <span className="text-sm font-bold">{tierLabel(b.tier)}</span>
                </div>
              )}

              <div className="flex flex-1 flex-col p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] font-bold text-secondary">
                    {tierLabel(b.tier)}
                  </span>
                  {canModerate(b) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        remove(b)
                      }}
                      className="rounded-lg p-1 text-[11px] font-semibold text-soft transition hover:text-primary"
                    >
                      Eliminar
                    </button>
                  )}
                </div>

                <h3 className="mt-2 line-clamp-2 font-display text-base font-extrabold text-text">
                  {b.creator_name || 'Build sin nombre'}
                </h3>

                <div className="mt-2 flex items-center gap-2">
                  <ProfileAvatar
                    userId={b.author_id}
                    name={b.author?.username}
                    src={b.author?.avatar_url}
                    className="h-6 w-6 text-[10px]"
                  />
                  <span className="truncate text-xs font-semibold text-soft">
                    {b.author?.username ?? 'Miembro'}
                  </span>
                  <span className="ml-auto shrink-0 text-[11px] text-soft">
                    {formatShortDate(b.created_at)}
                  </span>
                </div>

                <div className="mt-3 border-t border-edge pt-3">
                  <PostActions
                    parentType="build"
                    parentId={b.id}
                    shareRoute="/builds"
                    shareParam="build"
                    shareText={`Build ${tierLabel(b.tier)}: ${b.creator_name}`}
                  />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Formulario de publicación */}
      <Modal
        open={publishing}
        onClose={() => setPublishing(false)}
        title="Publicar build"
        maxWidth="max-w-xl"
      >
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Nombre del creador o quien la comparte</label>
            <input
              type="text"
              className="input"
              maxLength={60}
              placeholder="Tu IGN o el del autor de la build"
              value={form.creator_name}
              onChange={(e) => setForm((f) => ({ ...f, creator_name: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Tier</label>
            <select
              className="input"
              value={form.tier}
              onChange={(e) => setForm((f) => ({ ...f, tier: e.target.value }))}
            >
              {TIERS.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Enlace / Link del paste (opcional)</label>
            <input
              type="url"
              className="input"
              placeholder="https://pokepast.es/..."
              value={form.paste_url}
              onChange={(e) => setForm((f) => ({ ...f, paste_url: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Imagen de la build (si es imagen en vez de enlace)</label>
            <ImageInput
              value={form.image_url}
              onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
              folder={`builds/${user?.id}`}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              <ImagePlus size={17} />
              {saving ? 'Publicando…' : 'Guardar build'}
            </button>
            <button type="button" onClick={() => setPublishing(false)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Build abierta */}
      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? `${tierLabel(active.tier)} · ${active.creator_name}` : ''}
        maxWidth="max-w-2xl"
      >
        {active && (
          <>
            {active.image_url && (
              <img
                src={active.image_url}
                alt={active.creator_name}
                className="mb-4 w-full rounded-xl border border-edge object-contain"
              />
            )}

            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ProfileAvatar
                  userId={active.author_id}
                  name={active.author?.username}
                  src={active.author?.avatar_url}
                />
                <div>
                  <p className="text-sm font-bold text-text">
                    {active.author?.username ?? 'Miembro'}
                  </p>
                  <p className="text-[11px] text-soft">
                    Publicado el {formatShortDate(active.created_at)}
                  </p>
                </div>
              </div>
              {canModerate(active) && (
                <button
                  onClick={() => remove(active)}
                  className="rounded-xl border border-edge px-3 py-1.5 text-xs font-semibold text-soft transition hover:border-primary hover:text-primary"
                >
                  Eliminar
                </button>
              )}
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-3">
              <span className="inline-flex rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-bold text-secondary">
                {tierLabel(active.tier)}
              </span>
              {active.paste_url && (
                <a
                  href={active.paste_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary transition hover:bg-secondary hover:text-white"
                >
                  <ExternalLink size={15} />
                  Ver el paste
                </a>
              )}
            </div>

            <div className="mb-4 border-t border-edge pt-3">
              <PostActions
                parentType="build"
                parentId={active.id}
                shareRoute="/builds"
                shareParam="build"
                shareText={`Build ${tierLabel(active.tier)}: ${active.creator_name}`}
              />
            </div>

            <CommentSection parentType="build" parentId={active.id} />
          </>
        )}
      </Modal>
    </div>
  )
}
