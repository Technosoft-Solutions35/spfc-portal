import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FileText, Handshake, ImagePlus, Pencil, Plus, Trash2 } from 'lucide-react'
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
import DocumentsInput from '../components/ui/DocumentsInput'
import ProfileAvatar from '../components/ui/ProfileAvatar'
import { readDeepLink } from '../lib/share'
import { formatShortDate } from '../lib/utils'

/**
 * DLC 10 — Comercio del clan.
 * Ofertas entre miembros: venta, entrenamiento, crianza, compra u otros.
 * Dos pestañas:
 *   · Ofertas: todas las publicadas, con like/compartir/comentarios.
 *   · Mis Ofertas: crear, editar o borrar las propias, en tiempo real.
 * Solo admin/super-admin pueden borrar ofertas ajenas (los gestores NO).
 */

const SERVICES = [
  { slug: 'venta', label: 'Venta' },
  { slug: 'entrenamiento', label: 'Entrenamiento' },
  { slug: 'crianza', label: 'Crianza' },
  { slug: 'compra', label: 'Compra' },
  { slug: 'otro', label: 'Otro' },
]

const serviceLabel = (slug) => SERVICES.find((s) => s.slug === slug)?.label ?? slug

const EMPTY_FORM = { service_type: 'venta', provider_name: '', description: '', image_url: '', documents: [] }

