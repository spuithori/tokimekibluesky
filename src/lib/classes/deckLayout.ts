import type { Column } from "$lib/types/column";

export type LayoutNode =
    | { type: 'leaf'; columnId: string }
    | { type: 'split'; direction: 'row' | 'column'; sizes: number[]; children: LayoutNode[] };

export type Slot = { id: string; layout: LayoutNode };

export interface DeckLayoutState {
    columns: Column[];
    slots: Slot[];
}

export const DECK_SCHEMA_VERSION = 2;

const DEFAULT_RATIO = 0.5;

export function isLeaf(node: LayoutNode): node is { type: 'leaf'; columnId: string } {
    return node.type === 'leaf';
}

export function flattenLeafIds(node: LayoutNode, acc: string[] = []): string[] {
    if (node.type === 'leaf') {
        acc.push(node.columnId);
    } else {
        for (const child of node.children) flattenLeafIds(child, acc);
    }
    return acc;
}

export function slotIndexOfColumn(slots: Slot[], columnId: string): number {
    return slots.findIndex(s => flattenLeafIds(s.layout).includes(columnId));
}

export function firstLeafId(node: LayoutNode): string {
    let n = node;
    while (n.type === 'split') n = n.children[0];
    return n.columnId;
}

function stripLegacy(col: any): Column {
    if (!col) return col;
    const { splitColumn, splitRatio, ...rest } = col;
    return rest as Column;
}

function legacyColumnToNode(col: any): { columns: Column[]; node: LayoutNode } {
    const columns: Column[] = [];
    const build = (c: any): LayoutNode => {
        const base = stripLegacy(c);
        columns.push(base);
        const leaf: LayoutNode = { type: 'leaf', columnId: base.id };
        if (c?.splitColumn) {
            const childNode = build(c.splitColumn);
            const r = typeof c.splitRatio === 'number' ? c.splitRatio : DEFAULT_RATIO;
            return { type: 'split', direction: 'column', sizes: [r, 1 - r], children: [leaf, childNode] };
        }
        return leaf;
    };
    const node = build(col);
    return { columns, node };
}

export function migrateLegacyColumns(legacy: any[], genId: () => string): DeckLayoutState {
    const columns: Column[] = [];
    const slots: Slot[] = [];
    for (const col of legacy ?? []) {
        if (!col) continue;
        const { columns: leafCols, node } = legacyColumnToNode(col);
        columns.push(...leafCols);
        slots.push({ id: genId(), layout: node });
    }
    return { columns, slots };
}

function sanitizeNode(node: any, validIds: Set<string>): LayoutNode | null {
    if (!node || typeof node !== 'object') return null;
    if (node.type === 'leaf') {
        return typeof node.columnId === 'string' && validIds.has(node.columnId)
            ? { type: 'leaf', columnId: node.columnId }
            : null;
    }
    if (node.type === 'split' && Array.isArray(node.children)) {
        const kept: LayoutNode[] = [];
        const sizes: number[] = [];
        node.children.forEach((child: any, i: number) => {
            const r = sanitizeNode(child, validIds);
            if (r) {
                kept.push(r);
                const s = Array.isArray(node.sizes) ? node.sizes[i] : undefined;
                sizes.push(typeof s === 'number' && s > 0 ? s : 1);
            }
        });
        if (kept.length === 0) return null;
        if (kept.length === 1) return kept[0];
        const total = sizes.reduce((a, b) => a + b, 0) || 1;
        return {
            type: 'split',
            direction: node.direction === 'row' ? 'row' : 'column',
            sizes: sizes.map(s => s / total),
            children: kept,
        };
    }
    if (Array.isArray(node.children)) {
        const leaves: LayoutNode[] = [];
        for (const child of node.children) {
            const id = typeof child === 'string' ? child : (child?.type === 'leaf' ? child.columnId : null);
            if (typeof id === 'string' && validIds.has(id)) {
                leaves.push({ type: 'leaf', columnId: id });
            }
        }
        if (leaves.length === 0) return null;
        if (leaves.length === 1) return leaves[0];
        return { type: 'split', direction: 'column', sizes: leaves.map(() => 1 / leaves.length), children: leaves };
    }
    return null;
}

