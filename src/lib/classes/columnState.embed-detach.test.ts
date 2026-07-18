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
import { createRealDeckColumnState } from "$lib/classes/columnState.perf.harness.svelte";

function post(uri: string, embed?: any) {
    return {
        post: {
            uri,
            cid: uri + "#cid",
            author: { did: "did:plc:author" },
            embed,
            indexedAt: "2026-07-18T00:00:00Z",
        },
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

describe("applyEmbedDetach", () => {
    it("replaces the embed of matching posts across all columns", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        addColumn(cs, "col-1", [post("at://a", { old: true }), post("at://b")]);
        addColumn(cs, "col-2", [post("at://a", { old: true })]);
        flushSync();

        cs.applyEmbedDetach("at://a", { detached: true });
        flushSync();

        expect(cs.getFeed("col-1")[0].post.embed).toEqual({ detached: true });
        expect(cs.getFeed("col-2")[0].post.embed).toEqual({ detached: true });

        cleanup();
    });

    it("leaves non-matching items untouched by reference", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        const untouched = post("at://b");
        addColumn(cs, "col-1", [post("at://a"), untouched]);
        flushSync();

        cs.applyEmbedDetach("at://a", undefined);
        flushSync();

        expect(cs.getFeed("col-1")[0].post.embed).toBeUndefined();
        expect(cs.getFeed("col-1")[1]).toBe(untouched);

        cleanup();
    });

    it("patches split pane feeds too", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.add({
            id: "col-1",
            algorithm: { type: "default" },
            did: "did:plc:viewer",
            data: { feed: [], cursor: "" },
            splitColumn: {
                id: "split-1",
                algorithm: { type: "default" },
                did: "did:plc:viewer",
                data: { feed: [], cursor: "" },
            },
        });
        cs.setFeed("split-1", [post("at://a", { old: true })]);
        flushSync();

        cs.applyEmbedDetach("at://a", { detached: true });
        flushSync();

        expect(cs.getFeed("split-1")[0].post.embed).toEqual({ detached: true });

        cleanup();
    });
});
