import { describe, it, expect, vi } from 'vitest';
import { RefResolver, refKey } from './resolver.svelte';
import { describeRecord, loadPreview, postEmbedView, previewTarget } from './preview';
import { KNOWN_APPS, domainOf, findApp, namespaceOf } from './apps';

const profile = (did: string, handle: string) => ({ did, handle, displayName: handle.toUpperCase(), avatar: `https://cdn.example/${did}` });
const postView = (uri: string, text: string) => ({ uri, cid: 'cid', author: profile('did:plc:author', 'author.test'), record: { $type: 'app.bsky.feed.post', text }, indexedAt: '2026-01-01T00:00:00Z' });

function makeXrpc(handlers: Record<string, (params: any) => any>) {
    const get = vi.fn(async (nsid: string, params: any) => handlers[nsid](params));
    return { get } as any;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('refKey', () => {
    it('keeps posts as posts and reduces every other reference to its owner', () => {
        expect(refKey('did:plc:abc')).toBe('did:plc:abc');
        expect(refKey('at://did:plc:abc/app.bsky.feed.post/3k')).toBe('at://did:plc:abc/app.bsky.feed.post/3k');
        expect(refKey('at://did:plc:abc/app.bsky.graph.list/3k')).toBe('did:plc:abc');
        expect(refKey('at://alice.test/app.bsky.feed.post/3k')).toBe('alice.test');
        expect(refKey('https://example.com')).toBeUndefined();
    });
});

describe('RefResolver', () => {
    it('collects the requests of one tick into batches of 25 and asks for each key once', async () => {
        const xrpc = makeXrpc({
            'app.bsky.actor.getProfiles': ({ actors }) => ({ profiles: actors.map((did: string) => profile(did, did.slice(8) + '.test')) }),
            'app.bsky.feed.getPosts': ({ uris }) => ({ posts: uris.map((uri: string) => postView(uri, 'hello\nworld')) }),
        });
        const resolver = new RefResolver(xrpc, new AbortController().signal);
        for (let i = 0; i < 30; i++) resolver.request(`did:plc:user${i}`);
        resolver.request('did:plc:user0');
        resolver.request('at://did:plc:author/app.bsky.feed.post/3k');
        await flush();

        const calls = xrpc.get.mock.calls.map(([nsid, params]: [string, any]) => [nsid, (params.actors ?? params.uris).length]);
        expect(calls).toEqual([['app.bsky.actor.getProfiles', 25], ['app.bsky.actor.getProfiles', 5], ['app.bsky.feed.getPosts', 1]]);
        expect(resolver.get('did:plc:user7')).toMatchObject({ kind: 'actor', handle: 'user7.test' });
        expect(resolver.get('at://did:plc:author/app.bsky.feed.post/3k')).toMatchObject({ kind: 'post', text: 'hello world' });

        resolver.request('did:plc:user7');
        await flush();
        expect(xrpc.get).toHaveBeenCalledTimes(3);
    });

    it('marks what the AppView does not return, and what fails, as missing instead of asking again', async () => {
        const xrpc = makeXrpc({
            'app.bsky.actor.getProfiles': () => ({ profiles: [] }),
            'app.bsky.feed.getPosts': () => { throw new Error('boom'); },
        });
        const resolver = new RefResolver(xrpc, new AbortController().signal);
        resolver.request('did:plc:gone');
        resolver.request('at://did:plc:gone/app.bsky.feed.post/3k');
        await flush();
        expect(resolver.get('did:plc:gone')).toEqual({ kind: 'missing' });
        expect(resolver.get('at://did:plc:gone/app.bsky.feed.post/3k')).toEqual({ kind: 'missing' });
        resolver.request('did:plc:gone');
        await flush();
        expect(xrpc.get).toHaveBeenCalledTimes(2);
    });
});

describe('preview', () => {
    it('chooses the record itself for viewable types and the reference otherwise', () => {
        expect(previewTarget('at://did:plc:a/app.bsky.feed.post/1', 'app.bsky.feed.post', { text: 'x' })).toEqual({ ref: 'at://did:plc:a/app.bsky.feed.post/1', reference: false });
        expect(previewTarget('at://did:plc:a/app.bsky.actor.profile/self', 'app.bsky.actor.profile', {})).toEqual({ ref: 'did:plc:a', reference: false });
        expect(previewTarget('at://did:plc:a/app.bsky.graph.follow/1', 'app.bsky.graph.follow', { subject: 'did:plc:b' })).toEqual({ ref: 'did:plc:b', reference: true });
        expect(previewTarget('at://did:plc:a/com.example.note/1', 'com.example.note', { title: 'x' })).toBeUndefined();
    });

    it('reuses what the list already resolved without another request', async () => {
        const xrpc = makeXrpc({});
        const known = { kind: 'post' as const, uri: 'u', text: 't', author: { kind: 'actor' as const, did: 'd', handle: 'h' }, view: postView('u', 't') };
        const preview = await loadPreview(xrpc, { ref: 'u', reference: true }, known, new AbortController().signal);
        expect(preview).toMatchObject({ kind: 'embed', reference: true, view: { $type: 'app.bsky.embed.record#viewRecord', value: { text: 't' }, embeds: [] } });
        expect(xrpc.get).not.toHaveBeenCalled();
    });

    it('fetches the matching view per type and returns nothing when the AppView has none or fails', async () => {
        const xrpc = makeXrpc({
            'app.bsky.graph.getList': () => ({ list: { uri: 'l', name: 'List' } }),
            'app.bsky.feed.getPosts': () => ({ posts: [] }),
            'app.bsky.actor.getProfile': () => { throw new Error('down'); },
        });
        const signal = new AbortController().signal;
        expect(await loadPreview(xrpc, { ref: 'at://did:plc:a/app.bsky.graph.list/1', reference: false }, undefined, signal)).toMatchObject({ kind: 'embed', view: { $type: 'app.bsky.graph.defs#listView', name: 'List' } });
        expect(await loadPreview(xrpc, { ref: 'at://did:plc:a/app.bsky.feed.post/1', reference: false }, undefined, signal)).toBeUndefined();
        expect(await loadPreview(xrpc, { ref: 'did:plc:a', reference: true }, undefined, signal)).toBeUndefined();
    });

    it('shapes a post view the way the embed component reads it', () => {
        const view = postEmbedView({ ...postView('u', 't'), embed: { $type: 'app.bsky.embed.images#view' } });
        expect(view.embeds).toEqual([{ $type: 'app.bsky.embed.images#view' }]);
        expect(view.value).toEqual({ $type: 'app.bsky.feed.post', text: 't' });
    });

    it('builds a card from what a record of any lexicon carries, and none when it carries nothing readable', () => {
        const blob = { $type: 'blob', ref: { $link: 'bafk1' }, mimeType: 'image/png', size: 1 };
        expect(describeRecord({ title: 'Hello', description: 'Body', url: 'https://example.com/a', cover: blob, attachment: { $type: 'blob', ref: { $link: 'bafk2' }, mimeType: 'application/pdf', size: 1 } }))
            .toEqual({ heading: 'Hello', text: 'Body', link: 'https://example.com/a', images: [{ cid: 'bafk1', mimeType: 'image/png', size: 1 }] });
        expect(describeRecord({ subject: 'did:plc:a', createdAt: '2026-01-01T00:00:00Z' })).toBeUndefined();
        expect(describeRecord({ url: 'javascript:alert(1)', name: 'x' })?.link).toBeUndefined();
    });
});

describe('apps', () => {
    it('names the app of a collection by the longest matching namespace', () => {
        expect(findApp('app.bsky.feed.post', KNOWN_APPS)?.app.name).toBe('Bluesky');
        expect(findApp('site.mochott.article', KNOWN_APPS)?.app.name).toBe('mochott');
        expect(findApp('sh.tangled.graph.follow', KNOWN_APPS)?.app.name).toBe('Tangled');
        expect(findApp('com.example.thing', KNOWN_APPS)).toBeUndefined();
    });

    it('keeps apps that share one authority apart', () => {
        expect(findApp('tech.tokimeki.poll.vote', KNOWN_APPS)?.app.name).toBe('TOKIMEKI Poll');
        expect(findApp('tech.tokimeki.kaku.post', KNOWN_APPS)?.app.name).toBe('KAKU');
        expect(findApp('tech.tokimeki.takibi.log', KNOWN_APPS)).toBeUndefined();
        expect(findApp('tech.tokimeki.pollution.x', KNOWN_APPS)).toBeUndefined();
        expect(namespaceOf('tech.tokimeki.takibi.log')).toBe('tech.tokimeki.takibi');
        expect(domainOf('tech.tokimeki.poll')).toBe('poll.tokimeki.tech');
    });
});
