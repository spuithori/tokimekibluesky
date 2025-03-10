import {parseISO} from "date-fns";

export function getReasonText(reason: string) {
    switch (reason) {
        case 'quote':
            return 'quoted_your_post';
        case 'reply':
            return 'replied_your_post';
        case 'mention':
            return 'mentioned_your_post';
        case 'like':
            return 'liked_your_post';
        case 'like_multiple':
            return 'liked_your_post_multiple';
        case 'repost':
            return 'reposted_your_post';
        case 'repost_multiple':
            return 'reposted_your_post_multiple';
        default:
            return 'liked_your_post';
    }
}

export function bundleByProperties(array: any[], property1: string, property2: string) {
    let groups = [];
    for (let item of array) {
        let value1 = item[property1] || null;
        let value2 = item[property2];

        if (value1 === null || value2 === 'reply' || value2 === 'mention' || value2 === 'quote') {
            groups.push([item]);
        } else {
            // @ts-ignore
            if (!groups[value1 + '-' + value2]) {
                // @ts-ignore
                groups[value1 + '-' + value2] = [];
            }
            // @ts-ignore
            groups[value1 + '-' + value2].push(item);
        }
    }
    const bundledArray = Object.values(groups);

    return bundledArray.map(array => ({
        reason: array[0].reason,
        notifications: array,
        latestIndexedAt: array[0].indexedAt,
        key: array[0].indexedAt + new Date().toISOString(),
        subject: array[0].reasonSubject && array[0].reason !== 'reply' && array[0].reason !==   'quote'
            ? array[0].reasonSubject
            : (array[0].uri && !array[0].uri.includes('app.bsky.graph.follow')
                ? array[0].uri
                : undefined),
        postIndex: undefined,
    }));
}

export async function getNotifications(ctx, putBefore = false, _agent, currentFeedPool) {
    const _orig = ctx.filter(item => !item?.author?.viewer.muted);
    let bundled = bundleByProperties(_orig, 'reasonSubject', 'reason');

    let subjects = [...new Set(bundled
      .map(array => array.subject)
      .filter(subject => subject !== undefined))]
      .filter(subject => !currentFeedPool.some(feed => feed.post.uri === subject));

    let feedPool = currentFeedPool;
    if (subjects.length && subjects.length <= 25) {
        const res = await _agent.agent.api.app.bsky.feed.getPosts({uris: subjects});
        const formattedPosts = res.data.posts.map(post => ({ post: post }));
        feedPool = [...currentFeedPool, ...formattedPosts];
    }

    bundled.forEach(array => {
        array.postIndex = feedPool.findIndex(feed => feed.post.uri === array.subject);
    });
    bundled = bundled.sort((a, b) => parseISO(b.latestIndexedAt).getTime() - parseISO(a.latestIndexedAt).getTime());

    return {
        notifications: bundled,
        feedPool: feedPool,
    };
}

export function mergeNotifications(array: any[], isAllRead = false) {
    return array.reduce((previousValue, currentValue) => {
        if (!previousValue.some(item => currentValue?.uri === item.uri)) {
            if (isAllRead) {
                currentValue.isRead = true;
            }

            return [...previousValue, currentValue];
        } else {
            return [...previousValue];
        }
    }, []);
}

export function removeNotificationsDuplication(notification: any[]) {
    return notification.reduce((previousValue, currentValue) => {
        if (!previousValue.some(item => currentValue?.author.did === item.author?.did)) {
            return [...previousValue, currentValue];
        } else {
            return [...previousValue];
        }
    }, []);
}