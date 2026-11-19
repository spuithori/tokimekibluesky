import { describe, expect, it } from 'vitest';
import { applyServer, castVote, confirmVote, createTally, displayCounts, removeVote } from './pollTally';

const MINE = 'at://did:plc:me/tech.tokimeki.poll.vote/mine';

describe('pollTally', () => {
    it('counts my vote once: at the click, while the server has not seen it, and after it has', () => {
        const tally = createTally([3, 1]);
        castVote(tally, 1);
        expect(displayCounts(tally)).toEqual([3, 2]);

        applyServer(tally, [4, 1], null);
        expect(displayCounts(tally)).toEqual([4, 2]);
        expect(tally.local?.index).toBe(1);

        confirmVote(tally, MINE);
        applyServer(tally, [4, 2], [1, MINE]);
        expect(displayCounts(tally)).toEqual([4, 2]);
        expect(tally.local).toEqual({ index: 1, uri: MINE });

        applyServer(tally, [5, 2], [1, MINE]);
        expect(displayCounts(tally)).toEqual([5, 2]);
    });

    it('takes the vote uri from the server when it arrives before the write returns', () => {
        const tally = createTally([0, 0]);
        castVote(tally, 0);
        applyServer(tally, [1, 0], [0, MINE]);
        expect(tally.local).toEqual({ index: 0, uri: MINE });
        confirmVote(tally, MINE);
        expect(displayCounts(tally)).toEqual([1, 0]);
    });

    it('drops my vote at the click and does not bring it back while the server still shows it', () => {
        const tally = createTally([2, 5], 1, MINE);
        expect(displayCounts(tally)).toEqual([2, 5]);
        removeVote(tally);
        expect(displayCounts(tally)).toEqual([2, 4]);

        applyServer(tally, [3, 5], [1, MINE]);
        expect(tally.local).toBeNull();
        expect(displayCounts(tally)).toEqual([3, 4]);

        applyServer(tally, [3, 4], null);
        expect(tally.local).toBeNull();
        expect(displayCounts(tally)).toEqual([3, 4]);
    });

    it('stays not voted through a vote that is removed before the server has reported either', () => {
        const tally = createTally([1, 1]);
        castVote(tally, 0);
        confirmVote(tally, MINE);
        removeVote(tally);
        expect(displayCounts(tally)).toEqual([1, 1]);

        applyServer(tally, [1, 2], null);
        expect(tally.local).toBeNull();
        applyServer(tally, [2, 2], [0, MINE]);
        expect(tally.local).toBeNull();
        expect(displayCounts(tally)).toEqual([1, 2]);
        applyServer(tally, [1, 2], null);
        expect(tally.local).toBeNull();
        expect(displayCounts(tally)).toEqual([1, 2]);
    });

    it('follows a vote cast or removed from another device', () => {
        const other = 'at://did:plc:me/tech.tokimeki.poll.vote/other';
        const tally = createTally([0, 0]);
        applyServer(tally, [0, 1], [1, other]);
        expect(tally.local).toEqual({ index: 1, uri: other });
        expect(displayCounts(tally)).toEqual([0, 1]);

        applyServer(tally, [0, 0], null);
        expect(tally.local).toBeNull();
        expect(displayCounts(tally)).toEqual([0, 0]);
    });

    it('keeps my state when an update carries no information about me, and never shows a negative count', () => {
        const tally = createTally([1, 0], 0, MINE);
        applyServer(tally, [0, 0], undefined);
        expect(tally.local).toEqual({ index: 0, uri: MINE });
        removeVote(tally);
        expect(displayCounts(tally)).toEqual([0, 0]);
    });
});
