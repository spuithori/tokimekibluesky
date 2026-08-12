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
import { flattenLeafIds } from "$lib/classes/deckLayout";

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

function addSplitSlot(cs: any, id: string, splitId: string) {
    cs.add({
        id,
        algorithm: { type: "default" },
        did: "did:plc:viewer",
        settings: {},
        data: { feed: [post(`at://${id}`)], cursor: "" },
    });
    cs.add({
        id: splitId,
        algorithm: { type: "notification" },
        did: "did:plc:viewer",
        settings: {},
        data: { feed: [], cursor: "" },
    });
    cs.moveLeafToSplit(splitId, id, "column", false);
    cs.setFeed(splitId, [post(`at://${splitId}`)]);
    cs.setFeedStatus(id, "loaded");
    cs.setFeedStatus(splitId, "loaded");
}

describe("split column residue cleanup", () => {
    it("remove() releases each leaf's feed, status and ledger, and collapses the slot", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        addSplitSlot(cs, "col-1", "split-1");
        flushSync();

        expect(cs.slots.length).toBe(1);
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["col-1", "split-1"]);

        const splitLedger = getNotificationLedger("split-1");
        splitLedger.fetchedReasons = ["like"];
        const epochBefore = splitLedger.epoch;

        cs.remove("split-1");
        flushSync();

        expect(cs.columns.length).toBe(1);
        expect(cs.slots.length).toBe(1);
        expect(cs.slots[0].layout).toEqual({ type: "leaf", columnId: "col-1" });
        expect(cs.getFeed("split-1")).toEqual([]);
        expect(cs.getFeedStatus("split-1")).toBeUndefined();
        expect(splitLedger.epoch).toBe(epochBefore + 1);
        expect(getNotificationLedger("split-1")).not.toBe(splitLedger);

        cs.remove("col-1");
        flushSync();

        expect(cs.columns.length).toBe(0);
        expect(cs.slots.length).toBe(0);
        expect(cs.getFeed("col-1")).toEqual([]);
        expect(cs.getFeedStatus("col-1")).toBeUndefined();

        cleanup();
    });

    it("removeAll() releases every leaf ledger including split panes", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        addSplitSlot(cs, "col-1", "split-1");
        flushSync();

        const splitLedger = getNotificationLedger("split-1");
        const epochBefore = splitLedger.epoch;

        cs.removeAll();
        flushSync();

        expect(cs.columns.length).toBe(0);
        expect(cs.slots.length).toBe(0);
        expect(splitLedger.epoch).toBe(epochBefore + 1);
        expect(getNotificationLedger("split-1")).not.toBe(splitLedger);

        cleanup();
    });

    it("unsplitColumnAt(discard) clears the split pane feed status", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        addSplitSlot(cs, "col-1", "split-1");
        flushSync();

        cs.unsplitColumnAt("split-1", false);
        flushSync();

        expect(cs.columns.length).toBe(1);
        expect(cs.slots[0].layout).toEqual({ type: "leaf", columnId: "col-1" });
        expect(cs.getFeed("split-1")).toEqual([]);
        expect(cs.getFeedStatus("split-1")).toBeUndefined();

        cleanup();
    });
});
