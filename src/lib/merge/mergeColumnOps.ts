import type { Column } from '$lib/types/column';
import { decodeMergeCursor, type MergeSource, type MergeSourceType } from './mergeEngine';
import { seedMergePool, takeSourceRemainder } from './mergeFetch';
import { soloFeedKey } from './mergeSolo';

type ColumnStateLike = {
    columnById: Map<string, Column>,
    getFeed: (columnId: string) => any[],
    setFeed: (columnId: string, feed: any[]) => void,
    deleteFeed: (columnId: string) => void,
    remove: (id: string) => void,
    add: (column: Column) => void,
    splitColumnAt: (leafColumnId: string, newColumn: Column, direction?: 'row' | 'column') => void,
    moveLeafToSlot: (sourceColumnId: string, slotIndex: number) => void,
    slotIndexOf: (columnId: string) => number,
    slots: { length: number }[] | any[],
};

function clearSoloState(columnState: ColumnStateLike, column: Column): void {
    column.data.mergeSolo = undefined;
    column.data.mergeSoloCursor = undefined;
    column.data.mergeSoloComplete = undefined;
    columnState.deleteFeed(soloFeedKey(column.id));
}

export const MAX_MERGE_SOURCES = 5;

const MERGEABLE_TYPES = new Set(['default', 'custom', 'officialList', 'author', 'merge']);

function plainSources(sources: any[] | undefined): MergeSource[] {
    return (sources ?? []).map(s => ({
        id: s.id,
        type: s.type,
        algorithm: s.algorithm,
        name: s.name,
    }));
}

export function sourcesOf(column: Column): MergeSource[] {
    if (column.algorithm.type === 'merge') {
        return plainSources(column.algorithm.sources);
    }
    return [{
        id: self.crypto.randomUUID(),
        type: column.algorithm.type as MergeSourceType,
        algorithm: column.algorithm.algorithm,
        name: column.algorithm.name ?? column.algorithm.type,
    }];
}

export function canMergeColumns(target: Column | undefined, source: Column | undefined): boolean {
    if (!target || !source || target.id === source.id) {
        return false;
    }
    if (!MERGEABLE_TYPES.has(target.algorithm?.type) || !MERGEABLE_TYPES.has(source.algorithm?.type)) {
        return false;
    }
    if (target.did !== source.did) {
        return false;
    }
    if (target.settings?.isPopup || source.settings?.isPopup) {
        return false;
    }
    const count = (target.algorithm.type === 'merge' ? (target.algorithm.sources?.length ?? 0) : 1)
        + (source.algorithm.type === 'merge' ? (source.algorithm.sources?.length ?? 0) : 1);
    return count <= MAX_MERGE_SOURCES;
}

function stripItem(item: any): any {
    const { __sourceId, isDivider, memoryCursor, ...rest } = item ?? {};
    return rest;
}

function seedInputsOf(columnState: ColumnStateLike, column: Column): Array<{ feed: any[], cursor?: string }> {
    const feed = columnState.getFeed(column.id).filter(item => item?.post?.uri);

    if (column.algorithm.type !== 'merge') {
        const cursor = typeof column.data?.cursor === 'string' ? column.data.cursor : undefined;
        return [{ feed, cursor }];
    }

    const sources = plainSources(column.algorithm.sources);
    const state = decodeMergeCursor(column.data?.cursor, sources);
    return sources.map((source, i) => {
        if (!state) {
            return { feed: [], cursor: '' };
        }
        const items = feed.filter(item => item?.__sourceId === source.id);
        const pooled = takeSourceRemainder(column.algorithm, sources, column.data?.cursor, i);
        if (pooled) {
            return { feed: [...items, ...pooled.items], cursor: pooled.cursor };
        }
        const c = state.s[i]?.c;
        if (c === '') {
            return { feed: [], cursor: '' };
        }
        return { feed: items, cursor: c ?? undefined };
    });
}

function mergedName(sources: MergeSource[]): string {
    return sources.map(s => s.name).filter(Boolean).join(' + ');
}

export function mergeColumns(columnState: ColumnStateLike, targetId: string, sourceId: string): boolean {
    const target = columnState.columnById.get(targetId);
    const source = columnState.columnById.get(sourceId);
    if (!target || !source || !canMergeColumns(target, source)) {
        return false;
    }

    const sources = [...sourcesOf(target), ...sourcesOf(source)];
    const inputs = [...seedInputsOf(columnState, target), ...seedInputsOf(columnState, source)];

    target.algorithm = {
        type: 'merge',
        name: mergedName(sources),
        sources,
    };

    const algorithmRef = target.algorithm;
    const seed = seedMergePool(algorithmRef, plainSources(algorithmRef.sources), inputs);

    if (seed.cursor) {
        for (const item of seed.feed) {
            item.memoryCursor = seed.cursor;
        }
    }

    columnState.setFeed(targetId, seed.feed);
    target.data.cursor = seed.cursor;
    target.data.scrollState = undefined;
    clearSoloState(columnState, target);
    target.unreadCount = 0;

    columnState.remove(sourceId);
    return true;
}

