import { describe, it, expect } from 'vitest';
import { getTextArray, isUriLocal } from './richtext';

const enc = new TextEncoder();

function linkFacet(text: string, sub: string, uri: string) {
    const byteStart = enc.encode(text.slice(0, text.indexOf(sub))).byteLength;
    const byteEnd = byteStart + enc.encode(sub).byteLength;
    return { index: { byteStart, byteEnd }, features: [{ $type: 'app.bsky.richtext.facet#link', uri }] };
}

describe('getTextArray', () => {
    it('returns a single segment for plain text', () => {
        const arr = getTextArray({ text: 'hello', facets: undefined });
        expect(arr).toHaveLength(1);
        expect(arr[0].text).toBe('hello');
        expect(arr[0].isLink()).toBe(false);
    });

    it('splits out a link facet into its own segment', () => {
        const text = 'see google.com';
        const arr = getTextArray({ text, facets: [linkFacet(text, 'google.com', 'https://google.com')] });
        const link = arr.find((s) => s.isLink());
        expect(link?.text).toBe('google.com');
        expect(link?.link?.uri).toBe('https://google.com');
    });

    it('preserves multibyte text unchanged', () => {
        const arr = getTextArray({ text: 'あいうえお', facets: undefined });
        expect(arr[0].text).toBe('あいうえお');
    });
});

describe('isUriLocal', () => {
    it('returns true for bsky.app', () => {
        expect(isUriLocal('https://bsky.app/profile/foo')).toBe(true);
    });

    it('returns true for staging.bsky.app', () => {
        expect(isUriLocal('https://staging.bsky.app/x')).toBe(true);
    });

    it('returns false for an external host', () => {
        expect(isUriLocal('https://example.com/foo')).toBe(false);
    });

    it('returns false for an invalid url', () => {
        expect(isUriLocal('not a url')).toBe(false);
    });
});
