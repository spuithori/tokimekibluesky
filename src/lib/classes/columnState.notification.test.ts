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

import { createRealColumnState } from "$lib/classes/columnState.perf.harness.svelte";
import { getNotificationLedger } from "$lib/components/notification/notificationLedger";

function notificationGroup(subjectUri: string, opts: any = {}) {
    return {
        reason: opts.reason ?? "like",
        notifications: [{
            uri: `at://did:plc:someone/app.bsky.feed.like/1`,
            author: { did: "did:plc:someone", handle: "someone.test" },
            reason: opts.reason ?? "like",
            isRead: false,
            indexedAt: "2026-01-01T00:00:00.000Z",
        }],
        latestIndexedAt: "2026-01-01T00:00:00.000Z",
        key: `at://did:plc:someone/app.bsky.feed.like/1`,
        subject: subjectUri,
        post: {
            uri: subjectUri,
            cid: subjectUri + "#cid",
            author: { did: opts.authorDid ?? "did:plc:me" },
            likeCount: opts.likeCount ?? 0,
            repostCount: opts.repostCount ?? 0,
            viewer: {},
        },
    };
}

function addNotificationColumn(cs: any, id: string, feed: any[]) {
    cs.add({
        id,
        algorithm: { type: "notification" },
        did: "did:plc:me",
        data: { feed: [], cursor: "" },
    });
    cs.setFeed(id, feed);
}

