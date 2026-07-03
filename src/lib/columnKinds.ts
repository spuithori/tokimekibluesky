import type { currentAlgorithm } from '$lib/types/column';

export const CONTENT_COLUMN_TYPES = ['publish', 'settings'] as const satisfies readonly currentAlgorithm['type'][];

export type ContentColumnType = (typeof CONTENT_COLUMN_TYPES)[number];

export function isContentColumn(type?: string): boolean {
    return type !== undefined && (CONTENT_COLUMN_TYPES as readonly string[]).includes(type);
}
