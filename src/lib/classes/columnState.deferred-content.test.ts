import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { storedProfile } = vi.hoisted(() => ({ storedProfile: { value: null as any } }));

vi.mock("$lib/db", () => ({
    accountsDb: {
        profiles: {
            get: () => Promise.resolve(storedProfile.value),
            update: () => Promise.resolve(),
        },
    },
}));
vi.mock("$lib/classes/appState.svelte", () => ({
    appState: { profile: { current: 1 }, labelDefs: { current: [] }, registerHandleListener: () => () => {}, getFreshHandle: () => undefined },
}));
vi.mock("$lib/classes/settingsState.svelte", () => ({
    settingsState: { settings: { markedUnread: true } },
}));

import { flushSync } from "svelte";
import { createRealDeckColumnState } from "$lib/classes/columnState.perf.harness.svelte";
import { settingsState } from "$lib/classes/settingsState.svelte";

function post(uri: string) {
    return { post: { uri, cid: uri + "#cid", author: { did: "did:plc:author" }, viewer: {} } };
}

function column(id: string, feed: any[] = [], cursor = "") {
    return { id, algorithm: { type: "default" }, did: "did:plc:viewer", settings: {}, data: { feed, cursor } };
}

let frames: Array<() => void>;

function runFrame() {
    const callbacks = frames;
    frames = [];
    for (const callback of callbacks) callback();
    flushSync();
}

beforeEach(() => {
    frames = [];
    storedProfile.value = null;
    settingsState.settings.markedUnread = true;
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) => {
        frames.push(callback);
        return frames.length;
    });
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("restored timelines mount one column per frame", () => {
    it("holds every release until the deck itself is mounted", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.replaceAllColumns([column("a", [post("at://a/1")], "cursor-a"), column("b", [post("at://b/1")], "cursor-b")]);
        flushSync();

        for (let i = 0; i < 5; i++) runFrame();
        expect(cs.isContentDeferred("a")).toBe(true);
        expect(cs.isContentDeferred("b")).toBe(true);

        cs.setDeckMounted(true);
        runFrame();
        expect(cs.isContentDeferred("a")).toBe(true);
        runFrame();
        expect(cs.isContentDeferred("a")).toBe(false);
        expect(cs.isContentDeferred("b")).toBe(true);

        cs.setDeckMounted(false);
        for (let i = 0; i < 5; i++) runFrame();
        expect(cs.isContentDeferred("b")).toBe(true);

        cs.setDeckMounted(true);
        runFrame();
        runFrame();
        expect(cs.isContentDeferred("b")).toBe(false);
        cleanup();
    });

    it("keeps the restored feed and its cursor in place while only the content mount is deferred", () => {
        const { cs, cleanup } = createRealDeckColumnState();

        cs.replaceAllColumns([
            column("a", [post("at://a/1"), post("at://a/2")], "cursor-a"),
            column("empty"),
            column("b", [post("at://b/1")], "cursor-b"),
        ]);
        flushSync();

        expect(cs.getFeed("a").map((item: any) => item.post.uri)).toEqual(["at://a/1", "at://a/2"]);
        expect(cs.getFeed("b").map((item: any) => item.post.uri)).toEqual(["at://b/1"]);
        expect(cs.columns.find((c: any) => c.id === "a").data.cursor).toBe("cursor-a");
        expect(cs.columns.find((c: any) => c.id === "b").data.cursor).toBe("cursor-b");

        expect(cs.isContentDeferred("a")).toBe(true);
        expect(cs.isContentDeferred("b")).toBe(true);
        expect(cs.isContentDeferred("empty")).toBe(false);
        cleanup();
    });

    it("lets the deck paint once before releasing exactly one column per frame in deck order", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.setDeckMounted(true);
        cs.replaceAllColumns([
            column("a", [post("at://a/1")], "cursor-a"),
            column("b", [post("at://b/1")], "cursor-b"),
            column("c", [post("at://c/1")], "cursor-c"),
        ]);
        flushSync();

        const deferred = () => ["a", "b", "c"].filter((id) => cs.isContentDeferred(id));
        expect(deferred()).toEqual(["a", "b", "c"]);

        runFrame();
        expect(deferred()).toEqual(["a", "b", "c"]);
        runFrame();
        expect(deferred()).toEqual(["b", "c"]);
        runFrame();
        expect(deferred()).toEqual(["c"]);
        runFrame();
        expect(deferred()).toEqual([]);
        expect(frames).toHaveLength(0);
        cleanup();
    });

    it("drops the previous workspace's pending releases when the workspace changes again", () => {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.setDeckMounted(true);
        cs.replaceAllColumns([
            column("old-1", [post("at://old/1")], "cursor-old-1"),
            column("old-2", [post("at://old/2")], "cursor-old-2"),
        ]);
        flushSync();

        cs.replaceAllColumns([column("new-1", [post("at://new/1")], "cursor-new-1")]);
        flushSync();

        expect(cs.isContentDeferred("old-1")).toBe(false);
        expect(cs.isContentDeferred("old-2")).toBe(false);
        expect(cs.isContentDeferred("new-1")).toBe(true);

        runFrame();
        runFrame();
        expect(cs.isContentDeferred("new-1")).toBe(false);
        runFrame();
        expect(cs.getFeed("new-1").map((item: any) => item.post.uri)).toEqual(["at://new/1"]);
        expect(cs.columns.find((c: any) => c.id === "new-1").data.cursor).toBe("cursor-new-1");
        cleanup();
    });

    it("defers restored columns on boot as well", async () => {
        storedProfile.value = {
            deckVersion: undefined,
            columns: [column("boot-a", [post("at://boot/1")], "cursor-boot"), column("boot-empty")],
        };
        const { cs, cleanup } = createRealDeckColumnState();
        cs.setDeckMounted(true);
        await vi.waitFor(() => expect(cs.isColumnsLoaded).toBe(true));
        flushSync();

        expect(cs.getFeed("boot-a")).toHaveLength(1);
        expect(cs.isContentDeferred("boot-a")).toBe(true);
        expect(cs.isContentDeferred("boot-empty")).toBe(false);

        runFrame();
        expect(cs.isContentDeferred("boot-a")).toBe(true);
        runFrame();
        expect(cs.isContentDeferred("boot-a")).toBe(false);
        cleanup();
    });

    it("defers nothing when there is nothing restored", () => {
        settingsState.settings.markedUnread = false;
        const { cs, cleanup } = createRealDeckColumnState();
        cs.replaceAllColumns([column("a", [post("at://a/1")], "cursor-a"), column("b")]);
        flushSync();

        expect(cs.isContentDeferred("a")).toBe(false);
        expect(cs.isContentDeferred("b")).toBe(false);
        expect(frames).toHaveLength(0);
        cleanup();
    });
});
