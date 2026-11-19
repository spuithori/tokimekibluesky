export type ServerVote = [index: number, uri: string] | null;
export type LocalVote = { index: number; uri: string } | null;

export const PENDING_VOTE_URI = 'pending';

export type PollTally = {
    counts: number[];
    mine: ServerVote;
    local: LocalVote;
    holding: boolean;
    removed: Set<string>;
};

export function createTally(counts: number[], myVote?: number, myVoteUri?: string): PollTally {
    const voted = myVote !== undefined && myVoteUri !== undefined;
    return {
        counts,
        mine: voted ? [myVote, myVoteUri] : null,
        local: voted ? { index: myVote, uri: myVoteUri } : null,
        holding: false,
        removed: new Set(),
    };
}

export function applyServer(tally: PollTally, counts: number[], mine: ServerVote | undefined) {
    tally.counts = counts;
    if (mine !== undefined) {
        tally.mine = mine;
    }

    const standing = tally.mine && !tally.removed.has(tally.mine[1]) ? tally.mine : null;
    if (tally.holding) {
        if (standing) {
            tally.holding = false;
            tally.local = { index: standing[0], uri: standing[1] };
        }
        return;
    }
    tally.local = standing ? { index: standing[0], uri: standing[1] } : null;
}

export function castVote(tally: PollTally, index: number) {
    tally.local = { index, uri: PENDING_VOTE_URI };
    tally.holding = true;
}

export function confirmVote(tally: PollTally, uri: string) {
    if (tally.local?.uri === PENDING_VOTE_URI) {
        tally.local = { index: tally.local.index, uri };
    }
}

export function removeVote(tally: PollTally) {
    if (!tally.local) {
        return;
    }
    tally.removed.add(tally.local.uri);
    tally.local = null;
    tally.holding = false;
}

export function displayCounts(tally: PollTally): number[] {
    const counts = tally.counts.slice();
    if (tally.mine && tally.mine[0] < counts.length) {
        counts[tally.mine[0]] -= 1;
    }
    if (tally.local && tally.local.index < counts.length) {
        counts[tally.local.index] += 1;
    }
    return counts.map((count) => Math.max(0, count));
}
