import { describe, it, expect, vi } from 'vitest';
import { parsePostInput, toPostAtUri, shortPostLabel } from './postUriInput';

describe('parsePostInput', () => {
    it('parses a bsky.app URL with a handle', () => {
        expect(parsePostInput('https://bsky.app/profile/alice.bsky.social/post/3kabc123')).toEqual({ authority: 'alice.bsky.social', rkey: '3kabc123' });
    });

    it('parses a bsky.app URL with a did and trailing query/hash', () => {
        expect(parsePostInput('https://bsky.app/profile/did:plc:abcdef/post/3kabc123?ref=share#top')).toEqual({ authority: 'did:plc:abcdef', rkey: '3kabc123' });
    });

    it('parses an at-uri', () => {
        expect(parsePostInput('at://did:plc:abcdef/app.bsky.feed.post/3kabc123')).toEqual({ authority: 'did:plc:abcdef', rkey: '3kabc123' });
    });

    it('rejects non-post inputs', () => {
        expect(parsePostInput('https://bsky.app/profile/alice.bsky.social')).toBeNull();
        expect(parsePostInput('at://did:plc:abcdef/app.bsky.feed.generator/cool')).toBeNull();
        expect(parsePostInput('hello')).toBeNull();
        expect(parsePostInput('')).toBeNull();
    });
});

describe('toPostAtUri', () => {
    it('passes through a did-based at-uri without resolving', async () => {
        const resolver = vi.fn();
        const uri = await toPostAtUri('at://did:plc:abcdef/app.bsky.feed.post/3kabc123', resolver);

        expect(uri).toBe('at://did:plc:abcdef/app.bsky.feed.post/3kabc123');
        expect(resolver).not.toHaveBeenCalled();
    });

    it('resolves a handle authority to a did', async () => {
        const resolver = vi.fn().mockResolvedValue('did:plc:resolved');
        const uri = await toPostAtUri('https://bsky.app/profile/alice.bsky.social/post/3kabc123', resolver);

        expect(uri).toBe('at://did:plc:resolved/app.bsky.feed.post/3kabc123');
        expect(resolver).toHaveBeenCalledWith('alice.bsky.social');
    });

    it('returns null for invalid input', async () => {
        expect(await toPostAtUri('nope', vi.fn())).toBeNull();
    });
});

describe('shortPostLabel', () => {
    it('keeps handles readable', () => {
        expect(shortPostLabel('https://bsky.app/profile/alice.bsky.social/post/3kabc123')).toBe('alice.bsky.social/3kabc123');
    });

    it('truncates long dids', () => {
        expect(shortPostLabel('at://did:plc:abcdefghijklmnop/app.bsky.feed.post/3k')).toBe('did:plc:abcdefgh…/3k');
    });
});
