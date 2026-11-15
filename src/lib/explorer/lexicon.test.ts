import { describe, it, expect } from 'vitest';
import { fieldSchema, lexiconAuthorityDomain, validateRecord, type LexiconDoc, type Lexicons } from './lexicon';
import { parseInput } from './input';
import { classifyString, asBlobRef } from './values';
import { summarizeRecord } from './summary';
import { describePlcLog, type PlcAuditEntry } from './plc';

const post: LexiconDoc = {
    lexicon: 1,
    id: 'test.sample.post',
    defs: {
        main: {
            type: 'record',
            key: 'tid',
            record: {
                type: 'object',
                required: ['text', 'createdAt'],
                properties: {
                    text: { type: 'string', maxLength: 60, maxGraphemes: 5 },
                    createdAt: { type: 'string', format: 'datetime' },
                    count: { type: 'integer', minimum: 0, maximum: 10 },
                    tags: { type: 'array', maxLength: 2, items: { type: 'string', maxLength: 4 } },
                    embed: { type: 'union', closed: true, refs: ['#image', 'test.sample.defs#link'] },
                    reply: { type: 'ref', ref: 'test.sample.defs#link' },
                },
            },
        },
        image: { type: 'object', required: ['image'], properties: { image: { type: 'blob', accept: ['image/*'], maxSize: 100 } } },
    },
};

const defs: LexiconDoc = {
    lexicon: 1,
    id: 'test.sample.defs',
    defs: { link: { type: 'object', required: ['uri'], properties: { uri: { type: 'string', format: 'at-uri', description: 'target' } } } },
};

const lexicons: Lexicons = new Map([[post.id, post], [defs.id, defs]]);
const valid = { $type: 'test.sample.post', text: 'こんにちは', createdAt: '2026-01-01T00:00:00.000Z' };

describe('validateRecord', () => {
    it('accepts a valid record, counting graphemes rather than UTF-16 units', () => {
        expect(validateRecord({ ...valid, text: '👨‍👩‍👧‍👦👨‍👩‍👧‍👦' }, post.id, lexicons)).toEqual([]);
    });

    it('reports each kind of violation with the path of the field', () => {
        const issues = validateRecord({
            $type: 'test.sample.post',
            text: 'abcdefg',
            count: 11,
            tags: ['ok', 'toolong', 'x'],
            embed: { $type: 'test.sample.post#image', image: { $type: 'blob', ref: { $link: 'bafk' }, mimeType: 'video/mp4', size: 500 } },
            reply: { uri: 'https://example.com' },
        }, post.id, lexicons)!;
        expect(issues.map((issue) => `${issue.path}:${issue.code}`).sort()).toEqual([
            'count:range', 'createdAt:required', 'embed.image:mime', 'embed.image:size', 'reply.uri:format',
            'tags:max-length', 'tags[1]:max-length', 'text:max-graphemes',
        ]);
    });

    it('rejects an unlisted type in a closed union and a wrong $type', () => {
        expect(validateRecord({ ...valid, embed: { $type: 'other.thing' } }, post.id, lexicons)).toEqual([{ path: 'embed', code: 'union', detail: 'other.thing' }]);
        expect(validateRecord({ ...valid, $type: 'x.y.z' }, post.id, lexicons)?.[0]).toMatchObject({ path: '$type', code: 'const' });
    });

    it('returns undefined when the lexicon is not published', () => {
        expect(validateRecord(valid, 'unknown.lexicon.thing', lexicons)).toBeUndefined();
    });

    it('finds the schema of a nested field through refs and unions', () => {
        const record = { ...valid, embed: { $type: 'test.sample.defs#link', uri: 'at://did:plc:a/b.c.d/e' } };
        expect(fieldSchema(lexicons, post.id, ['embed', 'uri'], record)?.description).toBe('target');
        expect(fieldSchema(lexicons, post.id, ['tags', 0], record)?.maxLength).toBe(4);
        expect(fieldSchema(lexicons, post.id, ['nope'], record)).toBeUndefined();
    });

    it('derives the DNS authority from an NSID', () => {
        expect(lexiconAuthorityDomain('app.bsky.feed.post')).toBe('feed.bsky.app');
    });
});

describe('parseInput', () => {
    const cases: Array<[string, string | null]> = [
        ['at://did:plc:abc/app.bsky.feed.post/3k', '/atproto-viewer/did:plc:abc/app.bsky.feed.post/3k'],
        ['did:web:example.com', '/atproto-viewer/did:web:example.com'],
        ['@Alice.Example.com', '/atproto-viewer/alice.example.com'],
        ['alice.example.com/app.bsky.feed.like', '/atproto-viewer/alice.example.com/app.bsky.feed.like'],
        ['https://bsky.app/profile/alice.example.com/post/3kabc', '/atproto-viewer/alice.example.com/app.bsky.feed.post/3kabc'],
        ['https://bsky.app/profile/did:plc:abc/lists/3kabc', '/atproto-viewer/did:plc:abc/app.bsky.graph.list/3kabc'],
        ['https://bsky.app/starter-pack/alice.example.com/3kabc', '/atproto-viewer/alice.example.com/app.bsky.graph.starterpack/3kabc'],
        ['https://pds.ls/at://did:plc:abc/app.bsky.feed.post/3k', '/atproto-viewer/did:plc:abc/app.bsky.feed.post/3k'],
        ['https://pds.example.com', '/atproto-viewer/pds/pds.example.com'],
        ['pds:https://pds.example.com/', '/atproto-viewer/pds/pds.example.com'],
        ['lex:app.bsky.feed.post', '/atproto-viewer/lexicon/app.bsky.feed.post'],
        ['app.bsky.feed.getTimeline', '/atproto-viewer/lexicon/app.bsky.feed.getTimeline'],
        ['at%3A%2F%2Fdid%3Aplc%3Aabc', '/atproto-viewer/did:plc:abc'],
        ['https://bsky.app/search?q=x', null],
        ['hello world', null],
        ['', null],
    ];
    for (const [input, path] of cases) {
        it(`${input || '(empty)'} → ${path}`, () => {
            expect(parseInput(input)?.path ?? null).toBe(path);
        });
    }

    it('marks a handle that could also be an NSID as ambiguous', () => {
        expect(parseInput('app.bsky.feed.post')).toMatchObject({ kind: 'repo', ambiguous: true });
        expect(parseInput('alice.com')?.ambiguous).toBeFalsy();
    });
});