export default function Commerce() {
  const { user, profile } = useAuth()
  const { toast } = useToast()

  const [tab, setTab] = useState('ofertas') // 'ofertas' | 'mias'
  const [trades, setTrades] = useState(null)
  const [activeService, setActiveService] = useState('all')
  const [active, setActive] = useState(null)
  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const deepHandled = useRef(false)

  const load = async () => {
    const { data } = await supabase
      .from('trades')
      .select('*, author:profiles(username, avatar_url, role)')
      .order('created_at', { ascending: false })
    setTrades(data || [])
    // Enlace directo: ?trade=<id> abre esa oferta directamente (solo la primera vez)
    if (!deepHandled.current) {
      deepHandled.current = true
      const dl = readDeepLink()
      if (dl?.param === 'trade') {
        const found = (data || []).find((t) => t.id === dl.id)
        if (found) setActive(found)
      }
    }
  }

  useEffect(() => {
    load()
    // Realtime: ofertas nuevas, editadas o borradas → se actualizan solas
    const channel = supabase
      .channel('commerce-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trades' }, () => load())
      .subscribe()
    return () => supabase.removeChannel(channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = (trades || []).filter(
    (t) => activeService === 'all' || t.service_type === activeService,
  )
  const mine = (trades || []).filter((t) => t.author_id === user?.id)

  const openNew = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM, provider_name: profile?.username || '' })
    setModal(true)
  }

  const openEdit = (t) => {
    setEditingId(t.id)
    setForm({
      service_type: t.service_type,
      provider_name: t.provider_name || '',
      description: t.description || '',
      image_url: t.image_url || '',
      documents: t.documents || [],
    })
    setModal(true)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.provider_name.trim()) {
      toast('Indica quién ofrece el servicio', 'error')
      return
    }
    setSaving(true)
    const payload = {
      author_id: user.id,
      service_type: form.service_type,
      provider_name: form.provider_name.trim(),
      description: form.description.trim(),
      image_url: form.image_url.trim() || null,
      documents: form.documents || [],
    }
    const { error } = editingId
      ? await supabase.from('trades').update(payload).eq('id', editingId)
      : await supabase.from('trades').insert(payload)
    setSaving(false)
    if (error) {
      toast('No se pudo guardar la oferta: ' + error.message, 'error')
      return
    }
    toast(editingId ? 'Oferta actualizada' : 'Oferta publicada', 'success')
    setModal(false)
    load()
  }

  const remove = async (trade) => {
    if (!window.confirm('¿Eliminar esta oferta?')) return
    const { error } = await supabase.from('trades').delete().eq('id', trade.id)
    if (error) {
      toast('No se pudo eliminar la oferta', 'error')
      return
    }
    toast('Oferta eliminada', 'info')
    setActive(null)
    load()
  }

  // Autor siempre; ajenas todo el staff (admin + gestor)
  const canModerate = (trade) =>
    trade.author_id === user?.id ||
    profile?.role === 'admin' ||
    profile?.role === 'super-admin' ||
    profile?.role === 'gestor'

  const cardBody = (t, onClick) => (
    <>
      {t.image_url ? (
        <div
          className="relative h-32 w-full bg-cover bg-center transition group-hover:scale-[1.03]"
          style={{ backgroundImage: `url(${t.image_url})` }}
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center gap-2 bg-gradient-to-br from-secondary/10 to-primary/10 text-soft">
          <Handshake size={22} className="text-primary" />
          <span className="text-sm font-bold">{serviceLabel(t.service_type)}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
            {serviceLabel(t.service_type)}
          </span>
          {canModerate(t) && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                remove(t)
              }}
              className="rounded-lg p-1 text-[11px] font-semibold text-soft transition hover:text-primary"
            >
              Eliminar
            </button>
          )}
        </div>

        <h3 className="mt-2 line-clamp-2 font-display text-base font-extrabold text-text">
          {t.provider_name || 'Oferta sin nombre'}
        </h3>

        <p className="mt-1 line-clamp-2 text-sm text-soft">
          {t.description || 'Sin descripción.'}
        </p>

        <div className="mt-2 flex items-center gap-2">
          <ProfileAvatar
            userId={t.author_id}
            name={t.author?.username}
            src={t.author?.avatar_url}
            className="h-6 w-6 text-[10px]"
          />
          <span className="truncate text-xs font-semibold text-soft">
            {t.author?.username ?? 'Miembro'}
          </span>
          <span className="ml-auto shrink-0 text-[11px] text-soft">
            {formatShortDate(t.created_at)}
          </span>
        </div>

        <div className="mt-3 border-t border-edge pt-3">
          <PostActions
            parentType="trade"
            parentId={t.id}
            shareRoute="/comercio"
            shareParam="trade"
            shareText={`Oferta ${serviceLabel(t.service_type)}: ${t.provider_name}`}
          />
        </div>
      </div>
    </>
  )

  return (
    <div>
      <PageHeader
        title="Comercio del Clan"
        subtitle="Venta, entrenamiento, crianza y compras entre miembros. Publica tu oferta."
        icon={Handshake}
      />

      {/* Pestañas: Ofertas | Mis Ofertas */}
      <div className="mb-5 flex items-center gap-2">
        <button
          onClick={() => setTab('ofertas')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            tab === 'ofertas' ? 'bg-secondary/15 text-secondary' : 'border border-edge text-soft hover:text-text'
          }`}
        >
          Ofertas
        </button>
        <button
          onClick={() => setTab('mias')}
          className={`rounded-full px-4 py-2 text-sm font-bold transition ${
            tab === 'mias' ? 'bg-secondary/15 text-secondary' : 'border border-edge text-soft hover:text-text'
          }`}
        >
          Mis Ofertas
        </button>
        <button
          onClick={openNew}
          className="ml-auto flex items-center gap-1.5 rounded-full bg-secondary px-3.5 py-2 text-sm font-bold text-white transition hover:brightness-110"
        >
          <Plus size={16} />
          Publicar oferta
        </button>
      </div>

      {tab === 'ofertas' && (
        <div className="mb-5 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveService('all')}
            className={`rounded-full px-3.5 py-2 text-sm font-bold transition ${
              activeService === 'all' ? 'bg-primary/15 text-primary' : 'border border-edge text-soft hover:text-text'
            }`}
          >
            Todas
          </button>
          {SERVICES.map((s) => (
            <button
              key={s.slug}
              onClick={() => setActiveService(s.slug)}
              className={`rounded-full px-3.5 py-2 text-sm font-bold transition ${
                activeService === s.slug ? 'bg-primary/15 text-primary' : 'border border-edge text-soft hover:text-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {!trades ? (
        <Spinner label="Cargando ofertas..." />
      ) : tab === 'ofertas' ? (
        filtered.length === 0 ? (
          <EmptyState
            title={`Sin ofertas${activeService === 'all' ? '' : ' de ' + serviceLabel(activeService)}`}
            hint="Publica tu oferta y el clan la verá al instante."
            icon={Handshake}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setActive(t)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    setActive(t)
                  }
                }}
                className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-edge bg-elevated text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
              >
                {cardBody(t)}
              </motion.div>
            ))}
          </div>
        )
      ) : mine.length === 0 ? (
        <EmptyState
          title="Aún no tienes ofertas"
          hint="Crea tu primera oferta: venta, entrenamiento, crianza o compra."
          icon={Handshake}
          actionLabel="Publicar oferta"
          onAction={openNew}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mine.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setActive(t)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setActive(t)
                }
              }}
              className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-edge bg-elevated text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
            >
              {cardBody(t)}
              <div className="flex gap-2 border-t border-edge p-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openEdit(t)
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-edge px-3 py-2 text-xs font-bold text-soft transition hover:border-secondary hover:text-secondary"
                >
                  <Pencil size={14} />
                  Editar
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    remove(t)
                  }}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-edge px-3 py-2 text-xs font-bold text-soft transition hover:border-primary hover:text-primary"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Formulario: nueva / editar */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editingId ? 'Editar oferta' : 'Publicar oferta'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Quién ofrece el servicio</label>
            <input
              type="text"
              className="input"
              maxLength={60}
              placeholder="Tu IGN o el del comerciante"
              value={form.provider_name}
              onChange={(e) => setForm((f) => ({ ...f, provider_name: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Tipo de servicio</label>
            <select
              className="input"
              value={form.service_type}
              onChange={(e) => setForm((f) => ({ ...f, service_type: e.target.value }))}
            >
              {SERVICES.map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Descripción y contacto (opcional)</label>
            <textarea
              className="input min-h-24"
              maxLength={500}
              placeholder="Ej: vendo comps 5x31 adamant, precios y contacto por MD…"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div>
            <label className="label">Imagen de la oferta (opcional)</label>
            <ImageInput
              value={form.image_url}
              onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
              folder={`${user?.id}/trades`}
            />
          </div>

          <div>
            <label className="label">Archivos adjuntos (opcional)</label>
            <DocumentsInput
              value={form.documents}
              onChange={(docs) => setForm((f) => ({ ...f, documents: docs }))}
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              <ImagePlus size={17} />
              {saving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Publicar oferta'}
            </button>
            <button type="button" onClick={() => setModal(false)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      {/* Oferta abierta */}
      <Modal
        open={!!active}
        onClose={() => setActive(null)}
        title={active ? `${serviceLabel(active.service_type)} · ${active.provider_name}` : ''}
        maxWidth="max-w-2xl"
      >
        {active && (
          <>
            {active.image_url && (
              <img
                src={active.image_url}
                alt={active.provider_name}
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

            {active.description && (
              <p className="mb-4 whitespace-pre-wrap rounded-xl border border-edge bg-background p-4 text-sm leading-relaxed text-text">
                {active.description}
              </p>
            )}

            {(active.documents || []).length > 0 && (
              <div className="mb-4 rounded-xl border border-edge bg-background p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-soft">
                  Adjuntos
                </p>
                <ul className="space-y-1.5">
                  {(active.documents || []).map((doc, i) => (
                    <li key={`${doc.name}-${i}`}>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-sm font-semibold text-primary transition hover:underline"
                      >
                        <FileText size={15} />
                        {doc.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mb-4 border-t border-edge pt-3">
              <PostActions
                parentType="trade"
                parentId={active.id}
                shareRoute="/comercio"
                shareParam="trade"
                shareText={`Oferta ${serviceLabel(active.service_type)}: ${active.provider_name}`}
              />
            </div>

            <CommentSection parentType="trade" parentId={active.id} />
          </>
        )}
      </Modal>
    </div>
  )
}
