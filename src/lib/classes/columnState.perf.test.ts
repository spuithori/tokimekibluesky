import { describe, it, expect, vi } from "vitest";

// --- cut heavy import chains (Dexie / $app/navigation / Worker) -------------
vi.mock("$lib/db", () => ({
    accountsDb: {
        profiles: {
            get: () => Promise.resolve(null),
            update: () => Promise.resolve(),
        },
    },
}));
vi.mock("$lib/classes/appState.svelte", () => ({
    appState: { profile: { current: 1 }, labelDefs: { current: [] } },
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

// --- fixtures ---------------------------------------------------------------
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

// ===========================================================================
// #8 correctness — updateLike semantics MUST be preserved by the optimization
// ===========================================================================
describe("#8 updateLike correctness (real ColumnState)", () => {
    it("patches a single matching post (count + viewer)", () => {
        const { cs, cleanup } = createRealColumnState();
        addColumn(cs, "colA", [post("at://x"), post("at://y")]);

        cs.updateLike({ uri: "at://x", did: "did:plc:viewer", count: 42, viewer: "at://like/1" });

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

        cs.updateLike({ uri: target, did: "did:plc:viewer", count: 99, viewer: "at://like/2" });

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
        cs.updateLike({ uri: "at://nomatch", did: "did:plc:viewer", count: 7, viewer: "x" });
        const after = cs.getFeed("colA");

        expect(after).toBe(before); // same reference => no needless re-render/alloc
        cleanup();
    });
});

// ===========================================================================
// #7 reactivity granularity — cross-column over-invalidation
// ===========================================================================
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

        // The current pattern (single $state.raw object) over-invalidates everything.
        expect(legacy.cross).toBe(expectedCrossWhenCoarse);
        // A naive Map with whole-map reassignment does NOT help.
        expect(mapReassign.cross).toBe(expectedCrossWhenCoarse);
        // Only SvelteMap (per-key tracking) isolates updates.
        expect(svelteMap.cross).toBe(0);

        // The real class target: ZERO cross-column reruns after the #7 refactor.
        // (On the pre-refactor code this is `expectedCrossWhenCoarse`.)
        expect(real.cross).toBe(0);
        // Self updates must still be observed.
        expect(real.self).toBe(K);
    });
});

// ===========================================================================
// #8 allocation cost — throwaway arrays when a like misses a column
// ===========================================================================
describe("#8 allocation cost (map-always vs scan-then-copy)", () => {
    it("counts arrays allocated when the liked post is in 1 of N columns", () => {
        let allocCount = 0;

        function legacyUpdate(feed: any[], target: string) {
            let mutated = false;
            allocCount++; // .map always allocates a new array
            const next = feed.map((it) =>
                it.post.uri === target ? { ...it, post: { ...it.post, likeCount: 99 } } : it,
            );
            return mutated ? next : feed;
        }
        function newUpdate(feed: any[], target: string) {
            let has = false;
            for (let i = 0; i < feed.length; i++) {
                if (feed[i].post.uri === target) { has = true; break; }
            }
            if (!has) return feed; // no allocation on a miss
            allocCount++;
            return feed.map((it) =>
                it.post.uri === target ? { ...it, post: { ...it.post, likeCount: 99 } } : it,
            );
        }

        const N = 10, M = 200, L = 500;
        const feeds = Array.from({ length: N }, (_, c) =>
            Array.from({ length: M }, (_, i) => post(`c${c}-i${i}`)),
        );
        const target = "c0-i0"; // present only in column 0

        allocCount = 0;
        let t = performance.now();
        for (let l = 0; l < L; l++) for (let c = 0; c < N; c++) legacyUpdate(feeds[c], target);
        const legacyAllocs = allocCount;
        const legacyTime = performance.now() - t;

        allocCount = 0;
        t = performance.now();
        for (let l = 0; l < L; l++) for (let c = 0; c < N; c++) newUpdate(feeds[c], target);
        const newAllocs = allocCount;
        const newTime = performance.now() - t;

        console.log("#8 allocations/time (N=10, M=200, L=500 likes):", {
            legacyAllocs,
            newAllocs,
            legacyMs: +legacyTime.toFixed(1),
            newMs: +newTime.toFixed(1),
        });

        expect(legacyAllocs).toBe(N * L); // every column maps
        expect(newAllocs).toBe(L); // only the matching column maps
    });
});

// ===========================================================================
// WeakMap GC significance — informs per-item memo caches (#9 / #11)
// ===========================================================================
describe("WeakMap GC significance (per-item memo cache)", () => {
    it("Map keyed by uri leaks across feed churn; WeakMap keyed by item does not retain dropped items", () => {
        const mapCache = new Map<string, any>();
        const weakCache = new WeakMap<object, any>();
        const ROUNDS = 50, PER = 200;
        let live: any[] = [];

        for (let r = 0; r < ROUNDS; r++) {
            live = []; // previous round's items lose their only strong reference
            for (let i = 0; i < PER; i++) {
                const item = { uri: `r${r}-i${i}` };
                live.push(item);
                mapCache.set(item.uri, { moderation: "computed" }); // never freed
                weakCache.set(item, { moderation: "computed" }); // freed with the item
            }
        }

        // The string-keyed Map retains EVERY item ever seen (unbounded leak).
        expect(mapCache.size).toBe(ROUNDS * PER);

        // The WeakMap only strongly relates to currently-reachable items.
        let reachable = 0;
        for (const it of live) if (weakCache.has(it)) reachable++;
        expect(reachable).toBe(PER);

        console.log("WeakMap GC: Map retained", mapCache.size, "entries (unbounded leak); WeakMap reachable:", reachable, "(rest collectible)");
    });

    it("measures retained heap with gc when available (informational)", () => {
        const gc = (globalThis as any).gc;
        if (typeof gc !== "function") {
            console.log("WeakMap GC heap: gc not exposed (run with --expose-gc for numbers)");
            return;
        }

        function churn(useWeak: boolean) {
            const cache: any = useWeak ? new WeakMap() : new Map();
            let live: any[] = [];
            const ROUNDS = 100, PER = 500;
            for (let r = 0; r < ROUNDS; r++) {
                live = [];
                for (let i = 0; i < PER; i++) {
                    const item = { uri: `r${r}-i${i}`, payload: new Array(20).fill(0) };
                    live.push(item);
                    cache.set(useWeak ? item : item.uri, { m: new Array(20).fill(0) });
                }
            }
            return { cache, live };
        }

        gc();
        const base = process.memoryUsage().heapUsed;
        const weak = churn(true);
        gc();
        const weakHeap = process.memoryUsage().heapUsed - base;

        gc();
        const base2 = process.memoryUsage().heapUsed;
        const strong = churn(false);
        gc();
        const mapHeap = process.memoryUsage().heapUsed - base2;

        void weak; void strong;
        console.log("WeakMap GC heap retained (kB):", {
            weakMap: Math.round(weakHeap / 1024),
            map: Math.round(mapHeap / 1024),
        });
        expect(weakHeap).toBeLessThan(mapHeap);
    });
});
