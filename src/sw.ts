import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import {accountsDb} from "./lib/db";

declare let self: ServiceWorkerGlobalScope

cleanupOutdatedCaches();

precacheAndRoute(self.__WB_MANIFEST);

type rawType = 'like' | 'follow' | 'reply' | 'repost' | 'quote' | 'mention' | 'unknown';

function chooseBadge(rawType: rawType) {
    const badgeImage = {
        default: '/badge-like.png',
        like: '/badge-like.png',
        follow: '/badge-follow.png',
        reply: '/badge-reply.png',
        repost: '/badge-repost.png',
        mention: '/badge-mention.png',
        quote: '/badge-quote.png',
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

    if (!categories.includes(data.type)) {
        return;
    }

    self.registration.showNotification(data.from + ' ' + data.title, {
        body: data.text,
        badge: badge,
        icon: avatar,
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

        event.waitUntil(execNotification(data));
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