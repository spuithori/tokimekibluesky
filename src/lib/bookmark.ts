import {db} from "$lib/db";

export async function getBookmarkFeed(id, paged) {
    const feeds = await db.feeds
        .orderBy('indexedAt')
        .reverse()
        .filter(feed => feed.bookmark === Number(id))
        .offset(paged * 20)
        .limit(20)
        .toArray();

    return feeds;
}