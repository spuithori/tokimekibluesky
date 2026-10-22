import { describe, expect, it, vi } from 'vitest';
import type { Agent } from '$lib/agent';
import { loadOwnProfileLinks, sameProfileLinks, writeProfileLinks } from './repo';
import type { ProfileLink } from './rules';

const DID = 'did:plc:me';
const uri = (rkey: string) => `at://${DID}/app.bsky.actor.link/${rkey}`;

function fakeAgent(handlers: { get?: (nsid: string, params: any) => any; post?: (nsid: string, input: any) => any }) {
    const get = vi.fn(async (nsid: string, params: any) => handlers.get?.(nsid, params));
    const post = vi.fn(async (nsid: string, input: any) => handlers.post?.(nsid, input));
    return { agent: { did: () => DID, xrpc: { get, post } } as unknown as Agent, get, post };
}

describe('writeProfileLinks', () => {
    const kept: ProfileLink = { url: 'https://kept.example/', uri: uri('k'), cid: 'ck' };
    const edited: ProfileLink = { url: 'https://edited.example/', uri: uri('e'), cid: 'ce', title: 'Old' };
    const removed: ProfileLink = { url: 'https://removed.example/', uri: uri('r'), cid: 'cr' };

    it('reuses unchanged records and writes the rest in one batch, keeping display order', async () => {
        const { agent, post } = fakeAgent({
            post: (_nsid, input) => ({
                results: input.writes.map((w: any, i: number) => ({ uri: w.rkey ? uri(w.rkey) : uri(`new${i}`), cid: `n${i}` })),
            }),
        });
        const next = [{ url: 'https://new.example/' }, kept, { ...edited, title: 'New' }];
        const { refs } = await writeProfileLinks(agent, next, [kept, edited, removed]);

        expect(post).toHaveBeenCalledTimes(1);
        const writes = post.mock.calls[0][1].writes;
        expect(writes.map((w: any) => w.$type)).toEqual(['com.atproto.repo.applyWrites#create', 'com.atproto.repo.applyWrites#update']);
        expect(writes[1]).toMatchObject({ rkey: 'e', value: { url: 'https://edited.example/', title: 'New' } });
        expect(refs).toEqual([
            { uri: uri('new0'), cid: 'n0' },
            { uri: uri('k'), cid: 'ck' },
            { uri: uri('e'), cid: 'n1' },
        ]);
    });

    it('deletes only removed links after saving, and only new links on rollback', async () => {
        const { agent, post } = fakeAgent({ post: () => ({ results: [{ uri: uri('n'), cid: 'cn' }] }) });
        const { deleteRemoved, deleteCreated } = await writeProfileLinks(agent, [kept, { url: 'https://new.example/' }], [kept, removed]);

        await deleteRemoved();
        expect(post.mock.calls[1][1].writes).toEqual([{ $type: 'com.atproto.repo.applyWrites#delete', collection: 'app.bsky.actor.link', rkey: 'r' }]);
        await deleteCreated();
        expect(post.mock.calls[2][1].writes).toEqual([{ $type: 'com.atproto.repo.applyWrites#delete', collection: 'app.bsky.actor.link', rkey: 'n' }]);
    });

    it('makes no request when nothing changed', async () => {
        const { agent, post } = fakeAgent({});
        const { refs, deleteRemoved } = await writeProfileLinks(agent, [kept], [kept]);
        await deleteRemoved();
        expect(post).not.toHaveBeenCalled();
        expect(refs).toEqual([{ uri: uri('k'), cid: 'ck' }]);
        expect(sameProfileLinks([kept], [kept])).toBe(true);
    });
});

describe('loadOwnProfileLinks', () => {
    it('reads the links in the order the profile lists them, fetching refs missing from the listed page', async () => {
        const { agent, get } = fakeAgent({
            get: (nsid, params) => {
                if (nsid === 'com.atproto.repo.listRecords') {
                    return { records: [{ uri: uri('1'), cid: 'c1', value: { url: 'https://one.example/' } }], cursor: 'more' };
                }
                if (params.collection === 'app.bsky.actor.profile') {
                    return { uri: '', value: { links: [{ uri: uri('2'), cid: 'c2' }, { uri: uri('1'), cid: 'c1' }] } };
                }
                return { uri: uri(params.rkey), cid: 'c2', value: { url: 'https://two.example/' } };
            },
        });
        const own = await loadOwnProfileLinks(agent);
        expect(own.links.map(link => link.url)).toEqual(['https://two.example/', 'https://one.example/']);
        expect(get).toHaveBeenCalledTimes(3);
    });

    it('treats a missing profile record as no links', async () => {
        const { agent } = fakeAgent({
            get: nsid => {
                if (nsid === 'com.atproto.repo.listRecords') return { records: [] };
                throw Object.assign(new Error('not found'), { error: 'RecordNotFound' });
            },
        });
        await expect(loadOwnProfileLinks(agent)).resolves.toEqual({ refs: undefined, links: [] });
    });
});
