const TOKIMEKI_AD_ACCOUNT = 'did:plc:4tr5dqti7nmu6g2czpthntak';

type FeedItemLike = { feedContext?: string; post: { author: { did: string } } };

export function isTokimekiAd(item: FeedItemLike): boolean {
    return item.feedContext?.startsWith('ad:') === true && item.post.author.did === TOKIMEKI_AD_ACCOUNT;
}

export function withoutTokimekiAds<T extends { feed: FeedItemLike[] }>(page: T): T {
    if (page.feed.some(isTokimekiAd)) {
        page.feed = page.feed.filter(item => !isTokimekiAd(item));
    }
    return page;
}
