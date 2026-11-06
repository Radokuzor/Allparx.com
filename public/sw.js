/**
 * Service worker for AllParx web push.
 *
 * Deliberately tiny: it does not cache pages or intercept navigation, it only
 * receives "new places near you" notifications and opens the site when one is
 * tapped. Adding an offline cache here would turn every deploy into a
 * cache-invalidation problem, which is not worth it for a notification.
 */

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch {
    payload = {}
  }

  const title = payload.title || 'AllParx'
  const body = payload.body || 'New outdoor places near you'

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icon',
      badge: '/icon',
      tag: 'allparx-nearby',
      data: { url: payload.url || '/near-me' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/near-me'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
