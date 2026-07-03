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

import { buildJunkColumn, openJunkColumn, type JunkColumnHost } from "$lib/junkColumn";
import { defaultDeckSettings } from "$lib/components/deck/defaultDeckSettings";
import { createRealColumnState } from "$lib/classes/columnState.perf.harness.svelte";

function fakeHost() {
    const columns: any[] = [];
    const host: JunkColumnHost & { columns: any[] } = {
        columns,
        hasColumn: (id) => columns.some((c) => c.id === id),
        add: (c) => { columns.push(c); },
        getColumnIndex: (id) => columns.findIndex((c) => c.id === id),
    };
    return host;
}

describe("buildJunkColumn", () => {
    it("デフォルトを埋める(style/data/settings)", () => {
        const c = buildJunkColumn({ id: "x", algorithm: { type: "search" as any, algorithm: "q", name: "S" }, did: "d" });
        expect(c.id).toBe("x");
        expect(c.style).toBe("default");
        expect(c.did).toBe("d");
        expect(c.algorithm.type).toBe("search");
        expect(c.algorithm.name).toBe("S");
        expect(c.algorithm.algorithm).toBe("q");
        expect(c.data.feed).toEqual([]);
        expect(c.data.cursor).toBe("");
        expect(c.settings.opacity).toBe(defaultDeckSettings.opacity);
    });

    it("settings は defaultDeckSettings のディープクローン(singleton 汚染しない)", () => {
        const c = buildJunkColumn({ id: "a", algorithm: { type: "default" as any }, did: "d" });
        expect(c.settings).not.toBe(defaultDeckSettings);
        (c.settings.timeline as any).hideRepost = "all";
        expect(defaultDeckSettings.timeline!.hideRepost).toBe(null);

        const c2 = buildJunkColumn({ id: "b", algorithm: { type: "default" as any }, did: "d" });
        expect(c2.settings).not.toBe(c.settings);
        expect((c2.settings.timeline as any).hideRepost).toBe(null);
    });

    it("style/settings/seedFeed/algorithm を透過", () => {
        const c = buildJunkColumn({
            id: "m",
            algorithm: { type: "authorMedia" as any, id: "col-id", sort: "top", list: { uri: "x" } as any },
            style: "media",
            did: "d",
            handle: "h.bsky",
            settings: { width: 500 },
            seedFeed: [{ post: 1 }],
        });
        expect(c.style).toBe("media");
        expect(c.handle).toBe("h.bsky");
        expect(c.settings.width).toBe(500);
        expect(c.settings.opacity).toBe(100);
        expect(c.algorithm.id).toBe("col-id");
        expect(c.algorithm.sort).toBe("top");
        expect((c.algorithm.list as any).uri).toBe("x");
        expect(c.data.feed).toEqual([{ post: 1 }]);
    });
});

describe("openJunkColumn", () => {
    it("id 冪等(fake host): 2回目は重複せず安定 index", () => {
        const host = fakeHost();
        const i1 = openJunkColumn(host, { id: "t1", algorithm: { type: "thread" as any }, did: "d", seedFeed: [{ post: "seed" }] });
        expect(i1).toBe(0);
        expect(host.columns).toHaveLength(1);

        const i2 = openJunkColumn(host, { id: "t1", algorithm: { type: "thread" as any }, did: "d", seedFeed: [{ post: "OTHER" }] });
        expect(i2).toBe(0);
        expect(host.columns).toHaveLength(1);
        expect(host.columns[0].data.feed).toEqual([{ post: "seed" }]);

        const i3 = openJunkColumn(host, { id: "t2", algorithm: { type: "thread" as any }, did: "d" });
        expect(i3).toBe(1);
        expect(host.columns).toHaveLength(2);
    });

    it("実 ColumnState(junk) でも ensure + index 取得", () => {
        const { cs, cleanup } = createRealColumnState();
        const i = openJunkColumn(cs, { id: "search_q", algorithm: { type: "search" as any, algorithm: "q" }, did: "d" });
        expect(i).toBeGreaterThanOrEqual(0);
        expect(cs.hasColumn("search_q")).toBe(true);
        const again = openJunkColumn(cs, { id: "search_q", algorithm: { type: "search" as any, algorithm: "q" }, did: "d" });
        expect(again).toBe(i);
        expect(cs.columns).toHaveLength(1);
        cleanup();
    });
});
