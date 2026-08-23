// ═══════════════════════════════════════════════════════════════════════════
// Edge Function: check-forum-rss
// Verifica periódicamente el RSS del foro PokeMMO y envía push notifications
// cuando hay publicaciones nuevas. Ejecutado por pg_cron cada 30 minutos.
//
// También puede ser llamado manualmente desde el panel admin para forzar check.
// ═══════════════════════════════════════════════════════════════════════════
import { createClient } from 'npm:@supabase/supabase-js@2.45.4'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') || ''
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || ''
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:no-reply@spfc.gd'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
}

// ── Feeds RSS del foro PokeMMO ──
// Agregá más feeds aquí para cubrir más secciones del foro.
// Formato: https://forums.pokemmo.com/index.php?/rss/<forum-id>-<slug>.xml/
const RSS_FEEDS = [
  { id: 'announcements', url: 'https://forums.pokemmo.com/index.php?/rss/1-updates-announcements.xml/', label: 'Anuncios' },
  { id: 'general', url: 'https://forums.pokemmo.com/index.php?/rss/2-general-discussion.xml/', label: 'Discusión General' },
  { id: 'suggestions', url: 'https://forums.pokemmo.com/index.php?/rss/3-suggestions.xml/', label: 'Sugerencias' },
  { id: 'bug-reports', url: 'https://forums.pokemmo.com/index.php?/rss/4-bug-reports.xml/', label: 'Bug Reports' },
]

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

// ── RSS Parsing (mismo lógica que fetch-rss) ──
function textOf(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, 's')
  return (xml.match(re)?.[1] ?? '').trim()
}

function enclosureUrl(xml) {
  const m = xml.match(/<enclosure\s[^>]*url="([^"]+)"/)
  return m ? m[1] : null
}

function parseRFC822(str) {
  if (!str) return null
  try { return new Date(str).toISOString() } catch { return null }
}

async function fetchRSS(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'SpFcPortal/1.0 (RSS Checker)' },
      redirect: 'follow',
    })
    if (!res.ok) return []
    const xml = await res.text()
    return xml.split(/<item>/g).slice(1).map((chunk) => ({
      title: textOf(chunk, 'title'),
      link: textOf(chunk, 'link'),
      description: textOf(chunk, 'description') || null,
      image: enclosureUrl(chunk),
      pubDate: parseRFC822(textOf(chunk, 'pubDate')),
    })).filter((item) => item.title && item.link)
  } catch {
    return []
  }
}

// ── Push notifications ──
async function sendPushNotification(serviceClient, { title, body, url, tag }) {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
    console.log('[check-forum-rss] VAPID not configured, skipping push')
    return { total: 0, sent: 0, failed: 0 }
  }
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE)

  const { data: subs, error } = await serviceClient
    .from('push_subscriptions')
    .select('endpoint, keys')

  if (error || !subs?.length) {
    return { total: 0, sent: 0, failed: 0 }
  }

  const payload = JSON.stringify({ title, body, url, tag })
  const results = { total: subs.length, sent: 0, failed: 0 }

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload)
      results.sent++
    } catch (e) {
      results.failed++
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await serviceClient.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
      }
    }
  }))

  return results
}

// ── Site settings helpers ──
async function getSetting(serviceClient, key) {
  const { data } = await serviceClient
    .from('site_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()
  return data?.value ?? null
}

async function setSetting(serviceClient, key, value) {
  await serviceClient.from('site_settings').upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // Allow GET (for manual trigger from admin) and POST (from pg_cron)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405)
  }

  // Auth check: service role (from pg_cron) OR staff user (from admin panel)
  const authHeader = req.headers.get('Authorization')
  const isServiceRole = authHeader === `Bearer ${SERVICE_KEY}`

  if (!isServiceRole) {
    if (!authHeader) return json({ error: 'No autorizado' }, 401)
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: user } = await userClient.auth.getUser()
    if (!user?.user) return json({ error: 'Sesión inválida' }, 401)
    const { data: isStaff } = await userClient.rpc('is_staff')
    if (!isStaff) return json({ error: 'Solo staff puede ejecutar esto' }, 403)
  }

  const serviceClient = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    const allResults = []
    let totalNew = 0

    for (const feed of RSS_FEEDS) {
      const items = await fetchRSS(feed.url)
      if (items.length === 0) continue

      const lastSeenKey = `forum_rss_last_${feed.id}`
      const lastSeenLink = await getSetting(serviceClient, lastSeenKey)

      // Detectar items nuevos: todos los que están antes del último visto
      let newItems = []
      if (lastSeenLink) {
        const lastIdx = items.findIndex((i) => i.link === lastSeenLink)
        newItems = lastIdx > 0 ? items.slice(0, lastIdx) : []
      }
      // Si es la primera vez (no hay lastSeen), guardamos sin notificar

      // Actualizar último visto
      await setSetting(serviceClient, lastSeenKey, items[0].link)

      if (newItems.length > 0) {
        totalNew += newItems.length

        // Enviar push por cada item nuevo (máximo 5 para evitar spam)
        const toNotify = newItems.slice(0, 5)
        for (const item of toNotify) {
          const pushResult = await sendPushNotification(serviceClient, {
            title: `Foro PokeMMO · ${feed.label}`,
            body: item.title,
            url: item.link,
            tag: `forum-${feed.id}-${item.link}`,
          })
          console.log(`[check-forum-rss] ${feed.id}: "${item.title}" → ${pushResult.sent}/${pushResult.total} sent`)
        }

        allResults.push({ feed: feed.id, label: feed.label, newItems: newItems.length, items: toNotify.map(i => i.title) })
      }
    }

    // Log to audit
    if (totalNew > 0) {
      await serviceClient.rpc('log_admin_action', {
        p_action: 'forum_rss_check',
        p_table: 'site_settings',
        p_record_id: null,
        p_details: JSON.stringify({ newItems: totalNew, feeds: allResults }),
      })
    }

    return json({
      ok: true,
      checked: RSS_FEEDS.length,
      newItems: totalNew,
      feeds: allResults,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[check-forum-rss] Error:', err)
    return json({ ok: false, error: err.message || String(err) }, 500)
  }
})
