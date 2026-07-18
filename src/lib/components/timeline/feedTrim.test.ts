import { describe, it, expect } from 'vitest';
import { trimFeedAtBorder } from './feedTrim';

function makeFeed(batches: Array<{ cursor?: string; count: number }>) {
    const feed: Array<{ memoryCursor?: string }> = [];
    for (const batch of batches) {
        for (let i = 0; i < batch.count; i++) {
            feed.push(batch.cursor ? { memoryCursor: batch.cursor } : {});
        }
    }
    return feed;
}

describe('trimFeedAtBorder (default style)', () => {
    it('returns null when feed length is at or below the border window (40)', () => {
        expect(trimFeedAtBorder(makeFeed([{ cursor: 'A', count: 39 }]))).toBeNull();
        expect(trimFeedAtBorder(makeFeed([{ cursor: 'A', count: 40 }]))).toBeNull();
    });

    it('returns null when the border item has no memoryCursor', () => {
        const feed = makeFeed([{ count: 50 }]);
        expect(trimFeedAtBorder(feed)).toBeNull();
    });

    it('trims after the last item sharing the border cursor and rewinds to it', () => {
        const feed = makeFeed([
            { cursor: 'A', count: 45 },
            { cursor: 'B', count: 30 },
        ]);
        const plan = trimFeedAtBorder(feed);
        expect(plan).toEqual({ spliceStart: 45, cursor: 'A' });
    });

    it('returns a no-op splice plan when the border batch reaches the feed tail', () => {
        const feed = makeFeed([
            { cursor: 'X', count: 10 },
            { cursor: 'A', count: 31 },
        ]);
        const plan = trimFeedAtBorder(feed);
        expect(plan).toEqual({ spliceStart: 41, cursor: 'A' });
    });
});

describe('trimFeedAtBorder (media style)', () => {
    it('uses the larger border window (120) and skips shorter feeds', () => {
        const feed = makeFeed([{ cursor: 'A', count: 120 }]);
        expect(trimFeedAtBorder(feed, 'media')).toBeNull();
    });

    it('trims media feeds beyond the media border', () => {
        const feed = makeFeed([
            { cursor: 'A', count: 125 },
            { cursor: 'B', count: 40 },
        ]);
        const plan = trimFeedAtBorder(feed, 'media');
        expect(plan).toEqual({ spliceStart: 125, cursor: 'A' });
    });

    it('keeps the default border for non-media styles', () => {
        const feed = makeFeed([
            { cursor: 'A', count: 45 },
            { cursor: 'B', count: 30 },
        ]);
        expect(trimFeedAtBorder(feed, 'default')).toEqual({ spliceStart: 45, cursor: 'A' });
    });
});
