import { describe, it, expect } from "vitest";
import { isRelevantRealtimeEvent } from "./realtimeGuard";

function event(record: any, repo = "did:plc:followed") {
    return { data: { record, body: { repo }, op: { path: "x", collection: record?.$type } } };
}

const actors = new Set(["did:plc:followed"]);

describe("isRelevantRealtimeEvent", () => {
    it("accepts a text post from a followed actor", () => {
        expect(isRelevantRealtimeEvent(event({ $type: "app.bsky.feed.post", text: "hi" }), actors)).toBe(true);
    });

    it("rejects a post without text", () => {
        expect(isRelevantRealtimeEvent(event({ $type: "app.bsky.feed.post" }), actors)).toBe(false);
    });

    it("accepts a repost from a followed actor", () => {
        expect(isRelevantRealtimeEvent(event({ $type: "app.bsky.feed.repost", subject: { uri: "at://a" } }), actors)).toBe(true);
    });

    it("rejects unrelated record types before touching the actor set", () => {
        expect(isRelevantRealtimeEvent(event({ $type: "app.bsky.feed.like" }), actors)).toBe(false);
    });

    it("rejects events from actors outside the set", () => {
        expect(isRelevantRealtimeEvent(event({ $type: "app.bsky.feed.post", text: "hi" }, "did:plc:stranger"), actors)).toBe(false);
    });

    it("rejects empty or malformed events", () => {
        expect(isRelevantRealtimeEvent(undefined, actors)).toBe(false);
        expect(isRelevantRealtimeEvent({ data: {} }, actors)).toBe(false);
    });
});
