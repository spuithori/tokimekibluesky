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

function col(id: string): any {
    return {
        id,
        algorithm: { type: "default", name: id },
        did: "did:plc:viewer",
        settings: {},
        data: { feed: [], cursor: "" },
    };
}

describe("junk ColumnState は slots を維持しない(設計固定)", () => {
    it("add() しても slots は空のまま・columns だけ増える", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("j1"));
        cs.add(col("j2"));
        flushSync();

        expect(cs.columns.map((c: any) => c.id)).toEqual(["j1", "j2"]);
        expect(cs.slots).toEqual([]);
        cleanup();
    });

    it("remove() は slots 非依存のフィルタ経路で動作し、feed/status も解放される", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("j1"));
        cs.add(col("j2"));
        cs.setFeed("j1", [{ post: { uri: "at://x" } }]);
        cs.setFeedStatus("j1", "loaded");
        flushSync();

        cs.remove("j1");
        flushSync();

        expect(cs.columns.map((c: any) => c.id)).toEqual(["j2"]);
        expect(cs.slots).toEqual([]);
        expect(cs.getFeed("j1")).toEqual([]);
        expect(cs.getFeedStatus("j1")).toBeUndefined();
        cleanup();
    });

    it("上限20超の evict 後も slots は空のまま(整合の破れなし)", () => {
        const { cs, cleanup } = createRealColumnState();
        for (let i = 0; i < 21; i++) cs.add(col(`j${i}`));
        flushSync();

        expect(cs.columns.length).toBe(20);
        expect(cs.columns[0].id).toBe("j1");
        expect(cs.slots).toEqual([]);
        cleanup();
    });
});
