import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
    if (!self.Notification || self.Notification.permission !== 'granted') {
        return;
    }

    if (event.data) {
        const data = JSON.parse(event.data.text());

        event.waitUntil(
            self.registration.showNotification(data.from + ' ' + data.type, {
                body: data.text,
                badge: '/swbadge.png',
                icon: '/swbadge.png',
                actions: [
                    {
                        action: 'open',
                        title: 'Open'
                    }
                ]
            })
        );
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    if (event.action === 'open') {
        const targetUrl = '/';

        event.waitUntil(clients.matchAll({ type: 'window' }).then(clientsArr => {
            const hadWindowToFocus = clientsArr.some(windowClient => windowClient.url === targetUrl ? (windowClient.focus(), true) : false);

            if (!hadWindowToFocus) clients.openWindow(targetUrl).then(windowClient => windowClient ? windowClient.focus() : null);
        }));
    } else {
        clients.openWindow('/');
    }
}, false);