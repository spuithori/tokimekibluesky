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

function addColumn(cs: any, id: string) {
    cs.add({
        id,
        algorithm: { type: "default" },
        did: "did:plc:viewer",
        data: { feed: [post(`at://${id}`)], cursor: "" },
    });
}

describe("junk FIFO eviction cleanup", () => {
    it("releases feed and feed status of the evicted column", () => {
        const { cs, cleanup } = createRealColumnState();

        for (let i = 0; i < 21; i++) {
            addColumn(cs, `junk-${i}`);
            cs.setFeedStatus(`junk-${i}`, "loaded");
        }
        flushSync();

        expect(cs.columns.length).toBe(20);
        expect(cs.columns[0].id).toBe("junk-1");

        expect(cs.getFeed("junk-0")).toEqual([]);
        expect(cs.getFeedStatus("junk-0")).toBeUndefined();

        expect(cs.getFeed("junk-1").length).toBe(1);
        expect(cs.getFeedStatus("junk-1")).toBe("loaded");

        cleanup();
    });

    it("releases the notification ledger of the evicted column", () => {
        const { cs, cleanup } = createRealColumnState();

        const evictedLedger = getNotificationLedger("junk-0");
        evictedLedger.fetchedReasons = ["like"];
        const epochBefore = evictedLedger.epoch;

        for (let i = 0; i < 21; i++) {
            addColumn(cs, `junk-${i}`);
        }
        flushSync();

        expect(evictedLedger.epoch).toBe(epochBefore + 1);
        expect(getNotificationLedger("junk-0")).not.toBe(evictedLedger);

        cleanup();
    });

    it("converges and cleans all evicted columns when the cap is exceeded in bulk", () => {
        const { cs, cleanup } = createRealColumnState();

        for (let i = 0; i < 25; i++) {
            addColumn(cs, `junk-${i}`);
        }
        flushSync();

        expect(cs.columns.length).toBe(20);
        expect(cs.columns[0].id).toBe("junk-5");

        for (let i = 0; i < 5; i++) {
            expect(cs.getFeed(`junk-${i}`)).toEqual([]);
        }
        for (let i = 5; i < 25; i++) {
            expect(cs.getFeed(`junk-${i}`).length).toBe(1);
        }

        cleanup();
    });
});
