// Service Worker Version
const VERSION = '1.0.0';

// Cache name with version
const CACHE_NAME = `flintxt-cache-${VERSION}`;

// Assets to cache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing new service worker version:', VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating new service worker version:', VERSION);
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Push event handler
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push Received:', event);

  if (!event.data) return;

  let notification;
  try {
    notification = event.data.json();
  } catch (e) {
    notification = {
      title: 'New Notification',
      body: event.data.text(),
      icon: '/favicon.ico',
      badge: '/favicon.ico'
    };
  }

  const options = {
    ...notification,
    icon: notification.icon || '/favicon.ico',
    badge: notification.badge || '/favicon.ico',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    tag: 'flintxt-notification-' + Date.now(),
    renotify: true,
    data: notification.data || {},
    actions: [
      {
        action: 'open',
        title: 'Open',
      },
      {
        action: 'close',
        title: 'Close',
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notification.title, options)
      .then(() => {
        console.log('[ServiceWorker] Notification displayed successfully');
      })
      .catch((error) => {
        console.error('[ServiceWorker] Error showing notification:', error);
      })
  );
});

// Notification click event handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          return client.navigate(urlToOpen);
        }
      }
      
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Fetch event handler with network-first strategy
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Only cache GET requests
        if (event.request.method !== 'GET') {
          return response;
        }

        // Clone the response
        const responseToCache = response.clone();

        // Cache the response
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          })
          .catch((err) => {
            console.error('[ServiceWorker] Error caching response:', err);
          });

        return response;
      })
      .catch(() => {
        // If network request fails, try to get from cache
        return caches.match(event.request);
      })
  );
});