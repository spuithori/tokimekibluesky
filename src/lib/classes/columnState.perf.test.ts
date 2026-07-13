import { describe, it, expect, vi } from "vitest";

vi.mock("$lib/db", () => ({
    accountsDb: {
        profiles: {
            get: () => Promise.resolve(null),
            update: () => Promise.resolve(),
        },
    },
}));
vi.mock("$lib/classes/appState.svelte", () => ({
    appState: { profile: { current: 1 }, labelDefs: { current: [] }, registerHandleListener: () => () => {}, getFreshHandle: () => undefined },
}));
vi.mock("$lib/classes/settingsState.svelte", () => ({
    settingsState: { settings: { markedUnread: false } },
}));

import {
    LegacyFeeds,
    MapFeeds,
    SvelteMapFeeds,
    measureIsolation,
    createRealColumnState,
    measureRealIsolation,
} from "$lib/classes/columnState.perf.harness.svelte";

function post(uri: string, opts: any = {}) {
    return {
        post: {
            uri,
            cid: uri + "#cid",
            author: { did: opts.authorDid ?? "did:plc:author" },
            likeCount: opts.likeCount ?? 0,
            repostCount: opts.repostCount ?? 0,
            viewer: {},
        },
        ...(opts.reply ? { reply: opts.reply } : {}),
    };
}

function addColumn(cs: any, id: string, feed: any[]) {
    cs.add({
        id,
        algorithm: { type: "default" },
        did: "did:plc:viewer",
        data: { feed, cursor: "" },
    });
}

describe("#8 updateLike correctness (real ColumnState)", () => {
    it("patches a single matching post (count + viewer)", () => {
        const { cs, cleanup } = createRealColumnState();
        addColumn(cs, "colA", [post("at://x"), post("at://y")]);

        cs.updateLike({
            uri: "at://x",
            did: "did:plc:viewer",
            count: 42,
            viewer: "at://like/1",
        });

        const feed = cs.getFeed("colA");
        expect(feed[0].post.likeCount).toBe(42);
        expect(feed[0].post.viewer.like).toBe("at://like/1");
        expect(feed[1].post.likeCount).toBe(0); // untouched
        cleanup();
    });

    it("patches ALL matches in one feed (post + reply.parent + reply.root)", () => {
        const { cs, cleanup } = createRealColumnState();
        const target = "at://target";
        const replyItem = post("at://child", {
            reply: {
                parent: { uri: target, likeCount: 1, viewer: {} },
                root: { uri: target, likeCount: 1, viewer: {} },
            },
        });
        addColumn(cs, "colA", [post(target), replyItem]);

        cs.updateLike({
            uri: target,
            did: "did:plc:viewer",
            count: 99,
            viewer: "at://like/2",
        });

        const feed = cs.getFeed("colA");
        expect(feed[0].post.likeCount).toBe(99); // the post itself
        expect(feed[1].reply.parent.likeCount).toBe(99); // embedded reply.parent
        expect(feed[1].reply.root.likeCount).toBe(99); // embedded reply.root
        cleanup();
    });

    it("leaves the feed array reference UNCHANGED when nothing matches", () => {
        const { cs, cleanup } = createRealColumnState();
        addColumn(cs, "colA", [post("at://a"), post("at://b")]);

        const before = cs.getFeed("colA");
        cs.updateLike({
            uri: "at://nomatch",
            did: "did:plc:viewer",
            count: 7,
            viewer: "x",
        });
        const after = cs.getFeed("colA");

        expect(after).toBe(before); // same reference => no needless re-render/alloc
        cleanup();
    });
});

describe("#7 feed signal granularity (cross-column invalidation)", () => {
    it("compares $state.raw object vs Map-reassign vs SvelteMap vs real class", () => {
        const keys = Array.from({ length: 8 }, (_, i) => `col${i}`);
        const K = 5;
        const expectedCrossWhenCoarse = (keys.length - 1) * K; // 35

        const legacy = measureIsolation(new LegacyFeeds(), keys, K);
        const mapReassign = measureIsolation(new MapFeeds(), keys, K);
        const svelteMap = measureIsolation(new SvelteMapFeeds(), keys, K);

        const { cs, cleanup } = createRealColumnState();
        const real = measureRealIsolation(cs, keys, K);
        cleanup();

        console.log("#7 cross-column reruns (N=8, K=5):", {
            legacy_$state_raw: legacy,
            map_reassign: mapReassign,
            svelteMap: svelteMap,
            realColumnState: real,
        });

        expect(legacy.cross).toBe(expectedCrossWhenCoarse);
        expect(mapReassign.cross).toBe(expectedCrossWhenCoarse);
        expect(svelteMap.cross).toBe(0);
        expect(real.cross).toBe(0);
        expect(real.self).toBe(K);
    });
});
