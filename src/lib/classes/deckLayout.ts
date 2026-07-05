import type { Column } from "$lib/types/column";
import { capabilityOf } from "$lib/columnKinds";

export type TabsNode = { type: 'tabs'; children: string[]; active: number };

export type LayoutNode =
    | { type: 'leaf'; columnId: string }
    | TabsNode
    | { type: 'split'; direction: 'row' | 'column'; sizes: number[]; children: LayoutNode[] };

export type Slot = { id: string; layout: LayoutNode };

export interface DeckLayoutState {
    columns: Column[];
    slots: Slot[];
}

export const DECK_SCHEMA_VERSION = 4;

export type LegacyPublishPrefs = {
    layout: 'left' | 'bottom' | 'popup' | null,
    pinned: boolean,
};

export type LoadDeckOptions = {
    legacyPublish?: LegacyPublishPrefs | null,
    injectPublish?: boolean,
    makePublishColumn?: () => Column,
};

const DEFAULT_RATIO = 0.5;

export function isLeaf(node: LayoutNode): node is { type: 'leaf'; columnId: string } {
    return node.type === 'leaf';
}

export function flattenLeafIds(node: LayoutNode, acc: string[] = []): string[] {
    if (node.type === 'leaf') {
        acc.push(node.columnId);
    } else if (node.type === 'tabs') {
        acc.push(...node.children);
    } else {
        for (const child of node.children) flattenLeafIds(child, acc);
    }
    return acc;
}

export function slotIndexOfColumn(slots: Slot[], columnId: string): number {
    return slots.findIndex(s => flattenLeafIds(s.layout).includes(columnId));
}

function activeTabId(node: TabsNode): string {
    return node.children[Math.max(0, Math.min(node.active ?? 0, node.children.length - 1))];
}

export function firstLeafId(node: LayoutNode): string {
    let n = node;
    while (n.type !== 'leaf') {
        if (n.type === 'tabs') return activeTabId(n);
        n = n.children[0];
    }
    return n.columnId;
}

