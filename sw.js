// ===== STUDYFLOW SERVICE WORKER =====
const CACHE_NAME = 'studyflow-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/player.html',
  '/chat.html',
  '/roadmap.html',
  '/compare.html',
  '/library.html',
  '/css/critical.css',
  '/css/main.css',
  '/css/home.css',
  '/css/player.css',
  '/css/chat.css',
  '/css/roadmap.css',
  '/css/compare.css',
  '/css/library.css',
  '/js/config.js',
  '/js/home.js',
  '/js/player.js',
  '/js/chat.js',
  '/js/roadmap.js',
  '/js/compare.js',
  '/js/library.js',
  '/js/notes.js',
  '/manifest.json'
];

// Install — cache all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Some assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always network for API calls
  if (
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('generativelanguage') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('youtu.be') ||
    url.hostname.includes('yewtu.be')
  ) {
    return; // Let it go to network
  }

  // Cache-first for Google Fonts
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Network first, fallback to cache for everything else
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Push notifications (future use)
self.addEventListener('push', event => {
  const data = event.data?.json() || {};
  self.registration.showNotification(data.title || 'StudyFlow', {
    body: data.body || 'Time to study!',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png'
  });
});
