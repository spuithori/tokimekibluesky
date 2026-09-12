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

import { flushSync } from "svelte";
import { createRealColumnState, createRealDeckColumnState } from "$lib/classes/columnState.perf.harness.svelte";
import { soloFeedKey } from "$lib/merge/mergeSolo";

function post(uri: string) {
    return {
        post: {
            uri,
            cid: uri + "#cid",
            author: { did: "did:plc:author" },
            likeCount: 0,
            repostCount: 0,
            viewer: {},
        },
    };
}

function column(id: string, extra: Record<string, unknown> = {}) {
    return {
        id,
        algorithm: { type: "default" },
        did: "did:plc:viewer",
        settings: {},
        data: { feed: [], cursor: "" },
        ...extra,
    };
}

function hasFeed(cs: any, id: string): boolean {
    return cs._feeds.has(id);
}

describe("ghost feed guard", () => {
    it("drops late writes to a removed column instead of recreating its feed", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(column("a", { data: { feed: [post("at://a/1")], cursor: "" } }));
        flushSync();
        expect(hasFeed(cs, "a")).toBe(true);

        cs.remove("a");
        flushSync();
        expect(hasFeed(cs, "a")).toBe(false);

        cs.updateFeed("a", (f: any[]) => { f.unshift(post("at://a/late-1")); });
        cs.replaceFeed("a", (f: any[]) => [...f, post("at://a/late-2")]);
        cs.setFeed("a", [post("at://a/late-3")]);
        cs.clearFeed("a");
        cs.setFeedStatus("a", "loaded");

        expect(hasFeed(cs, "a")).toBe(false);
        expect(cs.getFeed("a")).toEqual([]);
        expect(cs.getFeedStatus("a")).toBeUndefined();
        cleanup();
    });

    it("drops late writes after junk FIFO eviction and after removeAll", () => {
        const { cs, cleanup } = createRealColumnState();
        for (let i = 0; i < 21; i++) {
            cs.add(column(`junk-${i}`, { data: { feed: [post(`at://junk-${i}`)], cursor: "" } }));
        }
        flushSync();
        expect(cs.columns[0].id).toBe("junk-1");
        expect(hasFeed(cs, "junk-0")).toBe(false);

        cs.updateFeed("junk-0", (f: any[]) => { f.push(post("at://junk-0/late")); });
        expect(hasFeed(cs, "junk-0")).toBe(false);

        cs.removeAll();
        flushSync();
        cs.updateFeed("junk-5", (f: any[]) => { f.push(post("at://junk-5/late")); });
        cs.setFeed("junk-6", [post("at://junk-6/late")]);
        expect(hasFeed(cs, "junk-5")).toBe(false);
        expect(hasFeed(cs, "junk-6")).toBe(false);
        cleanup();
    });

    it("creates the feed on first write for a column that exists without one", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(column("fresh"));
        flushSync();
        expect(hasFeed(cs, "fresh")).toBe(false);

        cs.updateFeed("fresh", (f: any[]) => { f.push(post("at://fresh/1")); });
        cs.setFeedStatus("fresh", "loaded");

        expect(cs.getFeed("fresh")).toHaveLength(1);
        expect(cs.getFeedStatus("fresh")).toBe("loaded");
        cleanup();
    });

    it("keeps accepting writes for feeds retained across replaceAllColumns (hot resume)", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.add(column("ws1-a", { data: { feed: [post("at://ws1/1")], cursor: "" } }));
        flushSync();

        cs.replaceAllColumns([column("ws2-b")]);
        flushSync();
        expect(cs.hasColumn("ws1-a")).toBe(false);
        expect(hasFeed(cs, "ws1-a")).toBe(true);

        cs.updateFeed("ws1-a", (f: any[]) => { f.unshift(post("at://ws1/late")); });
        expect(cs.getFeed("ws1-a")).toHaveLength(2);
        cleanup();
    });

    it("allows the solo overlay feed while its base column exists and drops it afterwards", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(column("m", { algorithm: { type: "merge", sources: [] }, data: { feed: [post("at://m/1")], cursor: "" } }));
        flushSync();
        const key = soloFeedKey("m");

        cs.setFeed(key, []);
        cs.updateFeed(key, (f: any[]) => { f.push(post("at://m/solo")); });
        expect(cs.getFeed(key)).toHaveLength(1);

        cs.remove("m");
        flushSync();
        expect(hasFeed(cs, key)).toBe(false);

        cs.updateFeed(key, (f: any[]) => { f.push(post("at://m/solo-late")); });
        expect(hasFeed(cs, key)).toBe(false);
        cleanup();
    });
});