export function reconcileDeckState(rawColumns: any[], rawSlots: any[], genId: () => string): DeckLayoutState {
    const columns: Column[] = [];
    const validIds = new Set<string>();
    for (const col of rawColumns ?? []) {
        if (!col || typeof col.id !== 'string' || validIds.has(col.id)) continue;
        const clean = stripLegacy(col);
        columns.push(clean);
        validIds.add(clean.id);
    }

    const slots: Slot[] = [];
    const seenLeafIds = new Set<string>();
    const seenSlotIds = new Set<string>();
    for (const s of rawSlots ?? []) {
        let node = sanitizeNode(s?.layout, validIds);
        if (!node) continue;
        for (const id of flattenLeafIds(node)) {
            if (seenLeafIds.has(id)) {
                node = removeLeaf(node, id);
                if (!node) break;
            }
        }
        if (!node) continue;
        for (const id of flattenLeafIds(node)) seenLeafIds.add(id);
        const slotId = typeof s?.id === 'string' && !seenSlotIds.has(s.id) ? s.id : genId();
        seenSlotIds.add(slotId);
        slots.push({ id: slotId, layout: node });
    }

    for (const col of columns) {
        if (!seenLeafIds.has(col.id)) {
            slots.push({ id: genId(), layout: { type: 'leaf', columnId: col.id } });
        }
    }

    return { columns, slots };
}

export function loadDeckState(persisted: any, genId: () => string): DeckLayoutState {
    if (persisted && persisted.version >= DECK_SCHEMA_VERSION && Array.isArray(persisted.columns) && Array.isArray(persisted.slots)) {
        return reconcileDeckState(persisted.columns, persisted.slots, genId);
    }
    const legacy = Array.isArray(persisted) ? persisted : (persisted?.columns ?? []);
    return migrateLegacyColumns(legacy, genId);
}

function collapseSingle(node: LayoutNode): LayoutNode {
    if (node.type === 'leaf') return node;
    const children = node.children.map(collapseSingle);
    if (children.length === 1) return children[0];
    return { ...node, children };
}

function removeLeaf(node: LayoutNode, columnId: string): LayoutNode | null {
    if (node.type === 'leaf') {
        return node.columnId === columnId ? null : node;
    }
    const kept: LayoutNode[] = [];
    const sizes: number[] = [];
    node.children.forEach((child, i) => {
        const r = removeLeaf(child, columnId);
        if (r) {
            kept.push(r);
            sizes.push(node.sizes[i]);
        }
    });
    if (kept.length === 0) return null;
    const total = sizes.reduce((a, b) => a + b, 0) || 1;
    const norm = sizes.map(s => s / total);
    return collapseSingle({ type: 'split', direction: node.direction, sizes: norm, children: kept });
}

function replaceLeaf(node: LayoutNode, targetColumnId: string, replacement: LayoutNode): LayoutNode {
    if (node.type === 'leaf') {
        return node.columnId === targetColumnId ? replacement : node;
    }
    return { ...node, children: node.children.map(c => replaceLeaf(c, targetColumnId, replacement)) };
}

export function splitLeaf(
    state: DeckLayoutState,
    targetColumnId: string,
    newColumn: Column,
    direction: 'row' | 'column' = 'column',
): DeckLayoutState {
    const slotIndex = slotIndexOfColumn(state.slots, targetColumnId);
    if (slotIndex === -1) return state;

    const columns = [...state.columns, newColumn];
    const replacement: LayoutNode = {
        type: 'split',
        direction,
        sizes: [DEFAULT_RATIO, 1 - DEFAULT_RATIO],
        children: [
            { type: 'leaf', columnId: targetColumnId },
            { type: 'leaf', columnId: newColumn.id },
        ],
    };
    const slots = state.slots.map((s, i) =>
        i === slotIndex ? { ...s, layout: replaceLeaf(s.layout, targetColumnId, replacement) } : s,
    );
    return { columns, slots };
}

