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
import { createRealColumnState } from "$lib/classes/columnState.perf.harness.svelte";

const error = { kind: "feedgenUnknown" as const, serverMessage: "private" };

function col(id: string): any {
    return {
        id,
        algorithm: { type: "custom", algorithm: "at://did:plc:owner/app.bsky.feed.generator/x", name: id },
        did: "did:plc:viewer",
        settings: {},
        data: { feed: [], cursor: "" },
    };
}

describe("feed load error held by ColumnState", () => {
    it("is released with its column and never written for a column that is gone", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        cs.add(col("b"));
        cs.setFeedError("a", error);
        cs.setFeedError("b", error);
        flushSync();

        cs.remove("a");
        cs.setFeedError("a", error);
        flushSync();

        expect(cs.getFeedError("a")).toBeUndefined();
        expect(cs.getFeedError("b")).toEqual(error);
        cleanup();
    });

    it("does not outlive a reset or a replaced feed, so loading is not left blocked", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        cs.add(col("b"));
        cs.setFeedError("a", error);
        cs.setFeedError("b", error);

        cs.clearFeed("a");
        cs.setFeed("b", [{ post: { uri: "at://x" } }]);
        flushSync();

        expect(cs.getFeedError("a")).toBeUndefined();
        expect(cs.getFeedError("b")).toBeUndefined();
        cleanup();
    });
});
