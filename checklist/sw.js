/**
 * FlowTask Service Worker
 * Offline-first caching strategy
 * Cache version: v1.0.0
 */

const CACHE_NAME = 'flowtask-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/main.css',
  './css/components.css',
  './css/animations.css',
  './css/themes.css',
  './js/core/storage.js',
  './js/core/state.js',
  './js/core/utils.js',
  './js/modules/gamification.js',
  './js/modules/tasks.js',
  './js/modules/pomodoro.js',
  './js/modules/analytics.js',
  './js/modules/wellness.js',
  './js/modules/notifications.js',
  './js/modules/search.js',
  './js/ui/taskCard.js',
  './js/ui/modal.js',
  './js/ui/heatmap.js',
  './js/ui/charts.js',
  './js/app.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap',
];

// ---- Install ----
self.addEventListener('install', event => {
  console.log('[SW] Installing FlowTask Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => {
          return new Request(url, { mode: 'no-cors' });
        })).catch(err => {
          console.warn('[SW] Some assets failed to cache:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ---- Activate ----
self.addEventListener('activate', event => {
  console.log('[SW] Activating FlowTask Service Worker...');
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      ))
      .then(() => self.clients.claim())
  );
});

// ---- Fetch (Cache-First for static, Network-First for external) ----
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') return;

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        if (cachedResponse) return cachedResponse;

        return fetch(request)
          .then(response => {
            // Cache successful responses for same-origin
            if (response.ok && url.origin === self.location.origin) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
            }
            return response;
          })
          .catch(() => {
            // Offline fallback for navigation
            if (request.mode === 'navigate') {
              return caches.match('./index.html');
            }
          });
      })
  );
});

// ---- Push Notifications ----
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'FlowTask', {
      body:  data.body || '',
      icon:  './icons/icon-192.png',
      badge: './icons/icon-72.png',
      data:  data,
    })
  );
});

// ---- Notification Click ----
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('./')
  );
});
