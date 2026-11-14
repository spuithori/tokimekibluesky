import { describe, it, expect } from 'vitest';
import { toFeedLoadError, feedOwnerDid } from './feedLoadError';

function xrpcError(status: number, error: string | undefined, message: string) {
    return Object.assign(new Error(message), { status, error });
}

describe('toFeedLoadError', () => {
    it('keeps the feed generator own explanation for a private feed', () => {
        const result = toFeedLoadError('custom', xrpcError(401, 'AuthRequired', 'このフィードは非公開です（作成者だけが閲覧できます）'));
        expect(result).toEqual({ kind: 'feedgenUnknown', serverMessage: 'このフィードは非公開です（作成者だけが閲覧できます）' });
    });

    it('maps the AppView failure messages of getFeed to their causes', () => {
        const kindOf = (status: number, message: string) => toFeedLoadError('custom', xrpcError(status, undefined, message)).kind;
        expect(kindOf(400, 'could not find feed')).toBe('feedgenDoesNotExist');
        expect(kindOf(502, 'feed unavailable')).toBe('feedgenOffline');
        expect(kindOf(502, 'feed provided an invalid response')).toBe('feedgenBadResponse');
        expect(kindOf(400, 'could not resolve identity: did:web:gone.example')).toBe('feedgenMisconfigured');
        expect(kindOf(400, 'invalid feed generator service details in did document: did:web:x.example')).toBe('feedgenMisconfigured');
        expect(kindOf(429, 'リクエストが多すぎます')).toBe('feedTooManyRequests');
    });

    it('does not blame a feed generator for failures of other timelines', () => {
        expect(toFeedLoadError('default', xrpcError(502, undefined, 'feed unavailable')).kind).toBe('unknown');
        expect(toFeedLoadError('officialList', xrpcError(429, 'RateLimitExceeded', 'Rate Limit Exceeded')).kind).toBe('unknown');
    });

    it('does not present client-side failures as a message from the server', () => {
        expect(toFeedLoadError('custom', new TypeError('Failed to fetch')).serverMessage).toBe('');
        expect(toFeedLoadError('custom', xrpcError(502, undefined, 'XRPC app.bsky.feed.getFeed failed: 502')).serverMessage).toBe('');
    });
});

describe('feedOwnerDid', () => {
    it('reads the owner only from a feed generator uri', () => {
        expect(feedOwnerDid('at://did:plc:owner/app.bsky.feed.generator/abc')).toBe('did:plc:owner');
        expect(feedOwnerDid('at://did:plc:owner/app.bsky.graph.list/abc')).toBe('');
        expect(feedOwnerDid(undefined)).toBe('');
    });
});
