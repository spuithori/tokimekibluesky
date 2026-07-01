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

function ids(cs: any): string[] {
    return cs.columns.map((c: any) => c.id);
}

describe("ColumnState tiling: moveLeafToSplit (ドラッグ・タイル合流)", () => {
    it("独立2カラム → 1スロットの分割(両カラムは columns に残り index addressable)", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        cs.add(col("b"));
        expect(cs.slots).toHaveLength(2);

        cs.moveLeafToSplit("b", "a", "column", false);

        expect(cs.slots).toHaveLength(1);
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["a", "b"]);
        expect(ids(cs).sort()).toEqual(["a", "b"]);
        expect(cs.getColumnIndex("a")).toBeGreaterThanOrEqual(0);
        expect(cs.getColumnIndex("b")).toBeGreaterThanOrEqual(0);
        cleanup();
    });

    it("同一split内の兄弟へ合流 = 上下入れ替え(swap 相当)", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        cs.add(col("b"));
        cs.moveLeafToSplit("b", "a", "column", false);
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["a", "b"]);

        cs.moveLeafToSplit("b", "a", "column", true);
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["b", "a"]);
        expect(cs.slots).toHaveLength(1);
        cleanup();
    });

    it("sourceFirst で設置順(上/下)が決まる", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        cs.add(col("b"));
        cs.moveLeafToSplit("b", "a", "column", true);
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["b", "a"]);
        cleanup();
    });

    it("source===target は不変", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        const before = cs.slots;
        cs.moveLeafToSplit("a", "a");
        expect(cs.slots).toBe(before);
        cleanup();
    });
});

describe("ColumnState tiling: moveLeafToSlot (独立カラム化/並べ替え)", () => {
    it("split のサブペインを独立スロットへ抽出(他ペインは残る)", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        cs.add(col("b"));
        cs.moveLeafToSplit("b", "a");
        expect(cs.slots).toHaveLength(1);

        cs.moveLeafToSlot("b", 1);

        expect(cs.slots).toHaveLength(2);
        expect(cs.slots[0].layout).toEqual({ type: "leaf", columnId: "a" });
        expect(flattenLeafIds(cs.slots[1].layout)).toEqual(["b"]);
        cleanup();
    });

    it("独立カラムを別 index へ移動(並べ替え)", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        cs.add(col("b"));
        cs.add(col("c"));
        cs.moveLeafToSlot("a", 3);
        expect(cs.slots.map((s: any) => flattenLeafIds(s.layout)[0])).toEqual(["b", "c", "a"]);
        cleanup();
    });
});

describe("ColumnState tiling: split/unsplit/swap (モーダル操作と同一の seam)", () => {
    it("splitColumnAt → unsplitColumnAt(keep=true) round-trip", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        cs.splitColumnAt("a", col("b"), "column");
        expect(cs.slots).toHaveLength(1);
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["a", "b"]);
        expect(cs.isInSplit("a")).toBe(true);

        cs.unsplitColumnAt("b", true);
        expect(cs.slots).toHaveLength(2);
        expect(cs.isInSplit("a")).toBe(false);
        expect(ids(cs).sort()).toEqual(["a", "b"]);
        cleanup();
    });

    it("unsplitColumnAt(keep=false) はカラムも削除", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        cs.splitColumnAt("a", col("b"), "column");
        cs.unsplitColumnAt("b", false);
        expect(cs.slots).toHaveLength(1);
        expect(cs.slots[0].layout).toEqual({ type: "leaf", columnId: "a" });
        expect(ids(cs)).toEqual(["a"]);
        cleanup();
    });

    it("swapSplitColumn は2分割の順を反転", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        cs.splitColumnAt("a", col("b"), "column");
        cs.swapSplitColumn("a");
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["b", "a"]);
        cleanup();
    });

    it("mergeColumnIntoSplit は既存カラムで分割し source の元スロットを削除", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        cs.add(col("b"));
        cs.mergeColumnIntoSplit("a", "b", "row");
        expect(cs.slots).toHaveLength(1);
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["a", "b"]);
        const layout = cs.slots[0].layout;
        if (layout.type === "split") expect(layout.direction).toBe("row");
        cleanup();
    });
});
