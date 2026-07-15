import { describe, it, expect } from 'vitest';
import { RichText, type Facet } from './rich-text';

const enc = new TextEncoder();

function facetAt(text: string, sub: string, feature: Facet['features'][number]): Facet {
    const before = text.slice(0, text.indexOf(sub));
    const byteStart = enc.encode(before).byteLength;
    const byteEnd = byteStart + enc.encode(sub).byteLength;
    return { index: { byteStart, byteEnd }, features: [feature] };
}

describe('RichText', () => {
    describe('segments() without facets', () => {
        it('yields the whole text as a single plain segment', () => {
            const segs = [...new RichText({ text: 'hello world' }).segments()];
            expect(segs).toHaveLength(1);
            expect(segs[0].text).toBe('hello world');
            expect(segs[0].isLink()).toBe(false);
            expect(segs[0].isMention()).toBe(false);
            expect(segs[0].isTag()).toBe(false);
        });

        // Direct proof of the optimization: a facet-less post never touches utf8.
        it('does not encode utf8 while iterating a facet-less post', () => {
            const rt = new RichText({ text: 'a plain japanese post あいうえお' });
            [...rt.segments()];
            expect((rt.unicodeText as any)._utf8).toBeUndefined();
        });
    });

    describe('segments() with facets', () => {
        it('splits out a link facet', () => {
            const text = 'go to google.com now';
            const rt = new RichText({
                text,
                facets: [facetAt(text, 'google.com', { $type: 'app.bsky.richtext.facet#link', uri: 'https://google.com' })],
            });
            const link = [...rt.segments()].find((s) => s.isLink());
            expect(link?.text).toBe('google.com');
            expect(link?.link?.uri).toBe('https://google.com');
        });

        it('splits out a mention facet', () => {
            const text = 'hi @alice.bsky.social ok';
            const rt = new RichText({
                text,
                facets: [facetAt(text, '@alice.bsky.social', { $type: 'app.bsky.richtext.facet#mention', did: 'did:plc:alice' })],
            });
            const mention = [...rt.segments()].find((s) => s.isMention());
            expect(mention?.text).toBe('@alice.bsky.social');
            expect(mention?.mention?.did).toBe('did:plc:alice');
        });

        it('splits out a tag facet', () => {
            const text = 'love #svelte yay';
            const rt = new RichText({
                text,
                facets: [facetAt(text, '#svelte', { $type: 'app.bsky.richtext.facet#tag', tag: 'svelte' })],
            });
            const tag = [...rt.segments()].find((s) => s.isTag());
            expect(tag?.text).toBe('#svelte');
            expect(tag?.tag?.tag).toBe('svelte');
        });

        // The crux: byte offsets must stay correct through the lazy utf8 path
        // even when the facet sits after multibyte (3-byte) Japanese text.
        it('splits a link facet inside multibyte text on byte boundaries', () => {
            const text = 'こんにちは example.com です';
            const rt = new RichText({
                text,
                facets: [facetAt(text, 'example.com', { $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com' })],
            });
            const link = [...rt.segments()].find((s) => s.isLink());
            expect(link?.text).toBe('example.com');
            expect(link?.link?.uri).toBe('https://example.com');
        });

        it('sorts facets by byte offset regardless of input order', () => {
            const text = 'a.com and b.com';
            const rt = new RichText({
                text,
                facets: [
                    facetAt(text, 'b.com', { $type: 'app.bsky.richtext.facet#link', uri: 'https://b.com' }),
                    facetAt(text, 'a.com', { $type: 'app.bsky.richtext.facet#link', uri: 'https://a.com' }),
                ],
            });
            const links = [...rt.segments()].filter((s) => s.isLink());
            expect(links.map((s) => s.link?.uri)).toEqual(['https://a.com', 'https://b.com']);
        });
    });

    describe('getters', () => {
        it('exposes text as the utf16 string', () => {
            expect(new RichText({ text: 'あい' }).text).toBe('あい');
        });

        it('length is the utf8 byte length', () => {
            expect(new RichText({ text: 'あ' }).length).toBe(3);
        });

        it('graphemeLength counts graphemes', () => {
            expect(new RichText({ text: '👍a' }).graphemeLength).toBe(2);
        });
    });
});
