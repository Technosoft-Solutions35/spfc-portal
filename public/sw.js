// Service Worker del portal SpFc/Gd.
// Se encarga de RECIBIR las notificaciones push (aunque el navegador esté
// cerrado) y mostrarlas, además de abrir el portal al tocarlas.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
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
    icon: 'images/logo-clan.png',
    badge: 'images/logo-clan.png',
    data: { url: (data.url || '') || root + '#/' },
    vibrate: [120, 60, 120],
    tag: data.tag || 'spfc-content',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'SpFc/Gd', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || self.location.origin + self.location.pathname

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
