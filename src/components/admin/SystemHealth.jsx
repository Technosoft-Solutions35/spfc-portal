import { useEffect, useState } from 'react'
import { CheckCircle2, Database, HardDrive, RefreshCw, Server, XCircle } from 'lucide-react'
import { supabase, supabaseUrl } from '../../lib/supabase'
import Spinner from '../ui/Spinner'

export default function SystemHealth() {
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)

  async function checkHealth() {
    setLoading(true)
    const results = {}

    // 1. Supabase connection
    try {
      const start = Date.now()
      const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' })
      results.database = { ok: !error, latency: Date.now() - start, error: error?.message }
    } catch (e) {
      results.database = { ok: false, latency: 0, error: e.message }
    }

    // 2. Storage check
    try {
      const start = Date.now()
      const { data, error } = await supabase.storage.listBuckets()
      results.storage = {
        ok: !error,
        latency: Date.now() - start,
        buckets: (data || []).length,
        error: error?.message,
      }
    } catch (e) {
      results.storage = { ok: false, latency: 0, error: e.message }
    }

    // 3. Edge Functions
    try {
      const start = Date.now()
      const { error } = await supabase.functions.invoke('send-push', { body: { health_check: true } })
      results.edgeFunctions = { ok: !error, latency: Date.now() - start, error: error?.message }
    } catch (e) {
      results.edgeFunctions = { ok: false, latency: 0, error: e.message }
    }

    // 4. SW version from meta
    results.swVersion = document.querySelector('meta[name="sw-version"]')?.content || 'unknown'

    // 5. DB size estimate (count rows in key tables)
    const tables = ['profiles', 'news', 'events', 'guides', 'shinies', 'pvp_rankings', 'audit_log', 'integrations']
    const rowCounts = {}
    for (const t of tables) {
      const { count } = await supabase.from(t).select('*', { count: 'exact', head: true })
      rowCounts[t] = count || 0
    }
    results.rowCounts = rowCounts

    setHealth(results)
    setLoading(false)
  }

  useEffect(() => { checkHealth() }, [])

  if (loading) return <Spinner label="Verificando salud del sistema..." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-display text-lg font-extrabold text-text">
            <HardDrive size={20} className="text-primary" /> Salud del Sistema
          </h3>
          <p className="text-sm text-soft">Estado de los servicios conectados al portal.</p>
        </div>
        <button onClick={checkHealth} className="btn-secondary">
          <RefreshCw size={16} /> Verificar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <HealthCard
          title="Base de Datos"
          icon={Database}
          ok={health?.database?.ok}
          latency={health?.database?.latency}
          error={health?.database?.error}
        />
        <HealthCard
          title="Storage"
          icon={HardDrive}
          ok={health?.storage?.ok}
          latency={health?.storage?.latency}
          extra={health?.storage?.buckets ? `${health.storage.buckets} buckets` : null}
          error={health?.storage?.error}
        />
        <HealthCard
          title="Edge Functions"
          icon={Server}
          ok={health?.edgeFunctions?.ok}
          latency={health?.edgeFunctions?.latency}
          error={health?.edgeFunctions?.error}
        />
        <div className="rounded-2xl border border-edge bg-elevated p-5">
          <div className="flex items-center gap-3">
            <span className="rounded-xl bg-info/15 p-2.5 text-info">
              <Server size={22} />
            </span>
            <div>
              <h4 className="font-bold text-text">Service Worker</h4>
              <p className="text-xs text-soft">Versión: <code className="rounded bg-surface px-1.5 py-0.5 text-primary">{health?.swVersion}</code></p>
            </div>
          </div>
        </div>
      </div>

      {health?.rowCounts && (
        <div className="rounded-2xl border border-edge bg-elevated p-5">
          <h4 className="mb-3 font-display font-bold text-text">Filas en Tablas Clave</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(health.rowCounts).map(([table, count]) => (
              <div key={table} className="flex items-center justify-between rounded-xl bg-surface px-4 py-2.5">
                <span className="text-sm text-soft">{table}</span>
                <span className="font-bold text-text">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HealthCard({ title, icon: Icon, ok, latency, extra, error }) {
  return (
    <div className="rounded-2xl border border-edge bg-elevated p-5">
      <div className="flex items-center gap-3">
        <span className={`rounded-xl p-2.5 ${ok ? 'bg-success/15 text-success' : 'bg-primary/15 text-primary'}`}>
          <Icon size={22} />
        </span>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-text">{title}</h4>
            {ok ? (
              <CheckCircle2 size={16} className="text-success" />
            ) : (
              <XCircle size={16} className="text-primary" />
            )}
          </div>
          <p className="text-xs text-soft">
            {latency !== undefined && `Latencia: ${latency}ms`}
            {extra && ` · ${extra}`}
          </p>
          {error && <p className="mt-1 text-xs text-primary">{error}</p>}
        </div>
      </div>
    </div>
  )
}