function buildRemainder(columnState: ColumnStateLike, column: Column, remaining: MergeSource[], inputs: Array<{ feed: any[], cursor?: string }>): void {
    if (remaining.length === 1) {
        const r = remaining[0];
        column.algorithm = {
            type: r.type,
            algorithm: r.algorithm,
            name: r.name,
        } as Column['algorithm'];
        const input = inputs[0];
        const items = input.feed.map(item => {
            const rest = stripItem(item);
            if (input.cursor) {
                rest.memoryCursor = input.cursor;
            }
            return rest;
        });
        columnState.setFeed(column.id, items);
        column.data.cursor = input.cursor;
    } else {
        column.algorithm = {
            type: 'merge',
            name: mergedName(remaining),
            sources: remaining,
        };
        const seed = seedMergePool(column.algorithm, plainSources(column.algorithm.sources), inputs);
        if (seed.cursor) {
            for (const item of seed.feed) {
                item.memoryCursor = seed.cursor;
            }
        }
        columnState.setFeed(column.id, seed.feed);
        column.data.cursor = seed.cursor;
    }

    column.data.scrollState = undefined;
    clearSoloState(columnState, column);
}

function splitOutSource(columnState: ColumnStateLike, column: Column, index: number): { extracted: MergeSource, remaining: MergeSource[], extractedInput: { feed: any[], cursor?: string }, remainingInputs: Array<{ feed: any[], cursor?: string }> } | null {
    if (column.algorithm.type !== 'merge') {
        return null;
    }
    const sources = plainSources(column.algorithm.sources);
    if (index < 0 || index >= sources.length || sources.length < 2) {
        return null;
    }

    const allInputs = seedInputsOf(columnState, column);
    const extracted = sources[index];
    const remaining = sources.filter((_, i) => i !== index);
    const remainingInputs = allInputs.filter((_, i) => i !== index);

    return { extracted, remaining, extractedInput: allInputs[index], remainingInputs };
}

export function extractMergeSource(
    columnState: ColumnStateLike,
    columnId: string,
    sourceId: string,
    drop: { kind: 'split', id: string, zone: 'top' | 'bottom' | 'left' | 'right' } | { kind: 'extract', beforeId: string | null } | { kind: 'merge', id: string },
): boolean {
    const column = columnState.columnById.get(columnId);
    if (!column || column.algorithm.type !== 'merge') {
        return false;
    }
    const sources = plainSources(column.algorithm.sources);
    const index = sources.findIndex(s => s.id === sourceId);
    const parts = splitOutSource(columnState, column, index);
    if (!parts) {
        return false;
    }

    const { extracted, remaining, extractedInput, remainingInputs } = parts;

    const items = extractedInput.feed.map(item => {
        const rest = stripItem(item);
        if (extractedInput.cursor) {
            rest.memoryCursor = extractedInput.cursor;
        }
        return rest;
    });

    const newColumn: Column = {
        id: self.crypto.randomUUID(),
        algorithm: {
            type: extracted.type,
            algorithm: extracted.algorithm,
            name: extracted.name,
        } as Column['algorithm'],
        style: 'default',
        settings: JSON.parse(JSON.stringify({ ...column.settings, isPopup: false, popupPosition: undefined })),
        did: column.did,
        handle: column.handle,
        data: {
            feed: items,
            cursor: extractedInput.cursor,
        },
    };

    if (drop.kind === 'merge') {
        return false;
    }

    if (drop.kind === 'split') {
        if (columnState.slotIndexOf(drop.id) === -1) {
            return false;
        }
        buildRemainder(columnState, column, remaining, remainingInputs);
        const direction = drop.zone === 'left' || drop.zone === 'right' ? 'row' : 'column';
        columnState.splitColumnAt(drop.id, newColumn, direction);
        return true;
    }

    const slotIndex = drop.beforeId ? columnState.slotIndexOf(drop.beforeId) : columnState.slots.length;
    buildRemainder(columnState, column, remaining, remainingInputs);
    columnState.add(newColumn);
    columnState.moveLeafToSlot(newColumn.id, slotIndex === -1 ? columnState.slots.length : slotIndex);
    return true;
}

export function removeMergeSource(columnState: ColumnStateLike, columnId: string, sourceId: string): boolean {
    const column = columnState.columnById.get(columnId);
    if (!column || column.algorithm.type !== 'merge') {
        return false;
    }
    const sources = plainSources(column.algorithm.sources);
    const index = sources.findIndex(s => s.id === sourceId);
    const parts = splitOutSource(columnState, column, index);
    if (!parts) {
        return false;
    }

    buildRemainder(columnState, column, parts.remaining, parts.remainingInputs);
    return true;
}
