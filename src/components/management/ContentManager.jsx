import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { formatShortDate } from '../../lib/utils'
import { useToast } from '../ui/Toast'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'
import ImageInput from '../ui/ImageInput'
import DocumentsInput from '../ui/DocumentsInput'
import DeletionPasswordModal from '../ui/DeletionPasswordModal'
import { publishContentCreated } from '../../lib/notifications'
import { sendPushNotification } from '../../lib/push'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const FIELD = {
  text: (f, v, set) => (
    <input type="text" className="input" placeholder={f.placeholder} value={v || ''} onChange={(e) => set({ [f.key]: e.target.value })} />
  ),
  number: (f, v, set) => (
    <input
      type="number"
      className="input"
      placeholder={f.placeholder}
      value={v ?? ''}
      onChange={(e) => set({ [f.key]: e.target.value === '' ? null : Number(e.target.value) })}
    />
  ),
  textarea: (f, v, set) => (
    <textarea className="input min-h-[120px]" placeholder={f.placeholder} value={v || ''} onChange={(e) => set({ [f.key]: e.target.value })} />
  ),
  date: (f, v, set) => (
    <input type="datetime-local" className="input" value={v || ''} onChange={(e) => set({ [f.key]: e.target.value })} />
  ),
  url: (f, v, set) => (
    <input
      type="url"
      className="input"
      placeholder={f.placeholder || 'https://...'}
      value={v || ''}
      onChange={(e) => set({ [f.key]: e.target.value })}
    />
  ),
  select: (f, v, set) => (
    <select className="input" value={v || f.default || ''} onChange={(e) => set({ [f.key]: e.target.value })}>
      {f.options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  ),
  tags: (f, v, set) => (
    <input
      type="text"
      className="input"
      placeholder="separadas por comas: OU, Shiny, Buildeo"
      value={(v || []).join(', ')}
      onChange={(e) => set({ [f.key]: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) })}
    />
  ),
  categories: (f, v, set) => (
    <div className="flex flex-wrap gap-2">
      {f.options.map((opt) => {
        const active = (v || []).includes(opt)
        return (
          <button
            key={opt}
            type="button"
            onClick={() =>
              set({
                [f.key]: active
                  ? (v || []).filter((c) => c !== opt)
                  : [...(v || []), opt],
              })
            }
            className={`rounded-full border px-4 py-2 text-base font-semibold transition ${
              active
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-edge text-soft hover:border-primary/40 hover:text-text'
            }`}
          >
            {active ? '✓ ' : ''}{opt}
          </button>
        )
      })}
    </div>
  ),
  image: (f, v, set) => (
    <ImageInput value={v || ''} onChange={(url) => set({ [f.key]: url })} allowUrl={f.allowUrl !== false} />
  ),
  documents: (f, v, set) => (
    <DocumentsInput value={v || []} onChange={(docs) => set({ [f.key]: docs })} />
  ),
  'dependent-select': (f, v, set, allValues) => {
    const parentVal = allValues?.[f.parentKey] || ''
    const options = parentVal ? (f.optionsByParent?.[parentVal] || []) : []
    return (
      <select
        className="input"
        value={v || ''}
        onChange={(e) => set({ [f.key]: e.target.value })}
        disabled={!parentVal}
      >
        <option value="">{parentVal ? 'Seleccionar...' : f.parentPlaceholder || 'Primero elige el tipo'}</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    )
  },
  'dynamic-prizes': (f, v, set, allValues) => {
    const count = allValues?.[f.countKey] || 0
    const prizes = v || []
    const setCount = (n) => {
      const newPrizes = Array.from({ length: n }, (_, i) => prizes[i] || { position: i + 1, prize: '' })
      set({ [f.countKey]: n, [f.key]: newPrizes })
    }
    const updatePrize = (idx, val) => {
      const newPrizes = [...prizes]
      newPrizes[idx] = { ...newPrizes[idx], prize: val }
      set({ [f.key]: newPrizes })
    }
    return (
      <div className="space-y-3">
        <div>
          <label className="label">Cantidad de premios</label>
          <input
            type="number"
            className="input"
            min={0}
            max={10}
            value={count}
            onChange={(e) => setCount(Math.max(0, Math.min(10, Number(e.target.value))))}
          />
        </div>
        {count > 0 && (
          <div className="space-y-2">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ${
                  i === 0 ? 'bg-secondary' : i === 1 ? 'bg-soft' : 'bg-edge text-text'
                }`}>
                  {i + 1}
                </span>
                <input
                  type="text"
                  className="input flex-1"
                  placeholder={`Premio lugar ${i + 1}`}
                  value={prizes[i]?.prize || ''}
                  onChange={(e) => updatePrize(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  },
  'multi-image': (f, v, set) => {
    const images = v || []
    const addImage = (url) => {
      if (url && !images.includes(url)) {
        set({ [f.key]: [...images, url] })
      }
    }
    const removeImage = (idx) => {
      set({ [f.key]: images.filter((_, i) => i !== idx) })
    }
    return (
      <div className="space-y-3">
        <ImageInput value="" onChange={addImage} allowUrl={f.allowUrl !== false} />
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((url, idx) => (
              <div key={idx} className="group relative h-16 w-16 overflow-hidden rounded-lg border border-edge">
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white opacity-0 transition group-hover:opacity-100"
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  },
}

function Field({ f, value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch })
  const renderFn = FIELD[f.type]
  if (!renderFn) return null
  // Los field types que necesitan todos los valores del form reciben allValues
  if (['dependent-select', 'dynamic-prizes'].includes(f.type)) {
    return (
      <div>
        <label className="label">{f.label}</label>
        {renderFn(f, value?.[f.key], set, value)}
      </div>
    )
  }
  return (
    <div>
      <label className="label">{f.label}</label>
      {renderFn(f, value?.[f.key], set)}
    </div>
  )
}

/**
 * Gestor de contenido genérico: lista + formulario modal + borrado.
 * `fields` define el formulario; `listLabel` la columna mostrada en la lista.
 */
export default function ContentManager({
  title,
  subtitle,
  type,
  fields,
  columns = ['title'],
  emptyHint,
  useCrudResult,
}) {
  const { items, loading, create, update, remove } = useCrudResult
  const { toast } = useToast()
  const { profile: currentUser } = useAuth()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [deletePending, setDeletePending] = useState(null) // item awaiting password
  const [deletePwdOpen, setDeletePwdOpen] = useState(false)

  const openNew = () => {
    setEditing(null)
    setForm({})
    setModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    // Conversión de fechas ISO a datetime-local para el input.
    // Se usa el componente local (getHours/getMinutes...) para que el
    // calendario muestre la misma hora local que se guardó.
    const prepared = { ...item }
    for (const f of fields) {
      if (f.type === 'date' && prepared[f.key]) {
        const d = new Date(prepared[f.key])
        const pad = (n) => String(n).padStart(2, '0')
        prepared[f.key] =
          `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
          `T${pad(d.getHours())}:${pad(d.getMinutes())}`
      }
    }
    setForm(prepared)
    setModal(true)
  }

  const save = async (e) => {
    e.preventDefault()
    const payload = { ...form }
    for (const f of fields) {
      if (f.type === 'date' && payload[f.key]) {
        payload[f.key] = new Date(payload[f.key]).toISOString()
      }
    }
    // Quita campos vacíos no esenciales para no pisar valores previos
    const result = editing
      ? await update(editing.id, payload)
      : await create(payload)
    if (result.error) {
      toast('Error al guardar: ' + result.error.message, 'error')
      return
    }
    toast(editing ? 'Contenido actualizado' : 'Contenido creado', 'success')
    setModal(false)
    // Avisa en tiempo real a todos los conectados (broadcast por Realtime)
    if (!editing && type) {
      publishContentCreated({ type, title: payload[columns[0]] || title })
      // Además envía notificación push a todos los suscritos (web cerrada incluida)
      const push = await sendPushNotification({
        type,
        title: payload[columns[0]] || title,
        username: currentUser?.username,
      })
      if (push.ok) {
        const total = push.results?.total ?? 0
        const sent = push.results?.sent ?? 0
        const failed = push.results?.failed ?? 0
        if (sent > 0) {
          toast(
            `🔔 Notificación enviada a ${sent} ${sent === 1 ? 'dispositivo' : 'dispositivos'}` +
              (failed > 0 ? ` (${failed} fallaron)` : ''),
            'success',
            5000,
          )
        } else if (failed > 0) {
          const err = push.results?.errors?.[0] || 'desconocido'
          toast(`🔔 Aviso publicado, pero el push falló (${total} leídas, ${failed} fallaron). Error: ${err}`, 'error', 8000)
        } else {
          toast(`🔔 Aviso publicado. ${total} ${total === 1 ? 'suscriptor' : 'suscriptores'} en la base.`, 'success', 5000)
        }
      } else {
        toast(`⚠️ Aviso publicado, pero el push falló (${push.reason || `HTTP ${push.status}`})`, 'error', 8000)
      }
    }
  }

  const confirmDelete = (item) => {
    setDeletePending(item)
    setDeletePwdOpen(true)
  }

  const handleDeleteWithPassword = async (password) => {
    const { data, error } = await supabase.rpc('verify_deletion_password', { p_password: password })
    if (error) throw new Error('Error al verificar contraseña')
    if (!data) throw new Error('Contraseña incorrecta')

    const { error: delError } = await remove(deletePending.id)
    if (delError) {
      toast('Error al eliminar', 'error')
      return
    }
    toast('Eliminado', 'info')
    setDeletePwdOpen(false)
    setDeletePending(null)
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-extrabold text-text">{title}</h3>
          {subtitle && <p className="text-sm text-soft">{subtitle}</p>}
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus size={17} />
          Nuevo
        </button>
      </div>

      {loading ? (
        <Spinner label="Cargando..." />
      ) : !items || items.length === 0 ? (
        <EmptyState title="Sin registros" hint={emptyHint} />
      ) : (
        <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 px-4 py-3 transition hover:bg-background">
              {item.image_url && (
                <img src={item.image_url} alt="" className="h-10 w-10 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-text">{item[columns[0]]}</p>
                {columns[1] && <p className="text-xs text-soft">{item[columns[1]]}</p>}
              </div>
              {item.created_at && (
                <span className="hidden text-xs text-soft sm:block">
                  {formatShortDate(item.created_at)}
                </span>
              )}
              <div className="flex gap-1">
                <button
                  onClick={() => openEdit(item)}
                  title="Editar"
                  className="rounded-lg p-2 text-soft transition hover:bg-secondary/10 hover:text-secondary"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => confirmDelete(item)}
                  title="Eliminar"
                  className="rounded-lg p-2 text-soft transition hover:bg-primary/10 hover:text-primary"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar' : 'Nuevo'}>
        <form onSubmit={save} className="space-y-4">
          {fields.map((f) => (
            <Field key={f.key} f={f} value={form} onChange={setForm} />
          ))}
          <div className="flex gap-3 pt-2">
            <button type="submit" className="btn-primary flex-1">
              {editing ? 'Guardar cambios' : 'Crear'}
            </button>
            <button type="button" onClick={() => setModal(false)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <DeletionPasswordModal
        open={deletePwdOpen}
        onClose={() => { setDeletePwdOpen(false); setDeletePending(null) }}
        onConfirm={handleDeleteWithPassword}
      />
    </div>
  )
}

// Re-exporta el ImageInput para los formularios personalizados
export { ImageInput }
