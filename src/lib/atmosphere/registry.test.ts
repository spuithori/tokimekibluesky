import { describe, expect, it } from 'vitest';
import {
    ATMOSPHERE_SERVICE_COLLECTION,
    blobCid,
    parseListedServices,
    isServiceRecord,
    handleFromDidDocument,
    localizeService,
    parseAtUri,
    pickLocalized,
    screenshotViews,
    servicePath,
} from './registry';

const record = {
    name: 'Example',
    tagline: 'Short line',
    description: 'Default description',
    localized: [
        { lang: 'ja', description: '日本語の説明' },
        { lang: 'pt-BR', name: 'Exemplo', tagline: 'Linha', description: 'Descrição' },
    ],
    url: 'https://example.com/',
    icon: { $type: 'blob' as const, ref: { $link: 'bafyicon' }, mimeType: 'image/png' },
    screenshots: [
        { image: { $type: 'blob' as const, ref: { $link: 'bafyshot1' }, mimeType: 'image/webp' }, alt: 'Home', aspectRatio: { width: 1600, height: 1000 } },
        { image: { $type: 'blob' as const, ref: { $link: 'bafyshot2' }, mimeType: 'image/webp' }, aspectRatio: { width: 0, height: 10 } },
        { image: { $type: 'blob' as const, mimeType: 'image/webp' } },
    ],
    category: 'blog',
    createdAt: '2026-09-02T00:00:00.000Z',
};
const entry = { uri: 'at://did:plc:abc/tech.tokimeki.atmosphere.service/y', did: 'did:plc:abc', rkey: 'y', pds: 'https://pds.example', handle: 'alice.example', record };

describe('parseAtUri', () => {
    it('parses did:plc and did:web uris', () => {
        expect(parseAtUri('at://did:plc:abc123/tech.tokimeki.atmosphere.service/3kabc')).toEqual({
            did: 'did:plc:abc123', collection: 'tech.tokimeki.atmosphere.service', rkey: '3kabc',
        });
        expect(parseAtUri('at://did:web:example.com/tech.tokimeki.atmosphere.service/self')?.did).toBe('did:web:example.com');
    });

    it('rejects handles, malformed and non-string input', () => {
        expect(parseAtUri('at://alice.example/tech.tokimeki.atmosphere.service/x')).toBeNull();
        expect(parseAtUri('https://example.com')).toBeNull();
        expect(parseAtUri(null)).toBeNull();
    });
});

describe('pickLocalized', () => {
    it('prefers exact locale, then language prefix, then default', () => {
        expect(pickLocalized(record, 'pt-BR')).toEqual({ name: 'Exemplo', tagline: 'Linha', description: 'Descrição' });
        expect(pickLocalized(record, 'ja-JP')).toEqual({ name: 'Example', tagline: 'Short line', description: '日本語の説明' });
        expect(pickLocalized(record, 'fr')).toEqual({ name: 'Example', tagline: 'Short line', description: 'Default description' });
        expect(pickLocalized(record, undefined)).toEqual({ name: 'Example', tagline: 'Short line', description: 'Default description' });
    });

    it('falls back per field when a localized field is blank', () => {
        expect(pickLocalized({ ...record, localized: [{ lang: 'ja', name: '  ' }] }, 'ja')).toEqual({ name: 'Example', tagline: 'Short line', description: 'Default description' });
    });
});

describe('isServiceRecord', () => {
    it('requires name, description and an http(s) url', () => {
        expect(isServiceRecord(record)).toBe(true);
        expect(isServiceRecord({ ...record, url: 'javascript:alert(1)' })).toBe(false);
        expect(isServiceRecord({ ...record, name: ' ' })).toBe(false);
        expect(isServiceRecord(null)).toBe(false);
    });
});

describe('blobCid / localizeService', () => {
    it('reads JSON blob refs and legacy cid fields', () => {
        expect(blobCid(record.icon)).toBe('bafyicon');
        expect(blobCid({ cid: 'bafylegacy', mimeType: 'image/png' })).toBe('bafylegacy');
        expect(blobCid(undefined)).toBeNull();
    });

    it('builds a PDS getBlob icon url', () => {
        const service = localizeService(entry, 'ja');
        expect(service.iconUrl).toBe('https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aabc&cid=bafyicon');
        expect(service.description).toBe('日本語の説明');
        expect(service.category).toBe('blog');
        expect(service.handle).toBe('alice.example');
        expect(localizeService({ ...entry, record: { ...record, icon: undefined } }, 'en').iconUrl).toBeNull();
    });
});

describe('screenshotViews', () => {
    it('maps screenshots with cids and validates aspect ratios', () => {
        const views = screenshotViews(entry);
        expect(views).toHaveLength(2);
        expect(views[0]).toEqual({ url: 'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aabc&cid=bafyshot1', alt: 'Home', width: 1600, height: 1000 });
        expect(views[1]).toEqual({ url: 'https://pds.example/xrpc/com.atproto.sync.getBlob?did=did%3Aplc%3Aabc&cid=bafyshot2', alt: '', width: null, height: null });
        expect(screenshotViews({ ...entry, record: { ...record, screenshots: undefined } })).toEqual([]);
    });
});

describe('handleFromDidDocument / servicePath', () => {
    it('extracts the at:// handle and builds a detail path with the raw did', () => {
        expect(handleFromDidDocument({ alsoKnownAs: ['https://x', 'at://alice.example'] })).toBe('alice.example');
        expect(handleFromDidDocument({})).toBeNull();
        expect(servicePath('did:plc:abc', '3kabc')).toBe('/atmosphere/did:plc:abc/3kabc');
    });
});

describe('parseListedServices', () => {
    it('keeps unique service rows with a usable pds and drops the rest', () => {
        const a = `at://did:plc:a/${ATMOSPHERE_SERVICE_COLLECTION}/1`;
        const b = `at://did:plc:b/${ATMOSPHERE_SERVICE_COLLECTION}/2`;
        const rows = parseListedServices({ services: [
            { uri: a, pds: 'https://pds.a/', host: 'a.example', handle: 'a.example', verifiedBy: 'handle', createdAt: '2026-09-02T00:00:00Z' },
            { uri: 'at://did:plc:a/app.bsky.feed.post/1', pds: 'https://pds.a' },
            { uri: b, pds: 'https://pds.b' },
            { uri: a, pds: 'https://pds.a' },
            { uri: 'at://did:plc:c/tech.tokimeki.atmosphere.service/3' },
        ] });
        expect(rows.map((r) => r.uri)).toEqual([a, b]);
        expect(rows[0]).toMatchObject({ did: 'did:plc:a', rkey: '1', pds: 'https://pds.a', handle: 'a.example', verifiedBy: 'handle', visible: true });
        expect(rows[1].handle).toBeNull();
        expect(parseListedServices(null)).toEqual([]);
        expect(parseListedServices({ services: 'x' })).toEqual([]);
    });
});
