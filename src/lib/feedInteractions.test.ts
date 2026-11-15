import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Mod = typeof import('./feedInteractions');

const FEED = 'at://did:plc:creator/app.bsky.feed.generator/aaa';
const SERVICE = 'did:web:feeds.example';

function makeAgent(view: Record<string, unknown> | null = { did: SERVICE, acceptsInteractions: true }) {
    const post = vi.fn(async () => ({}));
    const get = vi.fn(async () => {
        if (!view) {
            throw new Error('boom');
        }
        return { view };
    });
    return { did: () => 'did:plc:viewer', xrpc: { get, post } } as any;
}

function item(n: number, extra: Record<string, unknown> = {}) {
    return { post: { uri: `at://did:plc:author/app.bsky.feed.post/${n}` }, ...extra };
}

describe('feedInteractions', () => {
    let mod: Mod;

    beforeEach(async () => {
        vi.resetModules();
        vi.useFakeTimers();
        mod = await import('./feedInteractions');
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('resolves the feed of an item from a custom column and from a custom source of a merge column', () => {
        expect(mod.interactionFeedUri({ algorithm: { type: 'custom', algorithm: FEED } }, item(1))).toBe(FEED);
        const merge = {
            algorithm: {
                type: 'merge',
                sources: [
                    { id: 'a', type: 'custom', algorithm: FEED },
                    { id: 'b', type: 'officialList', algorithm: 'at://did:plc:x/app.bsky.graph.list/l' },
                ],
            },
        };
        expect(mod.interactionFeedUri(merge, item(1, { __sourceId: 'a' }))).toBe(FEED);
        expect(mod.interactionFeedUri(merge, item(1, { __sourceId: 'b' }))).toBeUndefined();
        expect(mod.interactionFeedUri({ algorithm: { type: 'default' } }, item(1))).toBeUndefined();
    });

    it('asks the generator once and only targets feeds that accept interactions', async () => {
        const agent = makeAgent();
        const [a, b] = await Promise.all([
            mod.resolveInteractionTarget(agent, FEED),
            mod.resolveInteractionTarget(agent, FEED),
        ]);
        expect(a).toBe(SERVICE);
        expect(b).toBe(SERVICE);
        await mod.resolveInteractionTarget(agent, FEED);
        expect(agent.xrpc.get).toHaveBeenCalledTimes(1);

        const other = makeAgent({ did: SERVICE, acceptsInteractions: false });
        expect(await mod.resolveInteractionTarget(other, FEED + 'x')).toBeNull();
    });

    it('does not hammer the generator lookup after a failure', async () => {
        const agent = makeAgent(null);
        expect(await mod.resolveInteractionTarget(agent, FEED)).toBeNull();
        expect(await mod.resolveInteractionTarget(agent, FEED)).toBeNull();
        expect(agent.xrpc.get).toHaveBeenCalledTimes(1);
        vi.advanceTimersByTime(61_000);
        await mod.resolveInteractionTarget(agent, FEED);
        expect(agent.xrpc.get).toHaveBeenCalledTimes(2);
    });

    it('batches seen events, sends each post once and passes feedContext and reqId through', () => {
        const agent = makeAgent();
        mod.queueFeedInteraction(agent, FEED, SERVICE, item(1, { feedContext: 'ctx', reqId: 'r1' }), 'interactionSeen');
        mod.queueFeedInteraction(agent, FEED, SERVICE, item(1, { feedContext: 'ctx', reqId: 'r1' }), 'interactionSeen');
        mod.queueFeedInteraction(agent, FEED, SERVICE, item(2), 'interactionSeen');
        expect(agent.xrpc.post).not.toHaveBeenCalled();

        vi.advanceTimersByTime(10_000);
        expect(agent.xrpc.post).toHaveBeenCalledTimes(1);
        const [nsid, body, opts] = agent.xrpc.post.mock.calls[0];
        expect(nsid).toBe('app.bsky.feed.sendInteractions');
        expect(opts.headers['atproto-proxy']).toBe(`${SERVICE}#bsky_fg`);
        expect(body.interactions).toEqual([
            { item: item(1).post.uri, event: 'app.bsky.feed.defs#interactionSeen', feedContext: 'ctx', reqId: 'r1' },
            { item: item(2).post.uri, event: 'app.bsky.feed.defs#interactionSeen' },
        ]);

        mod.queueFeedInteraction(agent, FEED, SERVICE, item(1), 'interactionSeen');
        vi.advanceTimersByTime(10_000);
        expect(agent.xrpc.post).toHaveBeenCalledTimes(1);
    });

    it('sends requestLess right away and never sends ad items', () => {
        const agent = makeAgent();
        expect(mod.queueFeedInteraction(agent, FEED, SERVICE, item(1, { feedContext: 'ad:1' }), 'requestLess', true)).toBe(false);
        expect(agent.xrpc.post).not.toHaveBeenCalled();

        expect(mod.queueFeedInteraction(agent, FEED, SERVICE, item(2), 'requestLess', true)).toBe(true);
        expect(agent.xrpc.post).toHaveBeenCalledTimes(1);
        expect(agent.xrpc.post.mock.calls[0][1].interactions[0].event).toBe('app.bsky.feed.defs#requestLess');
    });

    it('splits a flush into requests of at most 200 interactions', () => {
        const agent = makeAgent();
        for (let i = 0; i < 450; i++) {
            mod.queueFeedInteraction(agent, FEED, SERVICE, item(i), 'interactionSeen');
        }
        mod.flushFeedInteractions();
        expect(agent.xrpc.post.mock.calls.map((c: any[]) => c[1].interactions.length)).toEqual([200, 200, 50]);
    });
});