export function findTabsNodeOf(node: LayoutNode, columnId: string): TabsNode | null {
    if (node.type === 'leaf') return null;
    if (node.type === 'tabs') return node.children.includes(columnId) ? node : null;
    for (const child of node.children) {
        const found = findTabsNodeOf(child, columnId);
        if (found) return found;
    }
    return null;
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

export function migrateV2toV3(state: DeckLayoutState, opts: LoadDeckOptions, genId: () => string): DeckLayoutState {
    try {
        if (!opts.injectPublish || !opts.makePublishColumn) return state;
        if (state.columns.some(c => c?.algorithm?.type === 'publish')) return state;

        const prefs = opts.legacyPublish;
        if (!prefs || prefs.layout !== 'left' || !prefs.pinned) return state;

        const column = opts.makePublishColumn();
        if (!column?.id) return state;

        return {
            columns: [...state.columns, column],
            slots: [{ id: genId(), layout: { type: 'leaf', columnId: column.id } }, ...state.slots],
        };
    } catch {
        return state;
    }
}

export function normalizeContentColumns(state: DeckLayoutState): DeckLayoutState {
    try {
        const seen = new Set<string>();
        const removeIds = new Set<string>();
        for (const c of state.columns) {
            const type = c?.algorithm?.type;
            if (type === undefined || !capabilityOf(type).singleton) continue;
            if (seen.has(type)) {
                removeIds.add(c.id);
            } else {
                seen.add(type);
            }
        }
        if (removeIds.size === 0) return state;

        const columns = state.columns.filter(c => !removeIds.has(c.id));
        let slots = state.slots;
        for (const id of removeIds) {
            slots = detachLeaf(slots, id);
        }
        return { columns, slots };
    } catch {
        return state;
    }
}

export function loadDeckState(persisted: any, genId: () => string, opts: LoadDeckOptions = {}): DeckLayoutState {
    if (persisted && persisted.version >= 3 && Array.isArray(persisted.columns) && Array.isArray(persisted.slots)) {
        return normalizeTabsNodes(normalizeContentColumns({ columns: persisted.columns, slots: persisted.slots }));
    }
    if (persisted && persisted.version === 2 && Array.isArray(persisted.columns) && Array.isArray(persisted.slots)) {
        return migrateV2toV3({ columns: persisted.columns, slots: persisted.slots }, opts, genId);
    }
    const legacyRaw = Array.isArray(persisted) ? persisted : (persisted?.columns ?? []);
    const legacy = Array.isArray(legacyRaw) ? legacyRaw : [];
    return migrateV2toV3(migrateLegacyColumns(legacy, genId), opts, genId);
}

function collapseSingle(node: LayoutNode): LayoutNode {
    if (node.type === 'leaf') return node;
    if (node.type === 'tabs') {
        return node.children.length === 1 ? { type: 'leaf', columnId: node.children[0] } : node;
    }
    const children = node.children.map(collapseSingle);
    if (children.length === 1) return children[0];
    return { ...node, children };
}

function removeLeaf(node: LayoutNode, columnId: string): LayoutNode | null {
    if (node.type === 'leaf') {
        return node.columnId === columnId ? null : node;
    }
    if (node.type === 'tabs') {
        const idx = node.children.indexOf(columnId);
        if (idx === -1) return node;
        const children = node.children.filter(id => id !== columnId);
        if (children.length === 0) return null;
        if (children.length === 1) return { type: 'leaf', columnId: children[0] };
        const active = Math.max(0, Math.min(node.active > idx ? node.active - 1 : node.active, children.length - 1));
        return { type: 'tabs', children, active };
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

function findTargetNode(node: LayoutNode, columnId: string): LayoutNode | null {
    if (node.type === 'leaf') return node.columnId === columnId ? node : null;
    if (node.type === 'tabs') return node.children.includes(columnId) ? node : null;
    for (const child of node.children) {
        const found = findTargetNode(child, columnId);
        if (found) return found;
    }
    return null;
}

function replaceTarget(node: LayoutNode, targetColumnId: string, replacement: LayoutNode): LayoutNode {
    if (node.type === 'leaf') {
        return node.columnId === targetColumnId ? replacement : node;
    }
    if (node.type === 'tabs') {
        return node.children.includes(targetColumnId) ? replacement : node;
    }
    return { ...node, children: node.children.map(c => replaceTarget(c, targetColumnId, replacement)) };
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
    const targetNode = findTargetNode(state.slots[slotIndex].layout, targetColumnId) ?? { type: 'leaf', columnId: targetColumnId } as LayoutNode;
    const replacement: LayoutNode = {
        type: 'split',
        direction,
        sizes: [DEFAULT_RATIO, 1 - DEFAULT_RATIO],
        children: [
            targetNode,
            { type: 'leaf', columnId: newColumn.id },
        ],
    };
    const slots = state.slots.map((s, i) =>
        i === slotIndex ? { ...s, layout: replaceTarget(s.layout, targetColumnId, replacement) } : s,
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

    const targetNode = findTargetNode(state.slots[slotIndex].layout, targetColumnId) ?? { type: 'leaf', columnId: targetColumnId } as LayoutNode;
    const replacement: LayoutNode = {
        type: 'split',
        direction,
        sizes: [DEFAULT_RATIO, 1 - DEFAULT_RATIO],
        children: [
            targetNode,
            { type: 'leaf', columnId: sourceColumnId },
        ],
    };
    let slots = state.slots.map((s, i) =>
        i === slotIndex ? { ...s, layout: replaceTarget(s.layout, targetColumnId, replacement) } : s,
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
    const targetNode = findTargetNode(slots[tgtSlotIdx].layout, targetColumnId) ?? { type: 'leaf', columnId: targetColumnId } as LayoutNode;
    const replacement: LayoutNode = {
        type: 'split',
        direction,
        sizes: [DEFAULT_RATIO, 1 - DEFAULT_RATIO],
        children: sourceFirst ? [sourceLeaf, targetNode] : [targetNode, sourceLeaf],
    };
    const next = slots.map((s, i) => (i === tgtSlotIdx ? { ...s, layout: replaceTarget(s.layout, targetColumnId, replacement) } : s));
    return { columns: state.columns, slots: next };
}

export function tabifyLeaf(
    state: DeckLayoutState,
    targetColumnId: string,
    sourceColumnId: string,
): DeckLayoutState {
    if (sourceColumnId === targetColumnId) return state;
    if (slotIndexOfColumn(state.slots, sourceColumnId) === -1) return state;

    const slots = detachLeaf(state.slots, sourceColumnId);
    const tgtSlotIdx = slotIndexOfColumn(slots, targetColumnId);
    if (tgtSlotIdx === -1) return state;

    const mutate = (node: LayoutNode): LayoutNode => {
        if (node.type === 'leaf') {
            return node.columnId === targetColumnId
                ? { type: 'tabs', children: [targetColumnId, sourceColumnId], active: 1 }
                : node;
        }
        if (node.type === 'tabs') {
            if (!node.children.includes(targetColumnId)) return node;
            const children = [...node.children, sourceColumnId];
            return { type: 'tabs', children, active: children.length - 1 };
        }
        return { ...node, children: node.children.map(mutate) };
    };
    const next = slots.map((s, i) => (i === tgtSlotIdx ? { ...s, layout: mutate(s.layout) } : s));
    return { columns: state.columns, slots: next };
}

export function untabifyLeaf(
    state: DeckLayoutState,
    columnId: string,
    genId: () => string,
): DeckLayoutState {
    const slotIdx = slotIndexOfColumn(state.slots, columnId);
    if (slotIdx === -1) return state;
    if (!findTabsNodeOf(state.slots[slotIdx].layout, columnId)) return state;

    const slots = detachLeaf(state.slots, columnId);
    const insertAt = Math.min(slotIdx + 1, slots.length);
    const next = [...slots];
    next.splice(insertAt, 0, { id: genId(), layout: { type: 'leaf', columnId } });
    return { columns: state.columns, slots: next };
}

export function reorderedTab(node: TabsNode, from: number, to: number): { children: string[]; active: number } | null {
    if (node?.type !== 'tabs') return null;
    const len = node.children.length;
    if (from === to || from < 0 || to < 0 || from >= len || to >= len) return null;
    const activeId = node.children[Math.max(0, Math.min(node.active ?? 0, len - 1))];
    const children = [...node.children];
    const [moved] = children.splice(from, 1);
    children.splice(to, 0, moved);
    return { children, active: Math.max(0, children.indexOf(activeId)) };
}

export function normalizeTabsNodes(state: DeckLayoutState): DeckLayoutState {
    try {
        const ids = new Set(state.columns.map(c => c?.id));
        let changed = false;
        const fix = (node: LayoutNode): LayoutNode | null => {
            if (node.type === 'leaf') return node;
            if (node.type === 'tabs') {
                const children = node.children.filter(id => ids.has(id));
                if (children.length === 0) {
                    changed = true;
                    return null;
                }
                if (children.length === 1) {
                    changed = true;
                    return { type: 'leaf', columnId: children[0] };
                }
                const active = Math.max(0, Math.min(node.active ?? 0, children.length - 1));
                if (children.length === node.children.length && active === node.active) return node;
                changed = true;
                return { type: 'tabs', children, active };
            }
            const kept: LayoutNode[] = [];
            const sizes: number[] = [];
            node.children.forEach((child, i) => {
                const f = fix(child);
                if (f) {
                    kept.push(f);
                    sizes.push(node.sizes[i]);
                }
            });
            if (kept.length === 0) {
                changed = true;
                return null;
            }
            if (kept.length !== node.children.length) {
                changed = true;
                const total = sizes.reduce((a, b) => a + b, 0) || 1;
                return collapseSingle({ type: 'split', direction: node.direction, sizes: sizes.map(s => s / total), children: kept });
            }
            return { ...node, children: kept };
        };
        const slots: Slot[] = [];
        for (const slot of state.slots) {
            const fixed = fix(slot.layout);
            if (fixed) {
                slots.push(fixed === slot.layout ? slot : { ...slot, layout: fixed });
            } else {
                changed = true;
            }
        }

        let columns = state.columns;
        const collectTabs = (node: LayoutNode, acc: TabsNode[]): TabsNode[] => {
            if (node.type === 'tabs') acc.push(node);
            else if (node.type === 'split') for (const child of node.children) collectTabs(child, acc);
            return acc;
        };
        for (const slot of slots) {
            for (const tabs of collectTabs(slot.layout, [])) {
                const anchor = columns.find(c => c?.id === tabs.children[0]);
                const width = anchor?.settings?.width;
                if (width === undefined) continue;
                for (const id of tabs.children.slice(1)) {
                    const idx = columns.findIndex(c => c?.id === id);
                    if (idx !== -1 && columns[idx]?.settings?.width !== width) {
                        if (columns === state.columns) columns = [...state.columns];
                        columns[idx] = { ...columns[idx], settings: { ...columns[idx].settings, width } };
                        changed = true;
                    }
                }
            }
        }

        return changed ? { columns, slots } : state;
    } catch {
        return state;
    }
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
