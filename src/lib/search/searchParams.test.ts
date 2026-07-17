import { describe, it, expect } from 'vitest';
import { parseSearchParams, buildSearchQuery, searchColumnId, isEmptySearch, countActiveFilters, type ParsedSearch } from './searchParams';

function roundTrip(input: ParsedSearch): ParsedSearch {
    return parseSearchParams(new URLSearchParams(buildSearchQuery(input)));
}

describe('searchParams', () => {
    it('round-trips exclude filters through the URL', () => {
        const input: ParsedSearch = {
            query: 'hello world',
            sort: 'top',
            filters: {
                authors: ['alice.bsky.social'],
                excludeAuthors: ['bob.bsky.social', 'did:plc:xyz'],
                hashtags: ['cats'],
                excludeHashtags: ['dogs'],
                excludeDomains: ['spam.example'],
                excludeUrls: ['https://example.com/bad'],
                excludeLanguages: ['de'],
                excludeMentions: ['carol.bsky.social'],
                hasMedia: true,
                since: '2026-01-01',
                until: '2026-06-30',
                allTime: false,
            },
        };

        expect(roundTrip(input)).toEqual(input);
    });

    it('produces the same column id regardless of array order', () => {
        const a: ParsedSearch = { query: 'q', sort: 'latest', filters: { hashtags: ['b', 'a'], excludeAuthors: ['y', 'x'] } };
        const b: ParsedSearch = { query: 'q', sort: 'latest', filters: { hashtags: ['a', 'b'], excludeAuthors: ['x', 'y'] } };

        expect(searchColumnId(a)).toBe(searchColumnId(b));
    });

    it('counts exclude filters and allTime=false as active', () => {
        expect(countActiveFilters({})).toBe(0);
        expect(countActiveFilters({ excludeHashtags: ['a'], excludeAuthors: ['b'] })).toBe(2);
        expect(countActiveFilters({ allTime: false })).toBe(1);
        expect(countActiveFilters({ hasMedia: true, since: '2026-01-01' })).toBe(2);
    });

    it('extracts lang: and from: operators out of the query string', () => {
        const parsed = parseSearchParams(new URLSearchParams('q=' + encodeURIComponent('hello lang:ja from:alice.bsky.social')));

        expect(parsed.query).toBe('hello');
        expect(parsed.filters.languages).toEqual(['ja']);
        expect(parsed.filters.authors).toEqual(['alice.bsky.social']);
    });

    it('keeps from:me in the query verbatim instead of lifting it into authors', () => {
        const parsed = parseSearchParams(new URLSearchParams('q=' + encodeURIComponent('cats from:me')));

        expect(parsed.query).toBe('cats from:me');
        expect(parsed.filters.authors).toBeUndefined();
    });

    it('strips a leading @ when lifting from: into authors', () => {
        const parsed = parseSearchParams(new URLSearchParams('q=' + encodeURIComponent('cats from:@alice.bsky.social')));

        expect(parsed.query).toBe('cats');
        expect(parsed.filters.authors).toEqual(['alice.bsky.social']);
    });

    it('treats a filters-only search as non-empty', () => {
        expect(isEmptySearch({ query: '', sort: 'latest', filters: {} })).toBe(true);
        expect(isEmptySearch({ query: '', sort: 'latest', filters: { excludeHashtags: ['a'] } })).toBe(false);
        expect(isEmptySearch({ query: '', sort: 'latest', filters: { embeddedAtUris: ['at://did:plc:x/app.bsky.feed.post/1'] } })).toBe(false);
    });
});