describe('values and summary', () => {
    it('classifies strings by what they can link to', () => {
        expect(classifyString('at://did:plc:abc/a.b.c/1')).toBe('at-uri');
        expect(classifyString('did:plc:abc')).toBe('did');
        expect(classifyString('app.bsky.feed.post', '$type')).toBe('nsid');
        expect(classifyString('app.bsky.feed.post', 'text')).toBe('text');
        expect(classifyString('2026-01-01T00:00:00.000Z')).toBe('datetime');
        expect(classifyString('bafyreicnapgt57szpox6rtsygwuoit5w724e5t3t2k3o3mosq4t4v47754')).toBe('cid');
        expect(classifyString('did: not a did')).toBe('text');
    });

    it('recognises both blob encodings', () => {
        expect(asBlobRef({ $type: 'blob', ref: { $link: 'bafk' }, mimeType: 'image/png', size: 3 })).toEqual({ cid: 'bafk', mimeType: 'image/png', size: 3 });
        expect(asBlobRef({ cid: 'bafk', mimeType: 'image/png' })).toEqual({ cid: 'bafk', mimeType: 'image/png' });
        expect(asBlobRef({ cid: 'bafk', mimeType: 'image/png', uri: 'x' })).toBeNull();
    });

    it('summarises records by text and reference', () => {
        expect(summarizeRecord({ $type: 'a.b.c', text: ' hello\n world ', createdAt: '2026-01-01T00:00:00Z' })).toMatchObject({ text: 'hello world', createdAt: '2026-01-01T00:00:00Z' });
        expect(summarizeRecord({ subject: { uri: 'at://did:plc:a/app.bsky.feed.post/1', cid: 'x' } }).ref).toBe('at://did:plc:a/app.bsky.feed.post/1');
        expect(summarizeRecord({ subject: 'did:plc:a' }).ref).toBe('did:plc:a');
        expect(summarizeRecord({ $type: 'a.b.c', count: 3 }).text).toBe('count: 3');
    });
});

describe('describePlcLog', () => {
    const entry = (cid: string, prev: string | null, operation: Record<string, unknown>, nullified = false): PlcAuditEntry => ({
        did: 'did:plc:abc', cid, nullified, createdAt: '2026-01-01T00:00:00.000Z',
        operation: { type: 'plc_operation', prev, sig: '', ...operation } as PlcAuditEntry['operation'],
    });

    it('turns consecutive operations into the changes a person would name', async () => {
        const base = { rotationKeys: ['did:key:r1'], verificationMethods: { atproto: 'did:key:s1' }, alsoKnownAs: ['at://old.example.com'], services: { atproto_pds: { type: 'AtprotoPersonalDataServer', endpoint: 'https://a.example' } } };
        const items = await describePlcLog([
            entry('c1', null, base),
            entry('c2', 'c1', { ...base, alsoKnownAs: ['at://new.example.com'] }),
            entry('c3', 'c2', { ...base, alsoKnownAs: ['at://new.example.com'], services: { atproto_pds: { type: 'AtprotoPersonalDataServer', endpoint: 'https://b.example' } }, rotationKeys: ['did:key:r1', 'did:key:r2'] }),
            entry('c4', 'c3', { type: 'plc_tombstone' }),
        ]);
        expect(items[0].changes.map((change) => change.kind)).toEqual(['created', 'handle-added', 'service-added']);
        expect(items[1].changes).toEqual([{ kind: 'handle-changed', from: 'old.example.com', to: 'new.example.com' }]);
        expect(items[2].changes).toEqual([
            { kind: 'service-changed', name: 'atproto_pds', from: 'https://a.example', to: 'https://b.example' },
            { kind: 'rotation-added', value: 'did:key:r2' },
        ]);
        expect(items[3].changes).toEqual([{ kind: 'tombstone' }]);
        expect(items[0].signature).toBe('unknown');
    });

    it('reads the legacy create operation', async () => {
        const items = await describePlcLog([entry('c1', null, { type: 'create', signingKey: 'did:key:s', recoveryKey: 'did:key:r', handle: 'a.example.com', service: 'https://pds.example' })]);
        expect(items[0].changes).toEqual([
            { kind: 'created' },
            { kind: 'handle-added', value: 'a.example.com' },
            { kind: 'service-added', name: 'atproto_pds', value: 'https://pds.example' },
        ]);
    });
});
