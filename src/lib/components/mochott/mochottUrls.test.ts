import { describe, it, expect } from 'vitest';
import { mochottArticleUrl, mochottImageUrl, mochottMinisiteUrl } from './mochottUrls';

const author = { did: 'did:plc:them', handle: 'them.test' };
const uri = 'at://did:plc:them/site.mochott.article/3abc';

describe('mochottArticleUrl', () => {
    it('follows the same priority as mochott: custom domain, global slug, minisite, then the author page', () => {
        expect(mochottArticleUrl({ uri, slug: 'ink', author, minisite: { slug: 'pens', globalSlug: 'penclub', customDomain: 'pens.example.com' } })).toBe('https://pens.example.com/ink');
        expect(mochottArticleUrl({ uri, slug: 'ink', author, minisite: { slug: 'pens', globalSlug: 'penclub' } })).toBe('https://mochott.site/penclub/ink');
        expect(mochottArticleUrl({ uri, slug: 'ink', author, minisite: { slug: 'pens' } })).toBe('https://mochott.site/them.test/s/pens/ink');
        expect(mochottArticleUrl({ uri, slug: 'ink', author })).toBe('https://mochott.site/them.test/ink');
    });

    it('falls back to the record key when the article has no slug', () => {
        expect(mochottArticleUrl({ uri, slug: null, author })).toBe('https://mochott.site/them.test/3abc');
    });
});

describe('mochottMinisiteUrl', () => {
    it('uses the custom domain, then the global slug, then the path under the author', () => {
        expect(mochottMinisiteUrl('them.test', { slug: 'pens', customDomain: 'pens.example.com' })).toBe('https://pens.example.com');
        expect(mochottMinisiteUrl('them.test', { slug: 'pens', globalSlug: 'penclub' })).toBe('https://mochott.site/penclub');
        expect(mochottMinisiteUrl('them.test', { slug: 'pens' })).toBe('https://mochott.site/them.test/s/pens');
    });
});

describe('mochottImageUrl', () => {
    it('turns a stored blob reference into the image endpoint and ignores anything else', () => {
        expect(mochottImageUrl(JSON.stringify({ ref: { $link: 'bafycover' } }), 'did:plc:them')).toBe('https://mochott.site/api/image/did:plc:them/bafycover');
        expect(mochottImageUrl('not json', 'did:plc:them')).toBeNull();
        expect(mochottImageUrl(null, 'did:plc:them')).toBeNull();
    });
});
