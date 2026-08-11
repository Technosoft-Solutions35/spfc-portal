import { useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { formatShortDate } from '../../lib/utils'
import { useToast } from '../ui/Toast'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'
import ImageInput from '../ui/ImageInput'
import DocumentsInput from '../ui/DocumentsInput'

const FIELD = {
  text: (f, v, set) => (
    <input type="text" className="input" placeholder={f.placeholder} value={v || ''} onChange={(e) => set({ [f.key]: e.target.value })} />
  ),
  textarea: (f, v, set) => (
    <textarea className="input min-h-[120px]" placeholder={f.placeholder} value={v || ''} onChange={(e) => set({ [f.key]: e.target.value })} />
  ),
  date: (f, v, set) => (
    <input type="datetime-local" className="input" value={v || ''} onChange={(e) => set({ [f.key]: e.target.value })} />
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
  image: (f, v, set) => (
    <ImageInput value={v || ''} onChange={(url) => set({ [f.key]: url })} />
  ),
  documents: (f, v, set) => (
    <DocumentsInput value={v || []} onChange={(docs) => set({ [f.key]: docs })} />
  ),
}

function Field({ f, value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch })
  return (
    <div>
      <label className="label">{f.label}</label>
      {FIELD[f.type](f, value?.[f.key], set)}
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
  fields,
  columns = ['title'],
  emptyHint,
  useCrudResult,
}) {
  const { items, loading, create, update, remove } = useCrudResult
  const { toast } = useToast()
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})

  const openNew = () => {
    setEditing(null)
    setForm({})
    setModal(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    // Conversión de fechas ISO a datetime-local para el input
    const prepared = { ...item }
    for (const f of fields) {
      if (f.type === 'date' && prepared[f.key]) {
        prepared[f.key] = new Date(prepared[f.key])
          .toISOString()
          .slice(0, 16)
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
  }

  const confirmDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item[columns[0]]}"? Esta acción no se puede deshacer.`)) return
    const { error } = await remove(item.id)
    if (error) {
      toast('Error al eliminar', 'error')
      return
    }
    toast('Eliminado', 'info')
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
    </div>
  )
}

// Re-exporta el ImageInput para los formularios personalizados
export { ImageInput }
