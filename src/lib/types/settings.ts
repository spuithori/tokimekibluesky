export type reactionButtons = {
    shown: ('reply' | 'repost' | 'like' | 'quote' | 'bookmark')[],
    reply: {
        showCounts: true,
    },
    repost: {
        showCounts: true,
    }
    like: {
        showCounts: true,
    }
}