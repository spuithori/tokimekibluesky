import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

type rawType = 'app.bsky.feed.like' | 'app.bsky.graph.follow' | 'app.bsky.feed.post' | 'unknown';

function chooseBadge(rawType: rawType) {
    const badgeImage = {
        default: '/badge-like.png',
        like: '/badge-like.png',
        follow: '/badge-follow.png',
        reply: '/badge-reply.png',
    }

    switch (rawType) {
        case 'app.bsky.feed.like':
            return badgeImage.like;
        case 'app.bsky.graph.follow':
            return badgeImage.follow;
        case 'app.bsky.feed.post':
            return badgeImage.reply;
        default:
            return badgeImage.default;
    }
}

self.addEventListener('push', (event) => {
    if (!self.Notification || self.Notification.permission !== 'granted') {
        return;
    }

    if (event.data) {
        const data = JSON.parse(event.data.text());
        const badge = chooseBadge(data.rawType);

        event.waitUntil(
            self.registration.showNotification(data.from + ' ' + data.type, {
                body: data.text,
                badge: badge,
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