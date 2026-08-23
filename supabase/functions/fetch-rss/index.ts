// ═══════════════════════════════════════════════════════════════════════════
// Edge Function: fetch-rss
// Proxy CORS que obtiene el RSS del foro de PokeMMO, lo parsea y devuelve
// JSON limpio para el frontend.
//
// Soporta múltiples feeds: pasá ?feed=announcements|general|suggestions|bug-reports
// o ?url=<url-personalizada>. Sin parámetros usa announcements por defecto.
//
// No requiere autenticación — es información pública del foro.
// ─────────────────────────────────────────────────────────────────────────────
const FEEDS = {
  announcements: 'https://forums.pokemmo.com/index.php?/rss/1-updates-announcements.xml/',
  general: 'https://forums.pokemmo.com/index.php?/forum/7-general-discussion.xml/',
  suggestions: 'https://forums.pokemmo.com/index.php?/forum/18-suggestion-box.xml/',
}
const DEFAULT_FEED = 'announcements'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}

/** Extrae texto plano de un tag XML, quitando CDATA si existe. */
function textOf(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, 's')
  const m = xml.match(re)
  return m ? m[1].trim() : ''
}

/** Extrae el atributo url de un tag <enclosure .../>. */
function enclosureUrl(xml) {
  const m = xml.match(/<enclosure\s[^>]*url="([^"]+)"/)
  return m ? m[1] : null
}

/** Convierte RFC 822 (pubDate RSS) a ISO string. */
function parseRFC822(str) {
  if (!str) return null
  try {
    return new Date(str).toISOString()
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    // Soportar ?feed=announcements, ?feed=general, ?url=custom
    const url = new URL(req.url)
    let rssUrl = FEEDS[DEFAULT_FEED]
    const feedParam = url.searchParams.get('feed')
    const customUrl = url.searchParams.get('url')
    if (customUrl) {
      rssUrl = customUrl
    } else if (feedParam && FEEDS[feedParam]) {
      rssUrl = FEEDS[feedParam]
    }

    const res = await fetch(rssUrl, {
      headers: { 'User-Agent': 'SpFcPortal/1.0 (RSS Reader)' },
      redirect: 'follow',
    })

    if (!res.ok) {
      return json({ error: `Upstream returned ${res.status}` }, 502)
    }

    const xml = await res.text()

    // Divide en items individuales
    const itemChunks = xml.split(/<item>/g).slice(1) // salta lo anterior al primer <item>

    const items = itemChunks.map((chunk) => {
      const title = textOf(chunk, 'title')
      const link = textOf(chunk, 'link')
      const description = textOf(chunk, 'description')
      const pubDate = textOf(chunk, 'pubDate')
      const image = enclosureUrl(chunk)

      return {
        title,
        link,
        description: description || null,
        image,
        pubDate: parseRFC822(pubDate),
      }
    })

    return json({ items })
  } catch (err) {
    return json({ error: 'Error fetching RSS: ' + (err.message || err) }, 500)
  }
})