export function splitLeafWithExisting(
    state: DeckLayoutState,
    targetColumnId: string,
    sourceColumnId: string,
    direction: 'row' | 'column' = 'column',
): DeckLayoutState {
    const slotIndex = slotIndexOfColumn(state.slots, targetColumnId);
    if (slotIndex === -1) return state;
    const sourceSlotIndex = slotIndexOfColumn(state.slots, sourceColumnId);
    const sourceSlotId = sourceSlotIndex !== -1 ? state.slots[sourceSlotIndex].id : undefined;

    const replacement: LayoutNode = {
        type: 'split',
        direction,
        sizes: [DEFAULT_RATIO, 1 - DEFAULT_RATIO],
        children: [
            { type: 'leaf', columnId: targetColumnId },
            { type: 'leaf', columnId: sourceColumnId },
        ],
    };
    let slots = state.slots.map((s, i) =>
        i === slotIndex ? { ...s, layout: replaceLeaf(s.layout, targetColumnId, replacement) } : s,
    );
    if (sourceSlotId !== undefined) {
        slots = slots.filter(s => s.id !== sourceSlotId);
    }
    return { columns: state.columns, slots };
}

export function unsplitAt(
    state: DeckLayoutState,
    slotIndex: number,
    leafColumnId: string,
    keepAsSeparate: boolean,
    genId: () => string,
): DeckLayoutState {
    const slot = state.slots[slotIndex];
    if (!slot) return state;

    const slots = [...state.slots];
    const remaining = removeLeaf(slot.layout, leafColumnId);
    if (remaining) {
        slots[slotIndex] = { ...slot, layout: remaining };
    } else {
        slots.splice(slotIndex, 1);
    }

    let columns = state.columns;
    if (keepAsSeparate) {
        slots.push({ id: genId(), layout: { type: 'leaf', columnId: leafColumnId } });
    } else {
        columns = state.columns.filter(c => c.id !== leafColumnId);
    }

    return { columns, slots };
}

function detachLeaf(slots: Slot[], sourceColumnId: string): Slot[] {
    const srcSlotIdx = slotIndexOfColumn(slots, sourceColumnId);
    if (srcSlotIdx === -1) return slots;
    const next = [...slots];
    const remaining = removeLeaf(next[srcSlotIdx].layout, sourceColumnId);
    if (remaining) {
        next[srcSlotIdx] = { ...next[srcSlotIdx], layout: remaining };
    } else {
        next.splice(srcSlotIdx, 1);
    }
    return next;
}

export function moveLeafToSplit(
    state: DeckLayoutState,
    sourceColumnId: string,
    targetColumnId: string,
    direction: 'row' | 'column' = 'column',
    sourceFirst = false,
): DeckLayoutState {
    if (sourceColumnId === targetColumnId) return state;
    if (slotIndexOfColumn(state.slots, sourceColumnId) === -1) return state;

    const slots = detachLeaf(state.slots, sourceColumnId);
    const tgtSlotIdx = slotIndexOfColumn(slots, targetColumnId);
    if (tgtSlotIdx === -1) return state;

    const sourceLeaf: LayoutNode = { type: 'leaf', columnId: sourceColumnId };
    const targetLeaf: LayoutNode = { type: 'leaf', columnId: targetColumnId };
    const replacement: LayoutNode = {
        type: 'split',
        direction,
        sizes: [DEFAULT_RATIO, 1 - DEFAULT_RATIO],
        children: sourceFirst ? [sourceLeaf, targetLeaf] : [targetLeaf, sourceLeaf],
    };
    const next = slots.map((s, i) => (i === tgtSlotIdx ? { ...s, layout: replaceLeaf(s.layout, targetColumnId, replacement) } : s));
    return { columns: state.columns, slots: next };
}

export function moveLeafToSlot(
    state: DeckLayoutState,
    sourceColumnId: string,
    slotIndex: number,
    genId: () => string,
): DeckLayoutState {
    if (slotIndexOfColumn(state.slots, sourceColumnId) === -1) return state;
    const slots = detachLeaf(state.slots, sourceColumnId);
    const idx = Math.max(0, Math.min(slotIndex, slots.length));
    slots.splice(idx, 0, { id: genId(), layout: { type: 'leaf', columnId: sourceColumnId } });
    return { columns: state.columns, slots };
}

export function swapAt(state: DeckLayoutState, slotIndex: number): DeckLayoutState {
    const slot = state.slots[slotIndex];
    if (!slot || slot.layout.type !== 'split') return state;
    const layout: LayoutNode = {
        ...slot.layout,
        sizes: [...slot.layout.sizes].reverse(),
        children: [...slot.layout.children].reverse(),
    };
    const slots = state.slots.map((s, i) => (i === slotIndex ? { ...s, layout } : s));
    return { columns: state.columns, slots };
}
