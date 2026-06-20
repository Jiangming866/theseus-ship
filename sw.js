// Self-destructing Service Worker - cleans up all caches and unregisters
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          console.log('Deleting cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      return self.registration.unregister();
    }).then(function() {
      console.log('SW unregistered successfully');
    })
  );
});

// Pass-through fetch - don't intercept anything
self.addEventListener('fetch', function(event) {
  return;
});