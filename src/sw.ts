import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import {accountsDb} from "./lib/db";

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

type rawType = 'like' | 'follow' | 'reply' | 'repost' | 'quote' | 'mention' | 'post' | 'unknown';

function chooseBadge(rawType: rawType) {
    const badgeImage = {
        default: '/badge-like.png',
        like: '/badge-like.png',
        follow: '/badge-follow.png',
        reply: '/badge-reply.png',
        repost: '/badge-repost.png',
        mention: '/badge-mention.png',
        quote: '/badge-quote.png',
        post: '/badge-bell.png',
    }

    switch (rawType) {
        case 'like':
            return badgeImage.like;
        case 'follow':
            return badgeImage.follow;
        case 'reply':
            return badgeImage.reply;
        case 'repost':
            return badgeImage.repost;
        case 'quote':
            return badgeImage.quote;
        case 'mention':
            return badgeImage.mention;
        case 'post':
            return badgeImage.post;
        default:
            return badgeImage.default;
    }
}

async function execNotification(data) {
    const badge = chooseBadge(data.type);

    const account = await accountsDb.accounts
        .where('did')
        .equals(data.did)
        .first();

    if (!account) {
        return;
    }

    const categories = account.notification || [];
    const avatar = account.avatar || '/swbadge.png';

    if (!categories.includes(data.type) && data.type !== 'post') {
        return;
    }

    self.registration.showNotification(data.from + ' ' + data.title, {
        body: data.text,
        badge: badge,
        icon: avatar,
        data: data.targetUrl,
        actions: [
            {
                action: 'open',
                title: 'Open'
            }
        ]
    })
}

self.addEventListener('push', (event) => {
    if (!self.Notification || self.Notification.permission !== 'granted') {
        return;
    }

    if (event.data) {
        const data = JSON.parse(event.data.text());

        event.waitUntil(
          clients
            .matchAll({type: 'window'})
            .then(windowClients => {
                if (windowClients.length > 0) {
                    windowClients.forEach(client => {
                        client.postMessage({
                            type: 'notification_event',
                            data: data,
                        });
                    });
                }
            })
        );

        event.waitUntil(execNotification(data));
    }
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();

    const urlData = event.notification.data;
    const urlToOpen = new URL(urlData || '/', self.location.origin).href;

    const promiseChain = clients
        .matchAll({
            type: 'window',
            includeUncontrolled: true,
        })
        .then((windowClients) => {
            let matchingClient = null;

            for (let i = 0; i < windowClients.length; i++) {
                const windowClient = windowClients[i];
                if (windowClient.url === urlToOpen) {
                    matchingClient = windowClient;
                    break;
                }
            }

            if (matchingClient) {
                return matchingClient.focus();
            } else {
                return clients.openWindow(urlToOpen);
            }
        });

    event.waitUntil(promiseChain);
}, false);