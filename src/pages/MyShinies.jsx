import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import ImageInput from '../components/ui/ImageInput'
import Modal from '../components/ui/Modal'
import { formatDate, storagePathFromUrl } from '../lib/utils'

const EMPTY_FORM = { pokemon_name: '', image_url: '', notes: '' }

const STATUS_META = {
  pending: { label: 'Pendiente', class: 'bg-secondary/10 text-secondary' },
  approved: { label: 'Aprobado', class: 'bg-success/10 text-success' },
  rejected: { label: 'Rechazado', class: 'bg-primary/10 text-primary' },
}

/**
 * DLC 2 — Mis reportes de shinies.
 * El miembro envía una captura con su pokémon (foto obligatoria), puede editar
 * o cancelar sus reportes pendientes y ve el estado en tiempo real.
 */
export default function MyShinies() {
  const { profile } = useAuth()
  const { toast } = useToast()

  const [reports, setReports] = useState(null)
  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const fetchReports = useCallback(async () => {
    if (!profile?.id) return
    const { data } = await supabase
      .from('shiny_reports')
      .select('*')
      .eq('author_id', profile.id)
      .order('created_at', { ascending: false })
    setReports(data || [])
  }, [profile?.id])

  useEffect(() => {
    fetchReports()
    // En tiempo real: si el staff aprueba/rechaza, la lista se actualiza sola
    const channel = supabase
      .channel('my-shiny-reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shiny_reports', filter: `author_id=eq.${profile?.id}` },
        () => fetchReports()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchReports, profile?.id])

  const openNew = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setModal(true)
  }

  const openEdit = (r) => {
    setEditingId(r.id)
    setForm({ pokemon_name: r.pokemon_name, image_url: r.image_url, notes: r.notes || '' })
    setModal(true)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.pokemon_name.trim() || !form.image_url) {
      toast('Faltan datos: nombre del pokémon y foto de evidencia son obligatorios', 'error')
      return
    }
    setSaving(true)
    const payload = {
      pokemon_name: form.pokemon_name.trim(),
      image_url: form.image_url,
      notes: form.notes.trim(),
    }
    const { error } = editingId
      ? await supabase.from('shiny_reports').update(payload).eq('id', editingId)
      : await supabase.from('shiny_reports').insert({ ...payload, author_id: profile.id })

    setSaving(false)
    if (error) {
      toast('No se pudo guardar: ' + error.message, 'error')
      return
    }
    // Reporte nuevo: avisa al staff (super-admin/admin/gestor) por push para
    // que no tarde en revisar la bandeja. El push abre la página de revisión.
    if (!editingId) {
      const { sendPushNotification } = await import('../lib/push')
      const sender = profile?.username || 'Un miembro'
      await sendPushNotification({
        type: 'reporte',
        title: `${sender} reportó un shiny`,
        message: `${sender} reportó un ${payload.pokemon_name}. ¡Ven a revisarlo!`,
        roles: ['super-admin', 'admin', 'gestor'],
      })
    }
    toast(editingId ? 'Reporte actualizado' : 'Reporte enviado. ¡Suerte!', 'success')
    setModal(false)
    fetchReports()
  }

  const cancelReport = async (r) => {
    if (!window.confirm(`¿Cancelar el reporte de "${r.pokemon_name}"?`)) return
    // Borra la fila (RLS solo permite si está pendiente) y su foto del storage
    const { error } = await supabase.from('shiny_reports').delete().eq('id', r.id)
    if (error) {
      toast('No se pudo cancelar: ' + error.message, 'error')
      return
    }
    const path = storagePathFromUrl(r.image_url)
    if (path) await supabase.storage.from('media').remove([path])
    toast('Reporte cancelado', 'info')
    fetchReports()
  }

  return (
    <div>
      <PageHeader
        title="Mis Shinies"
        subtitle="Reporta tus capturas shiny con su foto de evidencia y sigue su revisión."
        icon={Sparkles}
      />

      <button onClick={openNew} className="btn-primary mb-5">
        <Plus size={17} />
        Nuevo reporte de captura
      </button>

      {!reports ? (
        <Spinner label="Cargando tus reportes..." />
      ) : reports.length === 0 ? (
        <EmptyState
          title="Aún no has reportado shinies"
          hint="Cuando captures un shiny, envíalo con una foto para que el staff lo apruebe."
          icon={Sparkles}
        />
      ) : (
        <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge">
          {reports.map((r) => {
            const meta = STATUS_META[r.status] || STATUS_META.pending
            const pending = r.status === 'pending'
            return (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <img
                  src={r.image_url}
                  alt={r.pokemon_name}
                  className="h-14 w-14 rounded-xl border border-edge object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-text">{r.pokemon_name}</p>
                  <p className="text-xs text-soft">{formatDate(r.created_at)}</p>
                </div>
                <span className={`badge ${meta.class}`}>{meta.label}</span>
                {pending && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEdit(r)}
                      title="Editar reporte"
                      className="rounded-lg p-2 text-soft transition hover:bg-secondary/10 hover:text-secondary"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => cancelReport(r)}
                      title="Cancelar reporte"
                      className="rounded-lg p-2 text-soft transition hover:bg-primary/10 hover:text-primary"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </motion.li>
            )
          })}
        </ul>
      )}

      {/* Formulario de reporte */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editingId ? 'Editar reporte' : 'Nuevo reporte de captura'}
      >
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="label">Nombre del Pokémon shiny *</label>
            <input
              type="text"
              required
              className="input"
              placeholder="Ej: Gyarados"
              value={form.pokemon_name}
              onChange={(e) => setForm({ ...form, pokemon_name: e.target.value })}
            />
          </div>

          <div>
            <label className="label">Foto / captura de evidencia *</label>
            <ImageInput
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
              allowUrl={false}
              folder={`${profile?.id}/shinies`}
            />
            <p className="mt-1 text-[10px] text-soft">
              La foto es obligatoria: el staff la revisará antes de sumar tu shiny.
            </p>
          </div>

          <div>
            <label className="label">Notas o comentarios (opcional)</label>
            <textarea
              className="input min-h-[80px]"
              placeholder="Dónde lo encontraste, cómo lo cazaste, número de encuentros…"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Enviar reporte'}
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
