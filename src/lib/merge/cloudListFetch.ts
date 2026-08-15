import {
    createPool,
    decodeMergeCursor,
    emitBatch,
    emittableCount,
    fingerprintSources,
    integratePage,
    markFetchFailed,
    planRefill,
    type MergePool,
    type MergeSource,
} from './mergeEngine';
import { storePool, takePool } from './mergeFetch';

const MAX_ROUNDS = 8;
const FETCH_CONCURRENCY = 10;

type MemberSnapshot = {
    listId: string,
    members: string[],
};

const memberSnapshots = new WeakMap<object, MemberSnapshot>();

export function pageLimitFor(memberCount: number): number {
    return Math.max(5, Math.min(20, Math.ceil(100 / memberCount)));
}

function sourcesFromMembers(members: string[]): MergeSource[] {
    return members.map(did => ({ id: did, type: 'author', algorithm: did }));
}

async function resolveMembers(agent: any, algorithm: any, isHead: boolean): Promise<string[]> {
    const listId = String(algorithm?.algorithm ?? '');

    if (!listId) {
        return [];
    }

    if (!isHead) {
        const cached = memberSnapshots.get(algorithm);
        if (cached && cached.listId === listId) {
            return cached.members;
        }
    }

    const res = await agent.getCloudList(listId);
    const members = Array.isArray(res?.members)
        ? res.members.filter((m: unknown): m is string => typeof m === 'string' && m.startsWith('did:'))
        : [];
    memberSnapshots.set(algorithm, { listId, members });
    return members;
}

export async function getCloudListTimeline(agent: any, timelineOpt: any, signal?: AbortSignal): Promise<{ feed: any[], cursor: string | undefined }> {
    const algorithm = timelineOpt?.algorithm ?? {};
    const limit = timelineOpt?.limit || 20;
    const rawCursor = typeof timelineOpt?.cursor === 'string' ? timelineOpt.cursor : '';
    const isHead = !rawCursor;

    const members = await resolveMembers(agent, algorithm, isHead);
    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
    if (members.length === 0) {
        return { feed: [], cursor: undefined };
    }

    const sources = sourcesFromMembers(members);
    const fingerprint = fingerprintSources(sources);
    const resume = isHead ? null : decodeMergeCursor(rawCursor, sources);

    if (!isHead && !resume) {
        return { feed: [], cursor: undefined };
    }

    let pool: MergePool | null = null;
    if (!isHead && resume) {
        pool = takePool(algorithm, fingerprint, rawCursor);
    }
    if (!pool) {
        pool = createPool(sources, resume);
        if (!isHead && resume) {
            pool.issuedCursor = rawCursor;
        }
    }

    const pageLimit = pageLimitFor(sources.length);
    const fetchOne = (srcIdx: number, cursor: string) => {
        return agent.xrpc.get('app.bsky.feed.getAuthorFeed', {
            actor: sources[srcIdx].algorithm,
            limit: pageLimit,
            cursor,
        }, { signal });
    };

    const maxRounds = isHead ? 1 : MAX_ROUNDS;
    let anySuccess = false;

    for (let round = 0; round < maxRounds; round++) {
        if (emittableCount(pool) >= limit) {
            break;
        }
        const plan = planRefill(pool);
        if (plan.length === 0) {
            break;
        }

        let roundHadSuccess = false;
        for (let i = 0; i < plan.length; i += FETCH_CONCURRENCY) {
            const chunk = plan.slice(i, i + FETCH_CONCURRENCY);
            const results = await Promise.allSettled(chunk.map(p => fetchOne(p.srcIdx, p.cursor)));
            if (signal?.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }

            results.forEach((result, j) => {
                const { srcIdx, cursor } = chunk[j];
                if (result.status === 'fulfilled' && result.value) {
                    roundHadSuccess = true;
                    anySuccess = true;
                    integratePage(pool!, srcIdx, cursor, result.value);
                } else {
                    markFetchFailed(pool!, srcIdx);
                }
            });
        }

        if (!roundHadSuccess) {
            break;
        }
    }

    if (isHead) {
        if (!anySuccess) {
            throw new Error('CloudListHeadFetchFailed');
        }
        for (const src of pool.sources) {
            if (src.failures > 0) {
                src.failures = 2;
            }
        }
        const result = emitBatch(pool, sources, limit);
        storePool(algorithm, pool);
        return result;
    }

    if (!anySuccess && emittableCount(pool) === 0) {
        storePool(algorithm, pool);
        return { feed: [], cursor: rawCursor };
    }

    const result = emitBatch(pool, sources, limit);
    storePool(algorithm, pool);
    return result;
}
