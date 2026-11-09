import { describe, it, expect } from 'vitest';
import { isTokimekiAd, withoutTokimekiAds } from '$lib/tokimekiAd';

const TOKIMEKI = 'did:plc:4tr5dqti7nmu6g2czpthntak';
const OTHER = 'did:plc:someoneelse';

const item = (did: string, feedContext?: string, uri = 'at://x/app.bsky.feed.post/1') => ({
    ...(feedContext === undefined ? {} : { feedContext }),
    post: { uri, author: { did } },
});

describe('isTokimekiAd', () => {
    it('ad: context from @tokimeki.blue is an ad', () => {
        expect(isTokimekiAd(item(TOKIMEKI, 'ad:did:plc:a/b'))).toBe(true);
    });

    it('ad: context from another account is kept', () => {
        expect(isTokimekiAd(item(OTHER, 'ad:did:plc:a/b'))).toBe(false);
    });

    it('notice: context is kept regardless of author', () => {
        expect(isTokimekiAd(item(TOKIMEKI, 'notice:did:plc:a/b'))).toBe(false);
        expect(isTokimekiAd(item(OTHER, 'notice:did:plc:a/b'))).toBe(false);
    });

    it('non-ad context from @tokimeki.blue is kept', () => {
        expect(isTokimekiAd(item(TOKIMEKI, 'did:plc:a/b'))).toBe(false);
    });

    it('missing feedContext is kept', () => {
        expect(isTokimekiAd(item(TOKIMEKI))).toBe(false);
    });
});

describe('withoutTokimekiAds', () => {
    it('drops only the ad and leaves the cursor untouched', () => {
        const page = {
            cursor: 'next',
            feed: [
                item(TOKIMEKI, 'ad:did:plc:a/b', 'at://ad'),
                item(TOKIMEKI, 'notice:did:plc:a/b', 'at://notice'),
                item(OTHER, undefined, 'at://p1'),
            ],
        };
        const res = withoutTokimekiAds(page);
        expect(res.cursor).toBe('next');
        expect(res.feed.map(i => i.post.uri)).toEqual(['at://notice', 'at://p1']);
    });

    it('keeps the same array when there is no ad', () => {
        const feed = [item(OTHER, undefined, 'at://p1')];
        const page = { cursor: 'next', feed };
        expect(withoutTokimekiAds(page).feed).toBe(feed);
    });
});
