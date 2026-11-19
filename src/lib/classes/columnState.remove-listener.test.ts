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

import { createRealDeckColumnState } from "$lib/classes/columnState.perf.harness.svelte";
import { setColumnRemoveListener } from "$lib/classes/columnState.svelte";

function column(id: string) {
    return { id, algorithm: { type: "custom", algorithm: `at://did:plc:viewer/app.bsky.feed.generator/${id}` }, did: "did:plc:viewer", settings: {}, data: { feed: [], cursor: "" } };
}

describe("column remove listener", () => {
    it("hears about a column deleted on its own and one deleted out of a split, with the columns that remain", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        const heard: Array<{ id: string; remaining: string[] }> = [];
        setColumnRemoveListener((removed, remaining) => heard.push({ id: removed.id, remaining: remaining.map(c => c.id) }));

        cs.add(column("a"));
        cs.add(column("b"));
        cs.add(column("c"));
        cs.moveLeafToSplit("c", "b", "column", false);

        cs.remove("a");
        cs.unsplitColumnAt("c", false);

        expect(heard).toEqual([
            { id: "a", remaining: ["b", "c"] },
            { id: "c", remaining: ["b"] },
        ]);

        heard.length = 0;
        cs.add(column("d"));
        cs.moveLeafToSplit("d", "b", "column", false);
        cs.unsplitColumnAt("d", true);
        expect(heard).toEqual([]);

        setColumnRemoveListener(undefined);
        cleanup();
    });
});
