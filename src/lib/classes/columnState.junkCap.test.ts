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
    appState: { profile: { current: 1 }, labelDefs: { current: [] } },
}));
vi.mock("$lib/classes/settingsState.svelte", () => ({
    settingsState: { settings: { markedUnread: false } },
}));

import { createRealColumnState } from "$lib/classes/columnState.perf.harness.svelte";
import { flattenLeafIds } from "$lib/classes/deckLayout";

function col(id: string): any {
    return {
        id,
        algorithm: { type: "default", name: id },
        did: "did:plc:viewer",
        settings: {},
        data: { feed: [], cursor: "" },
    };
}

describe("ColumnState junk cap", () => {
    it("junk 状態は 20 件で頭打ち・columns と slots が整合を保つ", () => {
        const { cs, cleanup } = createRealColumnState();
        expect(cs.isJunk).toBe(true);

        for (let i = 0; i < 25; i++) cs.add(col("c" + i));

        expect(cs.columns.length).toBe(20);
        expect(cs.slots.length).toBe(20);

        expect(cs.getColumnIndex("c0")).toBe(-1);
        expect(cs.getColumnIndex("c4")).toBe(-1);
        expect(cs.getColumnIndex("c5")).toBeGreaterThanOrEqual(0);
        expect(cs.getColumnIndex("c24")).toBeGreaterThanOrEqual(0);

        const colIds = cs.columns.map((c: any) => c.id);
        const slotLeafIds = cs.slots.map((s: any) => flattenLeafIds(s.layout)[0]);
        expect(slotLeafIds).toEqual(colIds);

        const idx = cs.getColumnIndex("c12");
        expect(flattenLeafIds(cs.slots[idx].layout)[0]).toBe("c12");

        cleanup();
    });

    it("20 件ちょうどは削除しない", () => {
        const { cs, cleanup } = createRealColumnState();
        for (let i = 0; i < 20; i++) cs.add(col("k" + i));
        expect(cs.columns.length).toBe(20);
        expect(cs.slots.length).toBe(20);
        expect(cs.getColumnIndex("k0")).toBeGreaterThanOrEqual(0);
        cleanup();
    });
});
