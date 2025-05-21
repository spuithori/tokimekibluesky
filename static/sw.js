self.addEventListener('install', event => {
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {

        }).then(() => {
            return self.clients.claim();
        }).then(() => {
            return self.registration.unregister();
        })
    );
});