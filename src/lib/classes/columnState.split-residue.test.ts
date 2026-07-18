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
import { getNotificationLedger } from "$lib/components/notification/notificationLedger";

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

function addSplitColumn(cs: any, id: string, splitId: string) {
    cs.add({
        id,
        algorithm: { type: "default" },
        did: "did:plc:viewer",
        data: { feed: [post(`at://${id}`)], cursor: "" },
        splitColumn: {
            id: splitId,
            algorithm: { type: "notification" },
            did: "did:plc:viewer",
            data: { feed: [], cursor: "" },
        },
    });
    cs.setFeed(splitId, [post(`at://${splitId}`)]);
    cs.setFeedStatus(id, "loaded");
    cs.setFeedStatus(splitId, "loaded");
}

describe("split column residue cleanup", () => {
    it("remove() releases the split pane feed, status and ledger", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        addSplitColumn(cs, "col-1", "split-1");
        flushSync();

        const splitLedger = getNotificationLedger("split-1");
        splitLedger.fetchedReasons = ["like"];
        const epochBefore = splitLedger.epoch;

        cs.remove("col-1");
        flushSync();

        expect(cs.columns.length).toBe(0);
        expect(cs.getFeed("split-1")).toEqual([]);
        expect(cs.getFeedStatus("split-1")).toBeUndefined();
        expect(splitLedger.epoch).toBe(epochBefore + 1);
        expect(getNotificationLedger("split-1")).not.toBe(splitLedger);

        cleanup();
    });

    it("removeAll() releases split pane ledgers", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        addSplitColumn(cs, "col-1", "split-1");
        flushSync();

        const splitLedger = getNotificationLedger("split-1");
        const epochBefore = splitLedger.epoch;

        cs.removeAll();
        flushSync();

        expect(cs.columns.length).toBe(0);
        expect(splitLedger.epoch).toBe(epochBefore + 1);
        expect(getNotificationLedger("split-1")).not.toBe(splitLedger);

        cleanup();
    });

    it("unsplitColumnAt(discard) clears the split pane feed status", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        addSplitColumn(cs, "col-1", "split-1");
        flushSync();

        cs.unsplitColumnAt(0, false);
        flushSync();

        expect(cs.getFeed("split-1")).toEqual([]);
        expect(cs.getFeedStatus("split-1")).toBeUndefined();

        cleanup();
    });
});
