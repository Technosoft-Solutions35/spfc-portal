import { useEffect, useState, useCallback } from 'react'
import { Ban, Clock, ShieldOff, ShieldCheck, Trash2, UserX } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'
import Modal from '../ui/Modal'
import ProfileAvatar from '../ui/ProfileAvatar'

const DURATION_PRESETS = [
  { label: '5 min', hours: 5 / 60 },
  { label: '1 hora', hours: 1 },
  { label: '6 horas', hours: 6 },
  { label: '1 día', hours: 24 },
  { label: '3 días', hours: 72 },
  { label: '7 días', hours: 168 },
  { label: '14 días', hours: 336 },
  { label: '30 días', hours: 720 },
]

function Countdown({ expiresAt }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    if (!expiresAt) { setRemaining(''); return }
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) { setRemaining('Expirado'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      const parts = []
      if (d > 0) parts.push(`${d}d`)
      if (h > 0) parts.push(`${h}h`)
      if (m > 0) parts.push(`${m}m`)
      parts.push(`${s}s`)
      setRemaining(parts.join(' '))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  return <span className="font-mono text-xs text-secondary">{remaining}</span>
}

export default function BanManager() {
  const { toast } = useToast()
  const [bans, setBans] = useState(null)
  const [members, setMembers] = useState([])
  const [modal, setModal] = useState(null) // 'ban' | 'permaban'
  const [selectedUserId, setSelectedUserId] = useState('')
  const [reason, setReason] = useState('')
  const [durationHours, setDurationHours] = useState(24)
  const [busy, setBusy] = useState(false)

  const loadBans = useCallback(async () => {
    const { data, error } = await supabase.rpc('get_active_bans')
    if (!error) setBans(data || [])
  }, [])

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, role, avatar_url')
      .order('username')
    setMembers(data || [])
  }, [])

  useEffect(() => {
    loadBans()
    loadMembers()
  }, [loadBans, loadMembers])

  const openBanModal = (type) => {
    setSelectedUserId('')
    setReason('')
    setDurationHours(24)
    setModal(type)
  }

  const handleBan = async (e) => {
    e.preventDefault()
    if (!selectedUserId) { toast('Selecciona un usuario', 'error'); return }
    setBusy(true)
    const params = {
      p_user_id: selectedUserId,
      p_ban_type: modal === 'permaban' ? 'perm' : 'temp',
      p_reason: reason.trim() || null,
      p_duration_hours: modal === 'permaban' ? null : durationHours,
    }
    const { data, error } = await supabase.rpc('ban_user', params)
    setBusy(false)
    if (error) { toast('Error: ' + error.message, 'error'); return }
    toast(
      modal === 'permaban'
        ? 'Usuario baneado permanentemente'
        : `Usuario baneado por ${durationHours} horas`,
      'success',
    )
    setModal(null)
    loadBans()
  }

  const handleUnban = async (userId) => {
    setBusy(true)
    const { error } = await supabase.rpc('unban_user', { p_user_id: userId })
    setBusy(false)
    if (error) { toast('Error: ' + error.message, 'error'); return }
    toast('Baneo removido', 'success')
    loadBans()
  }

  const getMember = (userId) => members.find((m) => m.id === userId)

  if (!bans) return <Spinner label="Cargando baneos..." />

  const permBans = bans.filter((b) => b.ban_type === 'perm')
  const tempBans = bans.filter((b) => b.ban_type === 'temp')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
            <Ban size={20} className="text-primary" /> Sistema de Baneos
          </h3>
          <p className="text-sm text-soft">
            Banea cuentas temporal o permanentemente. Los usuarios baneados no pueden acceder al portal.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openBanModal('ban')} className="btn-primary">
            <Clock size={17} /> Ban Temporal
          </button>
          <button onClick={() => openBanModal('permaban')} className="rounded-xl bg-primary/15 px-4 py-2.5 text-sm font-bold text-primary transition hover:bg-primary/25">
            <UserX size={17} className="inline mr-1" /> Permaban
          </button>
        </div>
      </div>

      {/* Temporary bans */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-text">
          <Clock size={16} className="text-secondary" /> Baneos Temporales ({tempBans.length})
        </h4>
        {tempBans.length === 0 ? (
          <EmptyState title="Sin baneos temporales" hint="No hay usuarios baneados temporalmente." />
        ) : (
          <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge">
            {tempBans.map((ban) => {
              const member = getMember(ban.user_id)
              return (
                <li key={ban.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <ProfileAvatar userId={ban.user_id} name={member?.username || '?'} src={member?.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text">{member?.username || 'Desconocido'}</p>
                    {ban.reason && <p className="text-xs text-soft truncate">{ban.reason}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    {ban.expires_at && <Countdown expiresAt={ban.expires_at} />}
                    <button
                      onClick={() => handleUnban(ban.user_id)}
                      disabled={busy}
                      className="rounded-lg bg-success/15 px-3 py-1.5 text-xs font-bold text-success transition hover:bg-success/25 disabled:opacity-50"
                    >
                      <ShieldCheck size={13} className="inline mr-1" /> Des-banear
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Permanent bans */}
      <div>
        <h4 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-text">
          <ShieldOff size={16} className="text-primary" /> Permanentes ({permBans.length})
        </h4>
        {permBans.length === 0 ? (
          <EmptyState title="Sin permabans" hint="No hay usuarios baneados permanentemente." />
        ) : (
          <ul className="divide-y divide-edge overflow-hidden rounded-2xl border border-edge">
            {permBans.map((ban) => {
              const member = getMember(ban.user_id)
              return (
                <li key={ban.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <ProfileAvatar userId={ban.user_id} name={member?.username || '?'} src={member?.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-text">{member?.username || 'Desconocido'}</p>
                    {ban.reason && <p className="text-xs text-soft truncate">{ban.reason}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">PERMABAN</span>
                    <button
                      onClick={() => handleUnban(ban.user_id)}
                      disabled={busy}
                      className="rounded-lg bg-success/15 px-3 py-1.5 text-xs font-bold text-success transition hover:bg-success/25 disabled:opacity-50"
                    >
                      <ShieldCheck size={13} className="inline mr-1" /> Des-permabanear
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Ban modal */}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'permaban' ? 'Permabanear usuario' : 'Banear usuario temporalmente'}>
        <form onSubmit={handleBan} className="space-y-4">
          <div>
            <label className="label">Seleccionar usuario</label>
            <select
              className="input"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
            >
              <option value="">— Seleccionar —</option>
              {members
                .filter((m) => m.role !== 'super-admin')
                .map((m) => (
                  <option key={m.id} value={m.id}>{m.username} ({m.role})</option>
                ))}
            </select>
          </div>

          <div>
            <label className="label">Razón (opcional)</label>
            <input
              type="text"
              className="input"
              placeholder="Motivo del baneo..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {modal === 'ban' && (
            <div>
              <label className="label">Duración</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {DURATION_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setDurationHours(p.hours)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      durationHours === p.hours
                        ? 'bg-primary text-white'
                        : 'border border-edge bg-elevated text-soft hover:text-text'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <input
                type="number"
                className="input"
                min={0.0167}
                step={0.0167}
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
              />
              <p className="mt-1 text-xs text-soft">Horas (puedes escribir un valor personalizado)</p>
            </div>
          )}

          {modal === 'permaban' && (
            <div className="rounded-xl bg-primary/10 px-4 py-3 text-xs text-primary">
              El usuario será bloqueado permanentemente hasta que un super-admin lo des-banee.
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={busy} className="btn-primary flex-1">
              {busy ? 'Procesando...' : modal === 'permaban' ? 'Permabanear' : 'Banear'}
            </button>
            <button type="button" onClick={() => setModal(null)} className="btn-ghost">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
