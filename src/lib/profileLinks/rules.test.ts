import { describe, expect, it } from 'vitest';
import { linksFromProfileView, linksFromRecords, linkIconSrc, truncateTitle, validateLinkInput } from './rules';

const view = (url: string, extra: Record<string, unknown> = {}) => ({ uri: `at://did:plc:a/app.bsky.actor.link/${url.length}`, cid: 'c', url, ...extra });

describe('validateLinkInput', () => {
    it('turns a typed domain into an https link', () => {
        expect(validateLinkInput('ko-fi.com/name', [])).toEqual({ url: 'https://ko-fi.com/name' });
    });

    it('rejects links the AppView would leave out of profile views', () => {
        expect(validateLinkInput('http://example.com', []).error).toBe('insecure');
        expect(validateLinkInput('bit.ly/abc', []).error).toBe('shortener');
        expect(validateLinkInput('https://sub.tinyurl.com/x', []).error).toBe('shortener');
        expect(validateLinkInput('onlyfans.com/x', []).error).toBe('blocked');
        expect(validateLinkInput('localhost', []).error).toBe('invalid');
    });

    it('does not treat lookalike hosts as shorteners', () => {
        expect(validateLinkInput('notbit.ly', []).error).toBeUndefined();
    });

    it('catches a link already on the profile', () => {
        expect(validateLinkInput('example.com', ['https://example.com/']).error).toBe('duplicate');
    });
});

describe('linksFromProfileView', () => {
    it('keeps display order and leaves out links that would not be shown', () => {
        const links = linksFromProfileView([
            view('https://a.example/'),
            view('http://b.example/'),
            view('https://t.co/x'),
            view('https://a.example/'),
            view('https://c.example/', { title: '  C  ', icon: 'https://cdn/icon' }),
        ]);
        expect(links.map(link => link.url)).toEqual(['https://a.example/', 'https://c.example/']);
        expect(links[1]).toMatchObject({ title: 'C', iconUrl: 'https://cdn/icon' });
    });

    it('shows at most 10 links and skips hidden ones before counting', () => {
        const views = Array.from({ length: 12 }, (_, i) => view(`https://site${i}.example/`));
        const links = linksFromProfileView(views, v => v.url.includes('site0'));
        expect(links).toHaveLength(10);
        expect(links[0].url).toBe('https://site1.example/');
    });
});

describe('linksFromRecords', () => {
    it('follows the profile order and skips refs whose record is gone', () => {
        const refs = [
            { uri: 'at://did:plc:a/app.bsky.actor.link/2', cid: 'x' },
            { uri: 'at://did:plc:a/app.bsky.actor.link/gone', cid: 'y' },
            { uri: 'at://did:plc:a/app.bsky.actor.link/1', cid: 'z' },
        ];
        const icon = { $type: 'blob', ref: { $link: 'bafyicon' }, mimeType: 'image/png', size: 10 };
        const links = linksFromRecords(refs, [
            { uri: 'at://did:plc:a/app.bsky.actor.link/1', cid: 'c1', value: { url: 'https://one.example/' } },
            { uri: 'at://did:plc:a/app.bsky.actor.link/2', cid: 'c2', value: { url: 'https://two.example/', icon } },
        ]);
        expect(links.map(link => link.cid)).toEqual(['c2', 'c1']);
        expect(linkIconSrc(links[0], 'did:plc:a')).toBe('https://cdn.bsky.app/img/avatar_thumbnail/plain/did:plc:a/bafyicon@png');
    });
});

describe('truncateTitle', () => {
    it('never splits an emoji', () => {
        const title = '👨‍👩‍👧'.repeat(31);
        expect(truncateTitle(title)).toBe('👨‍👩‍👧'.repeat(30));
    });
});
