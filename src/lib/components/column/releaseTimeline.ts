export async function releaseTimeline(_agent, column) {

}

export async function assignCursorFromLatest(_agent, column) {
    const res = await _agent.getTimeline({limit: 20, cursor: '', algorithm: column.algorithm});
    const refPost = res.data.feed.slice(-1)[0];
    const cursor = res.data.cursor;
    let i = 0;

    while (i < 20) {
        column.data.feed[i].memoryCursor = cursor;

        if (isDuplicatePost(column.data.feed[i], refPost)) {
            break;
        }

        i++;
    }
}

export function isDuplicatePost(oldFeed, newFeed) {
    return newFeed.reason
        ? oldFeed.post.uri === newFeed.post.uri && oldFeed.reason?.indexedAt === newFeed.reason.indexedAt
        : oldFeed.post.uri === newFeed.post.uri;
}
