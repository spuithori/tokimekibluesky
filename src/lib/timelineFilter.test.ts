import { describe, it, expect, beforeEach } from 'vitest';
import { keywordFilter, keywordStringToArray, detectHide, type FormattedKeywordMute } from '$lib/timelineFilter';
import { keywordMuteState } from '$lib/classes/keywordMuteState.svelte';
import { resetSettings } from '$lib/test-fixtures/settingsTestUtils';
import { makeKeywordMute, makePost } from '$lib/test-fixtures/fixtures';

const NOON = '2024-01-01T12:00:00';

function fk(over: Partial<FormattedKeywordMute> & { word: string[] }): FormattedKeywordMute {
    return {
        enabled: true,
        period: { start: '00:00', end: '23:59' },
        ignoreCaseSensitive: false,
        regExp: false,
        ...over,
    };
}

describe('keywordStringToArray', () => {
    it('splits, trims and drops empties', () => {
        expect(keywordStringToArray('foo, bar ,  ,baz')).toEqual(['foo', 'bar', 'baz']);
    });

    it('passes a string[] through unchanged', () => {
        expect(keywordStringToArray(['a', 'b'])).toEqual(['a', 'b']);
    });

    it('returns [] for an empty string', () => {
        expect(keywordStringToArray('')).toEqual([]);
    });
});

describe('keywordFilter', () => {
    it('returns false for a non-array', () => {
        expect(keywordFilter(undefined as unknown as FormattedKeywordMute[], 'foo', NOON)).toBe(false);
    });

    it('returns false for an empty rule set', () => {
        expect(keywordFilter([], 'foo', NOON)).toBe(false);
    });

    it('matches when the text contains the word', () => {
        expect(keywordFilter([fk({ word: ['spoiler'] })], 'a big spoiler here', NOON)).toBe(true);
    });

    it('does not match when the text lacks the word', () => {
        expect(keywordFilter([fk({ word: ['spoiler'] })], 'nothing to see', NOON)).toBe(false);
    });

    it('skips a disabled rule', () => {
        expect(keywordFilter([fk({ word: ['spoiler'], enabled: false })], 'a spoiler', NOON)).toBe(false);
    });

    it('skips a rule with no words', () => {
        expect(keywordFilter([fk({ word: [] })], 'anything', NOON)).toBe(false);
    });

    it('matches case-insensitively only when ignoreCaseSensitive is set', () => {
        expect(keywordFilter([fk({ word: ['Hello'], ignoreCaseSensitive: true })], 'say hello', NOON)).toBe(true);
        expect(keywordFilter([fk({ word: ['Hello'], ignoreCaseSensitive: false })], 'say hello', NOON)).toBe(false);
    });

    it('matches if any of multiple words is present', () => {
        expect(keywordFilter([fk({ word: ['foo', 'bar'] })], 'a bar b', NOON)).toBe(true);
    });

    it('treats the word literally even when regExp is true (regExp is not applied)', () => {
        expect(keywordFilter([fk({ word: ['a.b'], regExp: true })], 'axb', NOON)).toBe(false);
        expect(keywordFilter([fk({ word: ['a.b'], regExp: true })], 'a.b', NOON)).toBe(true);
    });

    it('skips a rule with an invalid period time', () => {
        expect(keywordFilter([fk({ word: ['spoiler'], period: { start: '25:00', end: '10:00' } })], 'spoiler', NOON)).toBe(false);
    });

    describe('period window', () => {
        it('matches inside a same-day window', () => {
            expect(keywordFilter([fk({ word: ['x'], period: { start: '10:00', end: '14:00' } })], 'x', NOON)).toBe(true);
        });

        it('does not match outside a same-day window', () => {
            expect(keywordFilter([fk({ word: ['x'], period: { start: '13:00', end: '14:00' } })], 'x', NOON)).toBe(false);
        });

        it('matches inside a window that crosses midnight', () => {
            expect(keywordFilter([fk({ word: ['x'], period: { start: '22:00', end: '02:00' } })], 'x', '2024-01-01T23:00:00')).toBe(true);
        });

        it('does not match outside a window that crosses midnight', () => {
            expect(keywordFilter([fk({ word: ['x'], period: { start: '22:00', end: '02:00' } })], 'x', NOON)).toBe(false);
        });
    });
});

describe('detectHide', () => {
    beforeEach(() => {
        resetSettings();
    });

    it('hides a post matching a keyword mute (no moderation data)', () => {
        resetSettings({ version: 5, moderation: { keywordMutes: [makeKeywordMute({ word: 'spoiler' })] } });
        expect(detectHide(null, 'contentList', false, makePost({ text: 'a big spoiler' }))).toBe(true);
    });

    it('returns current when nothing matches and there is no moderation data', () => {
        expect(detectHide(null, 'contentList', 'CURRENT', makePost({ text: 'clean post' }))).toBe('CURRENT');
    });

    it('hides when moderation ui reports filter, even without a keyword match', () => {
        const moderateData = { ui: () => ({ filter: true }) };
        expect(detectHide(moderateData, 'contentList', false, makePost({ text: 'clean post' }))).toBe(true);
    });

    it('falls back to current when moderation ui does not filter', () => {
        const moderateData = { ui: () => ({ filter: false }) };
        expect(detectHide(moderateData, 'contentList', 'CURRENT', makePost({ text: 'clean post' }))).toBe('CURRENT');
    });
});
