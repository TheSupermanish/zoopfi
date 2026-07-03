// Bump this on any service-worker behavior change so activate() purges the old
// cache (v1 aggressively cached ALL app code, which served stale UI after a
// deploy and could interfere with the ZK engine's large WASM/circuit fetches).
const CACHE_NAME = 'superpay-v2';
// Use the icons that actually exist (the app ships SVG icons — the .png variants
// were never created, so precaching them 404'd and broke install).
const STATIC_ASSETS = [
  '/icon-192.svg',
  '/icon-512.svg',
  '/icon.svg',
];

// Install event - cache static assets.
// Cache each asset independently (allSettled) so a single missing file — e.g. an
// icon that hasn't been added yet — can't reject the whole install and throw
// "Failed to execute 'addAll' on 'Cache'". PWA install stays resilient.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(STATIC_ASSETS.map((url) => cache.add(url)))
    )
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch event — the service worker ONLY serves the precached static icons (so
// PWA install / offline icon still work). Everything else (HTML, JS, CSS, API,
// WASM, ZK circuits, RPC) is left untouched so the browser always fetches it
// fresh from the network. This guarantees a new deploy is picked up on the next
// load (no stale app code, no hard-reload) and the SW never sits in front of the
// privacy engine's large downloads.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !STATIC_ASSETS.includes(url.pathname)) {
    return; // not a precached icon → let the browser handle it (fresh network)
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});

// Push notification handler
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon-192.svg',
      badge: '/icon-192.svg',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard',
        dateOfArrival: Date.now(),
      },
      actions: [
        {
          action: 'open',
          title: 'Open',
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
        },
      ],
    };
    event.waitUntil(
      self.registration.showNotification(data.title || 'SuperPay', options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

