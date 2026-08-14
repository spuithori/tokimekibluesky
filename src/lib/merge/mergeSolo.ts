import { decodeMergeCursor, dedupKeyOf, type MergeSource } from './mergeEngine';

export type SoloLoadState = {
    cursor: string,
    complete: boolean,
};

export const SOLO_FEED_SUFFIX = '::merge-solo';

export function soloFeedKey(columnId: string): string {
    return `${columnId}${SOLO_FEED_SUFFIX}`;
}

export function initialSoloState(rawCursor: unknown, sources: MergeSource[], sourceId: string): SoloLoadState {
    const index = sources.findIndex(s => s.id === sourceId);
    if (index === -1) {
        return { cursor: '', complete: true };
    }
    if (rawCursor === undefined || rawCursor === null) {
        return { cursor: '', complete: true };
    }
    if (rawCursor === '') {
        return { cursor: '', complete: false };
    }

    const state = decodeMergeCursor(rawCursor, sources);
    if (!state) {
        return { cursor: '', complete: false };
    }

    const c = state.s[index]?.c;
    if (c === null || c === undefined) {
        return { cursor: '', complete: true };
    }
    return { cursor: c, complete: false };
}

export function visibleSoloKeys(mainFeed: any[], extraFeed: any[], sourceId: string): Set<string> {
    const keys = new Set<string>();
    for (const item of mainFeed ?? []) {
        if (item?.__sourceId !== sourceId) {
            continue;
        }
        const key = dedupKeyOf(item);
        if (key) {
            keys.add(key);
        }
    }
    for (const item of extraFeed ?? []) {
        const key = dedupKeyOf(item);
        if (key) {
            keys.add(key);
        }
    }
    return keys;
}

export function appendSoloPage(
    existingKeys: Set<string>,
    page: { feed?: any[], cursor?: string } | undefined,
    sourceId: string,
): { items: any[], cursor?: string, complete: boolean } {
    const rawItems = Array.isArray(page?.feed) ? page.feed : [];
    const items: any[] = [];

    for (const raw of rawItems) {
        if (!raw?.post?.uri) {
            continue;
        }
        const key = dedupKeyOf(raw);
        if (!key || existingKeys.has(key)) {
            continue;
        }
        existingKeys.add(key);
        const { memoryCursor, isDivider, ...rest } = raw;
        items.push({ ...rest, __sourceId: sourceId });
    }

    const cursor = typeof page?.cursor === 'string' && page.cursor !== '' ? page.cursor : undefined;
    return { items, cursor, complete: cursor === undefined };
}
