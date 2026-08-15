import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, ClipboardCheck, Eye, Sparkles, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import PageHeader from '../components/ui/PageHeader'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import Modal from '../components/ui/Modal'
import ProfileAvatar from '../components/ui/ProfileAvatar'
import { formatDate, storagePathFromUrl } from '../lib/utils'
import { notifyUser } from '../lib/notifications'

/**
 * DLC 2 — Bandeja de revisión de reportes de shinies (staff).
 * [Ver Reporte] abre el detalle con la evidencia; [Aprobar] suma +1 y añade el
 * shiny al Hall of Fame del autor de forma atómica; [Rechazar] borra el reporte
 * y su foto. En ambos casos se avisa al miembro (Realtime + push).
 */
export default function ReviewShinies() {
  const { toast } = useToast()

  const [reports, setReports] = useState(null)
  const [reviewing, setReviewing] = useState(null) // reporte abierto en el modal
  const [busy, setBusy] = useState(null) // id en proceso
  const [approvingAll, setApprovingAll] = useState(false)
  const [confirmingReject, setConfirmingReject] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  const fetchReports = useCallback(async () => {
    const { data } = await supabase
      .from('shiny_reports')
      .select('*, author_id(username, avatar_url)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setReports(data || [])
  }, [])

  useEffect(() => {
    fetchReports()
    // Refresco en vivo: si otro staff revisa un reporte, la lista se actualiza
    const channel = supabase
      .channel('review-shiny-reports')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shiny_reports', filter: 'status=eq.pending' },
        () => fetchReports()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchReports])

  const openReview = (r) => {
    setRejectNote('')
    setConfirmingReject(false)
    setReviewing(r)
  }

  const closeReview = () => {
    setReviewing(null)
    setConfirmingReject(false)
    setRejectNote('')
  }

  const approve = async (r) => {
    setBusy(r.id)
    const { data, error } = await supabase.rpc('approve_shiny_report', { p_report_id: r.id })
    setBusy(null)
    if (error) {
      toast('No se pudo aprobar: ' + error.message, 'error')
      return
    }
    toast(`+1 shiny aprobado a ${r.author_id?.username || 'el miembro'}`, 'success')
    closeReview()
    fetchReports()
    if (data?.user_id) {
      await notifyUser({
        userId: data.user_id,
        message: `¡Tu reporte de ${data.pokemon} fue APROBADO! (+1 shiny) 🎉`,
        pushPayload: { type: 'reporte', title: 'Shiny aprobado' },
      })
    }
  }

  const reject = async (r) => {
    const reason = rejectNote.trim()
    setBusy(r.id)
    const { data, error } = await supabase.rpc('reject_shiny_report', {
      p_report_id: r.id,
      p_reason: reason,
    })
    setBusy(null)
    if (error) {
      toast('No se pudo desaprobar: ' + error.message, 'error')
      return
    }
    // SQL no permite borrar objetos de Storage (Storage API obligatoria):
    // la foto se elimina aquí con supabase.storage, que respeta las políticas
    // media_staff_delete / media_user_delete_own. Si falla, no bloquea el rechazo.
    const path = storagePathFromUrl(r.image_url)
    if (path) {
      await supabase.storage.from('media').remove([path]).catch(() => {})
    }
    toast(`Reporte de ${r.author_id?.username} rechazado`, 'info')
    closeReview()
    fetchReports()
    if (data?.user_id) {
      await notifyUser({
        userId: data.user_id,
        message:
          `Tu reporte de ${data.pokemon} fue rechazado.` +
          (reason ? ` Motivo: ${reason}` : ''),
        pushPayload: { type: 'reporte', title: 'Shiny rechazado' },
      })
    }
  }

  // Aprueba todos los reportes pendientes de una vez (uno por uno, atómico)
  const approveAll = async () => {
    if (!reports?.length || approvingAll) return
    if (
      !window.confirm(
        `¿Aprobar los ${reports.length} reportes pendientes? Se sumará +1 shiny a cada autor.`
      )
    )
      return
    setApprovingAll(true)
    const approved = []
    for (const r of reports) {
      const { data, error } = await supabase.rpc('approve_shiny_report', {
        p_report_id: r.id,
      })
      if (error) {
        toast('No se pudo aprobar: ' + error.message, 'error')
        break
      }
      if (data) approved.push(data)
    }
    setApprovingAll(false)
    closeReview()
    fetchReports()
    toast(`Se aprobaron ${approved.length} reportes (+1 shiny cada autor)`, 'success')
    // Avisa a cada autor cuyo reporte se aprobó
    for (const d of approved) {
      if (d?.user_id) {
        await notifyUser({
          userId: d.user_id,
          message: `¡Tu reporte de ${d.pokemon} fue APROBADO! (+1 shiny) 🎉`,
          pushPayload: { type: 'reporte', title: 'Shiny aprobado' },
        })
      }
    }
  }

  return (
    <div>
      <PageHeader
        title="Revisar Shinies"
        subtitle="Reportes de captura del clan pendientes de validación."
        icon={ClipboardCheck}
      />

      {reports && reports.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-soft">
            <strong className="font-bold text-text">{reports.length}</strong> reporte
            {reports.length !== 1 ? 's' : ''} pendiente{reports.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={approveAll}
            disabled={approvingAll}
            className="btn-primary"
          >
            <CheckCircle2 size={17} />
            {approvingAll ? 'Aprobando...' : 'Aprobar todos'}
          </button>
        </div>
      )}

      {!reports ? (
        <Spinner label="Cargando reportes..." />
      ) : reports.length === 0 ? (
        <EmptyState
          title="Sin reportes pendientes"
          hint="Cuando los miembros envíen capturas aparecerán aquí para aprobarlas o rechazarlas."
          icon={ClipboardCheck}
        />
      ) : (
        <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge">
          {reports.map((r) => (
            <motion.li
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5 px-3 py-3 transition hover:bg-background sm:gap-3 sm:px-4"
            >
              <img
                src={r.image_url}
                alt={r.pokemon_name}
                className="h-14 w-14 shrink-0 rounded-xl border border-edge object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="flex min-w-0 items-center gap-2 font-display font-bold text-text">
                  <Sparkles size={14} className="shrink-0 text-secondary" />
                  <span className="truncate">{r.pokemon_name}</span>
                </p>
                <p className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-soft">
                  <ProfileAvatar userId={r.author_id} name={r.author_id?.username} src={r.author_id?.avatar_url} size="sm" />
                  <span className="truncate">
                    {r.author_id?.username} · {formatDate(r.created_at)}
                  </span>
                </p>
              </div>
              <button
                onClick={() => openReview(r)}
                className="btn-ghost shrink-0 whitespace-nowrap !px-3 !py-2 text-xs sm:!px-5 sm:!py-2.5 sm:text-sm"
              >
                <Eye size={16} />
                Ver reporte
              </button>
            </motion.li>
          ))}
        </ul>
      )}

      {/* Detalle de revisión */}
      <Modal
        open={!!reviewing}
        onClose={closeReview}
        title={reviewing?.pokemon_name || 'Reporte'}
        maxWidth="max-w-xl"
      >
        {reviewing && (
          <div>
            <img
              src={reviewing.image_url}
              alt={reviewing.pokemon_name}
              className="mb-4 w-full rounded-xl border border-edge object-cover"
            />
            <div className="mb-4 space-y-1 rounded-xl bg-background p-4 text-sm">
              <p className="flex items-center gap-2 font-bold text-text">
                <ProfileAvatar userId={reviewing.author_id} name={reviewing.author_id?.username} src={reviewing.author_id?.avatar_url} size="sm" />
                {reviewing.author_id?.username}
              </p>
              <p className="text-xs text-soft">
                Enviado el {formatDate(reviewing.created_at)}
              </p>
              {reviewing.notes && (
                <p className="whitespace-pre-wrap pt-2 text-soft">{reviewing.notes}</p>
              )}
            </div>

            {!confirmingReject ? (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => approve(reviewing)}
                  disabled={busy === reviewing.id}
                  className="btn-primary flex-1"
                >
                  <CheckCircle2 size={17} />
                  {busy === reviewing.id ? 'Procesando...' : 'Aprobar (+1 shiny)'}
                </button>
                <button
                  onClick={() => setConfirmingReject(true)}
                  disabled={busy === reviewing.id}
                  className="btn-ghost flex-1 text-primary hover:border-primary/40 hover:bg-primary/10"
                >
                  <XCircle size={17} />
                  Desaprobar
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="label">Motivo de la desaprobación</label>
                  <textarea
                    className="input min-h-[90px]"
                    placeholder="Escribe el motivo (ej: la foto no es un shiny). Se lo notificaremos al miembro."
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => reject(reviewing)}
                    disabled={busy === reviewing.id}
                    className="btn-primary flex-1"
                  >
                    <XCircle size={17} />
                    {busy === reviewing.id ? 'Desaprobando...' : 'Confirmar desaprobación'}
                  </button>
                  <button
                    onClick={() => setConfirmingReject(false)}
                    disabled={busy === reviewing.id}
                    className="btn-ghost"
                  >
                    Volver
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
