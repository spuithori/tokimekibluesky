export function isRelevantRealtimeEvent(realtime: any, actorDids: Set<string>): boolean {
    const record = realtime?.data?.record;
    if (!record) {
        return false;
    }

    if (record.$type === 'app.bsky.feed.post') {
        if (typeof record.text !== 'string') {
            return false;
        }
    } else if (record.$type !== 'app.bsky.feed.repost') {
        return false;
    }

    return actorDids.has(realtime.data.body?.repo);
}