describe("notification groups through generic pulse path", () => {
    it("updates likeCount on the embedded post while keeping group identity", () => {
        const { cs, cleanup } = createRealColumnState();
        const group = notificationGroup("at://did:plc:me/app.bsky.feed.post/1");
        addNotificationColumn(cs, "notif", [group]);

        cs.updateLike({
            uri: "at://did:plc:me/app.bsky.feed.post/1",
            did: "did:plc:me",
            count: 5,
            viewer: "at://like/self",
        });

        const feed = cs.getFeed("notif");
        expect(feed[0].post.likeCount).toBe(5);
        expect(feed[0].post.viewer.like).toBe("at://like/self");
        expect(feed[0].key).toBe(group.key);
        expect(feed[0].notifications).toEqual(group.notifications);
        cleanup();
    });

    it("updates repostCount on the embedded post", () => {
        const { cs, cleanup } = createRealColumnState();
        addNotificationColumn(cs, "notif", [notificationGroup("at://did:plc:me/app.bsky.feed.post/1")]);

        cs.updateRepost({
            uri: "at://did:plc:me/app.bsky.feed.post/1",
            did: "did:plc:me",
            count: 7,
            viewer: "at://repost/self",
        });

        expect(cs.getFeed("notif")[0].post.repostCount).toBe(7);
        cleanup();
    });

    it("patches every group sharing the same subject post", () => {
        const { cs, cleanup } = createRealColumnState();
        const uri = "at://did:plc:me/app.bsky.feed.post/1";
        addNotificationColumn(cs, "notif", [
            notificationGroup(uri, { reason: "like" }),
            notificationGroup(uri, { reason: "repost" }),
        ]);

        cs.updateLike({ uri, did: "did:plc:other", count: 3, viewer: undefined });

        const feed = cs.getFeed("notif");
        expect(feed[0].post.likeCount).toBe(3);
        expect(feed[1].post.likeCount).toBe(3);
        cleanup();
    });

    it("leaves untouched columns and unrelated groups referentially intact", () => {
        const { cs, cleanup } = createRealColumnState();
        const target = notificationGroup("at://did:plc:me/app.bsky.feed.post/1");
        const other = notificationGroup("at://did:plc:me/app.bsky.feed.post/2");
        addNotificationColumn(cs, "notif", [target, other]);

        cs.updateLike({
            uri: "at://did:plc:me/app.bsky.feed.post/1",
            did: "did:plc:me",
            count: 1,
            viewer: "at://like/self",
        });

        expect(cs.getFeed("notif")[1]).toBe(other);
        cleanup();
    });

    it("removes the group when the subject post is deleted", () => {
        const { cs, cleanup } = createRealColumnState();
        addNotificationColumn(cs, "notif", [
            notificationGroup("at://did:plc:me/app.bsky.feed.post/1"),
            notificationGroup("at://did:plc:me/app.bsky.feed.post/2"),
        ]);

        cs.deletePost("at://did:plc:me/app.bsky.feed.post/1");

        const feed = cs.getFeed("notif");
        expect(feed).toHaveLength(1);
        expect(feed[0].post.uri).toBe("at://did:plc:me/app.bsky.feed.post/2");
        cleanup();
    });

    it("removes groups whose subject author is purged", () => {
        const { cs, cleanup } = createRealColumnState();
        addNotificationColumn(cs, "notif", [
            notificationGroup("at://did:plc:me/app.bsky.feed.post/1", { authorDid: "did:plc:spammer" }),
            notificationGroup("at://did:plc:me/app.bsky.feed.post/2"),
        ]);

        cs.deletePostsFromDid("did:plc:spammer");

        expect(cs.getFeed("notif")).toHaveLength(1);
        cleanup();
    });

    it("remove deletes the ledger and invalidates orphaned references", () => {
        const { cs, cleanup } = createRealColumnState();
        addNotificationColumn(cs, "lc-remove", []);
        const ledger = getNotificationLedger("lc-remove");
        ledger.fetchedReasons = ["like"];
        const epoch = ledger.epoch;

        cs.remove("lc-remove");

        expect(ledger.epoch).toBe(epoch + 1);
        expect(getNotificationLedger("lc-remove")).not.toBe(ledger);
        cleanup();
    });

    it("swapSplitColumn resets the ledgers of both ids", () => {
        const { cs, cleanup } = createRealColumnState();
        addNotificationColumn(cs, "lc-swap-main", []);
        const index = cs.columns.length - 1;
        cs.columns[index].splitColumn = {
            id: "lc-swap-split",
            algorithm: { type: "default" },
            did: "did:plc:me",
            data: { feed: [], cursor: "" },
        };
        const mainLedger = getNotificationLedger("lc-swap-main");
        mainLedger.notifications = [{ uri: "at://x" }] as any;
        mainLedger.fetchedReasons = ["like"];
        const splitLedger = getNotificationLedger("lc-swap-split");
        const mainEpoch = mainLedger.epoch;
        const splitEpoch = splitLedger.epoch;

        cs.swapSplitColumn(index);

        expect(mainLedger.notifications).toEqual([]);
        expect(mainLedger.fetchedReasons).toBeUndefined();
        expect(mainLedger.epoch).toBe(mainEpoch + 1);
        expect(splitLedger.epoch).toBe(splitEpoch + 1);
        cleanup();
    });

    it("unsplit with keep moves the ledger to the promoted column id", () => {
        const { cs, cleanup } = createRealColumnState();
        addNotificationColumn(cs, "lc-unsplit-main", []);
        const index = cs.columns.length - 1;
        cs.columns[index].splitColumn = {
            id: "lc-unsplit-old",
            algorithm: { type: "notification" },
            did: "did:plc:me",
            data: { feed: [], cursor: "" },
        };
        const splitLedger = getNotificationLedger("lc-unsplit-old");
        splitLedger.fetchedReasons = ["like"];

        cs.unsplitColumnAt(index, true);

        const promoted = cs.columns[index + 1];
        expect(getNotificationLedger(promoted.id)).toBe(splitLedger);
        expect(getNotificationLedger("lc-unsplit-old")).not.toBe(splitLedger);
        cleanup();
    });

    it("unsplit without keeping deletes the split ledger", () => {
        const { cs, cleanup } = createRealColumnState();
        addNotificationColumn(cs, "lc-drop-main", []);
        const index = cs.columns.length - 1;
        cs.columns[index].splitColumn = {
            id: "lc-drop-old",
            algorithm: { type: "notification" },
            did: "did:plc:me",
            data: { feed: [], cursor: "" },
        };
        const splitLedger = getNotificationLedger("lc-drop-old");
        const epoch = splitLedger.epoch;

        cs.unsplitColumnAt(index, false);

        expect(splitLedger.epoch).toBe(epoch + 1);
        expect(getNotificationLedger("lc-drop-old")).not.toBe(splitLedger);
        cleanup();
    });

    it("replaceAllColumns clears every ledger for profile switching", () => {
        const { cs, cleanup } = createRealColumnState();
        const a = getNotificationLedger("lc-profile-a");
        const b = getNotificationLedger("lc-profile-b");
        a.fetchedReasons = ["like"];
        const aEpoch = a.epoch;
        const bEpoch = b.epoch;

        cs.replaceAllColumns([]);

        expect(a.epoch).toBe(aEpoch + 1);
        expect(b.epoch).toBe(bEpoch + 1);
        expect(getNotificationLedger("lc-profile-a")).not.toBe(a);
        expect(cs.columns).toEqual([]);
        cleanup();
    });

    it("patches notification feeds inside splitColumn", () => {
        const { cs, cleanup } = createRealColumnState();
        addNotificationColumn(cs, "main", []);
        const column = cs.columns[cs.columns.length - 1];
        column.splitColumn = {
            id: "split-notif",
            algorithm: { type: "notification" },
            did: "did:plc:me",
            data: { feed: [], cursor: "" },
        };
        cs.setFeed("split-notif", [notificationGroup("at://did:plc:me/app.bsky.feed.post/1")]);

        cs.updateLike({
            uri: "at://did:plc:me/app.bsky.feed.post/1",
            did: "did:plc:me",
            count: 9,
            viewer: "at://like/self",
        });

        expect(cs.getFeed("split-notif")[0].post.likeCount).toBe(9);
        cleanup();
    });
});
