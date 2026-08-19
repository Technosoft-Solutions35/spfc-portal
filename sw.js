// Service Worker del portal SpFc/Gd.
// Se encarga de RECIBIR las notificaciones push (aunque el navegador esté
// cerrado) y mostrarlas, además de abrir el portal al tocarlas.

self.addEventListener('install', (event) => {
  // Precachea la foto de perfil predeterminada: offline también se muestra.
  event.waitUntil(
    caches.open(CACHE_SHELL).then((cache) => cache.add(new URL('img/default-avatar.png', self.location)))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_ASSETS && k !== CACHE_SHELL).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  )
})

// ── Caché de navegación ──
// Los assets de Vite llevan hash (inmutables) → cache-first: tras la primera
// visita se sirven desde caché sin tocar la red.
// El index.html (navegación) → network-first con fallback a caché: siempre
// contenido fresco, y si se pierde la red se muestra la última versión.
const CACHE_ASSETS = 'spfc-assets-v21'
const CACHE_SHELL = 'spfc-shell-v21'

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Assets con hash: inmutable, cache-first
  if (url.pathname.includes('/assets/') && url.pathname.match(/\.(js|css|woff2?)$/)) {
    event.respondWith(
      caches.open(CACHE_ASSETS).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached
          return fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone())
            return res
          })
        })
      )
    )
    return
  }

  // Foto de perfil predeterminada: cache-first (se precachea al instalar)
  if (url.pathname.endsWith('/img/default-avatar.png')) {
    event.respondWith(
      caches.open(CACHE_SHELL).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached
          return fetch(request).then((res) => {
            if (res.ok) cache.put(request, res.clone())
            return res
          })
        })
      )
    )
    return
  }

  // Navegación (index.html): SIEMPRE de red, nunca caché.
  // Se añade un parámetro con la versión del shell para que el navegador
  // nunca reutilice un index.html obsoleto de su caché interno.
  if (request.mode === 'navigate') {
    const bustUrl = new URL(request.url)
    bustUrl.searchParams.set('_v', CACHE_SHELL)
    const bustReq = new Request(bustUrl.toString(), { method: 'GET', redirect: 'follow' })
    event.respondWith(
      fetch(bustReq)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE_SHELL).then((cache) => cache.put(request, copy))
          }
          return res
        })
        .catch(() =>
          caches.open(CACHE_SHELL).then((cache) => cache.match(request).then((cached) => cached || caches.match('/')))
        )
    )
  }
})

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    // payload no JSON: se muestra igual
  }

  const root = self.location.origin + self.location.pathname
  const options = {
    body: data.body || 'Entra al portal para verlo.',
    icon: 'images/icon-192.png',
    badge: 'images/icon-192.png',
    data: { url: (data.url || '') || root + '#/' },
    vibrate: [120, 60, 120],
    tag: data.tag || 'spfc-content',
    renotify: true,
  }

  event.waitUntil(
    self.registration
      .showNotification(data.title || 'SpFc/Gd', options)
      .catch(() =>
        // Si el icono falla, reintenta sin él para no perder la notificación.
        self.registration.showNotification(data.title || 'SpFc/Gd', {
          body: options.body,
          data: options.data,
          tag: options.tag,
          renotify: true,
        })
      )
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  let url = event.notification.data?.url
  if (!url) {
    // Sin URL en el payload → abre la raíz del portal.
    url = self.registration.scope
  } else if (url.startsWith('/#/')) {
    // URL con hash-router relativa: la combinamos con el scope del portal
    // (p. ej. '/spfc-portal/') para que funcione en GitHub Pages.
    url = self.registration.scope.replace(/\/$/, '') + url
  }
  // Si ya es absoluta (empieza con http), se usa tal cual.

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus()
          if ('navigate' in client) client.navigate(url)
          return
        }
      }
      return self.clients.openWindow(url)
    })
  )
})

// Si el navegador renueva la suscripción, la página vuelve a guardarla.
self.addEventListener('pushsubscriptionchange', () => {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      client.postMessage({ type: 'push-subscription-changed' })
    }
  })
})
