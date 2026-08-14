import type { MergeSource } from './mergeEngine';

export const MERGE_PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

export function mergeSourceColor(sources: MergeSource[] | undefined, sourceId: string | undefined): string | null {
    if (!sources || !sourceId) {
        return null;
    }
    const index = sources.findIndex(s => s.id === sourceId);
    if (index === -1) {
        return null;
    }
    return MERGE_PALETTE[index % MERGE_PALETTE.length];
}
