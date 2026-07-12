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
        case 'like-via-repost':
            return 'liked_your_post_via_repost';
        case 'like-via-repost_multiple':
            return 'liked_your_post_via_repost_multiple';
        case 'repost-via-repost':
            return 'reposted_your_post_via_repost';
        case 'repost-via-repost_multiple':
            return 'reposted_your_post_via_repost_multiple';
        case 'subscribed-post':
            return 'subscribed_your_post';
        default:
            return 'liked_your_post';
    }
}
