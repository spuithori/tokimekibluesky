import { describe, it, expect } from 'vitest';
import { searchLabel, searchColumnName, filterChips } from './searchDisplay';

const t = (key: string) => key;

describe('searchDisplay', () => {
    it('falls back to the advanced-search label when the query is empty', () => {
        expect(searchLabel({ query: 'cats', sort: 'latest', filters: {} }, t)).toBe('cats');
        expect(searchLabel({ query: '', sort: 'latest', filters: { hashtags: ['a'] } }, t)).toBe('search_advanced');
    });

    it('builds a column name without an empty quoted query', () => {
        expect(searchColumnName({ query: 'cats', sort: 'latest', filters: {} }, t)).toBe('search "cats"');
        expect(searchColumnName({ query: '', sort: 'latest', filters: { hashtags: ['a'] } }, t)).toBe('search_advanced');
    });

    it('summarizes filters as chips with − prefix for excludes', () => {
        const chips = filterChips({
            query: '',
            sort: 'top',
            filters: {
                authors: ['a', 'b'],
                excludeAuthors: ['c'],
                hashtags: ['cats'],
                excludeHashtags: ['dogs'],
                hasMedia: true,
                since: '2026-01-01',
                embeddedAtUris: ['at://did:plc:x/app.bsky.feed.post/1'],
            },
        }, t);

        expect(chips).toEqual([
            'search_sort_top',
            'search_filter_authors·2',
            '−search_filter_authors·1',
            '#cats',
            '−#dogs',
            'search_filter_media_only',
            '2026-01-01〜',
            'search_filter_quote·1',
        ]);
    });

    it('returns no chips for an empty filter set with latest sort', () => {
        expect(filterChips({ query: 'q', sort: 'latest', filters: {} }, t)).toEqual([]);
    });
});
