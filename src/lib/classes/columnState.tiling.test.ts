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

function buildNested(cs: any) {
    cs.add(col("a"));
    cs.splitColumnAt("a", col("b"), "column");
    cs.splitColumnAt("b", col("c"), "column");
}

describe("ColumnState tiling: 入れ子split(3ペイン) エッジケース", () => {
    it("入れ子 [a,[b,c]] を構築でき isInSplit/leafIdsOf が正しい", () => {
        const { cs, cleanup } = createRealColumnState();
        buildNested(cs);
        expect(cs.slots).toHaveLength(1);
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["a", "b", "c"]);
        expect(cs.isInSplit("a")).toBe(true);
        expect(cs.isInSplit("c")).toBe(true);
        expect(cs.leafIdsOf(0)).toEqual(["a", "b", "c"]);
        cleanup();
    });

    it("入れ子の末端リーフを unsplit(削除)すると内側splitが畳まれる", () => {
        const { cs, cleanup } = createRealColumnState();
        buildNested(cs);
        cs.unsplitColumnAt("c", false);
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["a", "b"]);
        expect(ids(cs).sort()).toEqual(["a", "b"]);
        cleanup();
    });

    it("入れ子のサブペインを独立スロットへ抽出(残りは畳む)", () => {
        const { cs, cleanup } = createRealColumnState();
        buildNested(cs);
        cs.moveLeafToSlot("c", 1);
        expect(cs.slots).toHaveLength(2);
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["a", "b"]);
        expect(flattenLeafIds(cs.slots[1].layout)).toEqual(["c"]);
        cleanup();
    });

    it("入れ子のサブペインを別リーフへ合流(detach→再構成)", () => {
        const { cs, cleanup } = createRealColumnState();
        buildNested(cs);
        cs.moveLeafToSplit("c", "a", "column", false);
        expect(cs.slots).toHaveLength(1);
        expect(flattenLeafIds(cs.slots[0].layout).sort()).toEqual(["a", "b", "c"]);
        expect(cs.slots[0].layout.type).toBe("split");
        cleanup();
    });

    it("swap はスロット直下(root)の子順のみ反転・入れ子は保持", () => {
        const { cs, cleanup } = createRealColumnState();
        buildNested(cs);
        cs.swapSplitColumn("a");
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["b", "c", "a"]);
        cleanup();
    });
});

describe("ColumnState: 単一leafを中間へ移動(dock の index 補正・オフバイワン退行防止)", () => {
    it("source が挿入先より左: 補正後 index(=slotIndexOf(target)-1)で目的の隣接に入る", () => {
        const { cs, cleanup } = createRealColumnState();
        ["F", "B", "C", "D"].forEach((id) => cs.add(col(id)));
        cs.moveLeafToSlot("F", 1);
        expect(cs.slots.map((s: any) => flattenLeafIds(s.layout)[0])).toEqual(["B", "F", "C", "D"]);
        cleanup();
    });

    it("補正なしの生 index だと detach で1つ右にずれる(バグ再現)", () => {
        const { cs, cleanup } = createRealColumnState();
        ["F", "B", "C", "D"].forEach((id) => cs.add(col(id)));
        cs.moveLeafToSlot("F", 2);
        expect(cs.slots.map((s: any) => flattenLeafIds(s.layout)[0])).toEqual(["B", "C", "F", "D"]);
        cleanup();
    });

    it("source が挿入先より右: 補正不要でそのまま目的位置", () => {
        const { cs, cleanup } = createRealColumnState();
        ["B", "C", "F", "D"].forEach((id) => cs.add(col(id)));
        cs.moveLeafToSlot("F", 1);
        expect(cs.slots.map((s: any) => flattenLeafIds(s.layout)[0])).toEqual(["B", "F", "C", "D"]);
        cleanup();
    });
});

describe("ColumnState tiling: 単一/空/不正 のエッジケース", () => {
    it("存在しない source の move は不変(no-op)", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        const before = cs.slots;
        cs.moveLeafToSplit("zzz", "a");
        cs.moveLeafToSlot("zzz", 0);
        expect(cs.slots).toBe(before);
        cleanup();
    });

    it("単一カラムを自身の位置へ moveLeafToSlot しても壊れない", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.add(col("a"));
        cs.moveLeafToSlot("a", 0);
        expect(cs.slots).toHaveLength(1);
        expect(flattenLeafIds(cs.slots[0].layout)).toEqual(["a"]);
        expect(ids(cs)).toEqual(["a"]);
        cleanup();
    });

    it("空デッキでの move は安全に no-op", () => {
        const { cs, cleanup } = createRealColumnState();
        cs.moveLeafToSplit("x", "y");
        cs.moveLeafToSlot("x", 0);
        expect(cs.slots).toHaveLength(0);
        cleanup();
    });
});
