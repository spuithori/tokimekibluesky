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
        data: { feed: [], cursor: "", notifications: [] },
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

    it("patches notification feeds inside splitColumn", () => {
        const { cs, cleanup } = createRealColumnState();
        addNotificationColumn(cs, "main", []);
        const column = cs.columns[cs.columns.length - 1];
        column.splitColumn = {
            id: "split-notif",
            algorithm: { type: "notification" },
            did: "did:plc:me",
            data: { feed: [], cursor: "", notifications: [] },
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
