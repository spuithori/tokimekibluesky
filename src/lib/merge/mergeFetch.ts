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

const PAGE_LIMIT = 20;
const MAX_ROUNDS = 8;
const POOL_SLOTS = 2;

const poolSlots = new WeakMap<object, MergePool[]>();

function takePool(ref: object, fingerprint: string, cursor: string): MergePool | null {
    const slots = poolSlots.get(ref);
    if (!slots) {
        return null;
    }
    const i = slots.findIndex(p => p.fingerprint === fingerprint && p.issuedCursor === cursor);
    if (i === -1) {
        return null;
    }
    return slots.splice(i, 1)[0];
}

function storePool(ref: object, pool: MergePool): void {
    if (!pool.issuedCursor) {
        return;
    }
    let slots = poolSlots.get(ref);
    if (!slots) {
        slots = [];
        poolSlots.set(ref, slots);
    }
    slots.unshift(pool);
    if (slots.length > POOL_SLOTS) {
        slots.length = POOL_SLOTS;
    }
}

export function dropMergePools(ref: object | null | undefined): void {
    if (ref && typeof ref === 'object') {
        poolSlots.delete(ref);
    }
}

export function takeSourceRemainder(
    ref: object | null | undefined,
    sources: MergeSource[],
    issuedCursor: unknown,
    srcIdx: number,
): { items: any[], cursor?: string } | null {
    if (!ref || typeof ref !== 'object' || typeof issuedCursor !== 'string' || !issuedCursor) {
        return null;
    }
    const slots = poolSlots.get(ref);
    const pool = slots?.find(p => p.issuedCursor === issuedCursor && p.fingerprint === fingerprintSources(sources));
    const src = pool?.sources[srcIdx];
    if (!pool || !src) {
        return null;
    }

    const entries = pool.entries
        .filter(e => e.srcIdx === srcIdx)
        .sort((a, b) => (b.key - a.key) || (a.pagePos - b.pagePos));
    const items = entries.map(e => e.item);
    return { items, cursor: src.exhausted ? undefined : (src.fetchCursor ?? undefined) };
}

export async function getMergedTimeline(agent: any, timelineOpt: any, signal?: AbortSignal): Promise<{ feed: any[], cursor: string | undefined }> {
    const algorithm = timelineOpt?.algorithm ?? {};
    const sources: MergeSource[] = Array.isArray(algorithm.sources) ? algorithm.sources : [];
    const limit = timelineOpt?.limit || 20;
    const rawCursor = typeof timelineOpt?.cursor === 'string' ? timelineOpt.cursor : '';

    if (sources.length === 0) {
        return { feed: [], cursor: undefined };
    }

    const fingerprint = fingerprintSources(sources);
    const isHead = !rawCursor;
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

    const fetchOne = (srcIdx: number, cursor: string) => {
        const source = sources[srcIdx];
        return agent.getTimelineByAlgo({
            limit: PAGE_LIMIT,
            cursor,
            algorithm: { type: source.type, algorithm: source.algorithm, name: source.name },
            type: 'default',
            lang: timelineOpt?.lang,
        }, signal);
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

        const results = await Promise.allSettled(plan.map(p => fetchOne(p.srcIdx, p.cursor)));
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }

        let roundHadSuccess = false;
        results.forEach((result, i) => {
            const { srcIdx, cursor } = plan[i];
            if (result.status === 'fulfilled' && result.value) {
                roundHadSuccess = true;
                anySuccess = true;
                integratePage(pool!, srcIdx, cursor, result.value);
            } else {
                markFetchFailed(pool!, srcIdx);
            }
        });

        if (!roundHadSuccess) {
            break;
        }
    }

    if (isHead) {
        if (!anySuccess) {
            throw new Error('MergeHeadFetchFailed');
        }
        for (const src of pool.sources) {
            if (src.failures > 0) {
                src.failures = 2;
            }
        }
        return emitBatch(pool, sources, limit);
    }

    if (!anySuccess && emittableCount(pool) === 0) {
        storePool(algorithm, pool);
        return { feed: [], cursor: rawCursor };
    }

    const result = emitBatch(pool, sources, limit);
    storePool(algorithm, pool);
    return result;
}

export function seedMergePool(
    algorithmRef: object,
    sources: MergeSource[],
    inputs: Array<{ feed?: any[], cursor?: string }>,
): { feed: any[], cursor: string | undefined } {
    const pool = createPool(sources, null);

    inputs.forEach((input, srcIdx) => {
        if (srcIdx >= sources.length) {
            return;
        }
        const items = (input?.feed ?? [])
            .filter(item => item?.post?.uri)
            .map(({ isDivider, memoryCursor, __sourceId, ...rest }) => rest);
        if (items.length === 0 && !input?.cursor) {
            return;
        }
        integratePage(pool, srcIdx, '', { feed: items, cursor: input?.cursor });
    });

    const result = emitBatch(pool, sources, Number.MAX_SAFE_INTEGER);
    storePool(algorithmRef, pool);
    return result;
}
