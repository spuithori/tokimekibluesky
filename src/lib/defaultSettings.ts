import type {reactionButtons} from "$lib/types/settings";

export const defaultReactionButtons: reactionButtons = {
    shown: ['reply', 'repost', 'like', 'quote', 'bookmark'],
    reply: {
        showCounts: true,
    },
    repost: {
        showCounts: true,
    },
    like: {
        showCounts: true,
    }
}