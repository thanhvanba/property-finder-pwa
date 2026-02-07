const CACHE_NAME = 'property-finder-v1'
const STATIC_CACHE_NAME = 'property-finder-static-v1'
const RUNTIME_CACHE_NAME = 'property-finder-runtime-v1'

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
]

// Skip caching for these paths
const SKIP_CACHE_PATHS = [
  '/api/',
  '/_next/',
  '/sw.js',
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets')
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Failed to cache some static assets:', err)
      })
    })
  )
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== STATIC_CACHE_NAME &&
            cacheName !== RUNTIME_CACHE_NAME &&
            cacheName !== CACHE_NAME
          ) {
            console.log('[SW] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  // Take control of all pages immediately
  return self.clients.claim()
})

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!event.request.url.startsWith('http')) {
    return
  }

  const url = new URL(event.request.url)

  // Skip API calls, external resources, and Next.js internals
  if (
    url.origin !== self.location.origin ||
    SKIP_CACHE_PATHS.some((path) => url.pathname.startsWith(path))
  ) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Network first strategy
      return fetch(event.request)
        .then((networkResponse) => {
          // If network response is valid, cache it
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type !== 'error'
          ) {
            const responseToCache = networkResponse.clone()
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => {
          // Network failed, try cache
          if (cachedResponse) {
            return cachedResponse
          }

          // If it's a navigation request and we have no cache, show offline page
          if (event.request.mode === 'navigate') {
            return caches.match('/offline')
          }

          // For other requests, return a basic response
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain',
            }),
          })
        })
    })
  )
})

// Background sync for pending properties
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  if (event.tag === 'sync-properties') {
    event.waitUntil(syncProperties())
  }
})

async function syncProperties() {
  // Background sync for pending properties
  // This will be called when the app is back online
  console.log('[SW] Syncing properties...')
  // TODO: Implement property sync logic
}

// Push notification handler (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received')
  // TODO: Implement push notification handling
})

// Notification click handler (for future use)
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked')
  event.notification.close()
  // TODO: Implement notification click handling
})
