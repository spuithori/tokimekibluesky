import { describe, it, expect } from 'vitest';
import { flattenThreadV2 } from './threadV2';
import { buildThreadRows, DEFAULT_MAX_INDENT, type FoldMode, type ThreadRow, type ThreadView } from './threadRows';
import type { ThreadItemV2 } from '$lib/types/atproto';

function rng(seed: number) {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0x100000000;
    };
}

interface Node { id: string; depth: number; op: boolean; deleted: boolean; children: Node[] }

function makeTree(seed: number): { items: ThreadItemV2[]; nodes: Map<string, Node>; parent: Map<string, string | null> } {
    const random = rng(seed);
    const OP = 'did:plc:op';
    let counter = 0;
    const nodes = new Map<string, Node>();
    const parent = new Map<string, string | null>();
    const items: ThreadItemV2[] = [];
    const opCount = 1 + Math.floor(random() * 5);
    let opIndex = 0;

    function post(id: string, depth: number, op: boolean, deleted: boolean): ThreadItemV2 {
        const uri = `at://did:plc:x/app.bsky.feed.post/${id}`;
        if (deleted) {
            return { uri, depth, value: { $type: 'app.bsky.unspecced.defs#threadItemNotFound' } };
        }
        return {
            uri,
            depth,
            value: {
                $type: 'app.bsky.unspecced.defs#threadItemPost',
                post: { uri, cid: id, author: { did: op ? OP : `did:plc:${id}`, handle: `${id}.test` }, record: {}, indexedAt: '' },
                moreParents: false,
                moreReplies: random() < 0.15 ? 1 + Math.floor(random() * 3) : 0,
                opThread: op,
                opThreadPostIndex: op ? ++opIndex : undefined,
                opThreadPostCount: op ? opCount : undefined,
                hiddenByThreadgate: false,
                mutedByViewer: false,
            },
        };
    }

    function emit(depth: number, parentId: string | null, op: boolean): void {
        const id = `n${counter++}`;
        const deleted = !op && depth > 0 && random() < 0.08;
        const node: Node = { id, depth, op, deleted, children: [] };
        nodes.set(id, node);
        parent.set(id, parentId);
        if (parentId) nodes.get(parentId)!.children.push(node);
        items.push(post(id, depth, op, deleted));
        if (deleted || depth >= 6) return;
        const opChild = op && opIndex < opCount;
        const spread = depth === 0 ? 2 + Math.floor(random() * 5) : random() < 0.35 ? 0 : random() < 0.6 ? 1 : 2 + Math.floor(random() * 3);
        if (opChild) emit(depth + 1, id, true);
        for (let i = 0; i < spread; i++) emit(depth + 1, id, false);
    }

    const parents = Math.floor(random() * 3);
    for (let i = parents; i >= 1; i--) {
        const id = `p${i}`;
        nodes.set(id, { id, depth: -i, op: true, deleted: false, children: [] });
        parent.set(id, i === parents ? null : `p${i + 1}`);
        items.push(post(id, -i, true, false));
    }
    if (parents > 0) opIndex = parents;
    emit(0, parents > 0 ? 'p1' : null, true);
    return { items, nodes, parent };
}

function postKeyId(row: ThreadRow): string {
    return row.key.split('/').pop()!;
}

describe('buildThreadRows structural invariants (random trees)', () => {
    for (const view of ['linear', 'tree'] as ThreadView[]) {
        for (let seed = 1; seed <= 60; seed++) {
            it(`${view} seed ${seed}`, () => {
                const { items, nodes, parent } = makeTree(seed);
                const feed = flattenThreadV2(items);
                const folds = new Map<string, FoldMode>();
                const random = rng(seed * 7);
                for (const item of feed) {
                    if (item.post && item.depth >= 1 && random() < 0.15) {
                        folds.set(item.uri, random() < 0.5 ? 'all' : 'none');
                    }
                }
                const { rows, anchorIndex } = buildThreadRows(feed, { folds, hasOtherReplies: false, otherShown: false }, view);

                expect(anchorIndex).toBeGreaterThanOrEqual(0);
                expect(rows[anchorIndex].kind).toBe('post');

                const rowIndexById = new Map<string, number>();
                const posts = rows.map((row, index) => ({ row, index })).filter(({ row }) => row.kind === 'post' || row.kind === 'tombstone');
                for (const { row, index } of posts) {
                    const id = postKeyId(row);
                    expect(rowIndexById.has(id), `duplicate ${id}`).toBe(false);
                    rowIndexById.set(id, index);
                }

                // (d) every visible post appears once; hidden ones only under a collapsed ancestor or an unopened side fold
                const visibleParentOf = (id: string): string | null => parent.get(id) ?? null;
                for (const [id, node] of nodes) {
                    const shown = rowIndexById.has(id);
                    let ancestorHides = false;
                    let cursor = visibleParentOf(id);
                    let child = node;
                    while (cursor) {
                        const uriOf = (x: string) => `at://did:plc:x/app.bsky.feed.post/${x}`;
                        const mode = folds.get(uriOf(cursor));
                        const parentNode = nodes.get(cursor)!;
                        const parentIsRoot = parentNode.depth === 0 && visibleParentOf(cursor) === null;
                        const defaultMode = parentNode.depth === 0 ? 'none' : 'side';
                        const sideHidden = view === 'linear' && parentNode.op && parentNode.depth >= 0 && !parentIsRoot && !child.op && (mode ?? defaultMode) === 'side';
                        if (mode === 'all' || sideHidden) { ancestorHides = true; break; }
                        child = parentNode;
                        cursor = visibleParentOf(cursor);
                    }
                    expect(shown, `${id} shown=${shown} hidden-by-ancestor=${ancestorHides}`).toBe(!ancestorHides);
                }

                // (a)(b) a straight top line means "directly below my parent, and I am my parent's only visible child (or the OP chain / parent chain)"
                for (const { row, index } of posts) {
                    if (!row.guide.top) continue;
                    const id = postKeyId(row);
                    const parentId = visibleParentOf(id);
                    expect(parentId, `${id} has a top line but no parent`).not.toBeNull();
                    const parentIndex = rowIndexById.get(parentId!);
                    expect(parentIndex, `${id} top line but parent hidden`).toBeDefined();
                    const parentRow = rows[parentIndex!] as Extract<ThreadRow, { kind: 'post' }>;
                    expect(row.indent, `${id} flat line must stay in the parent column`).toBe(parentRow.indent);
                    const parentNode = nodes.get(parentId!)!;
                    const visibleChildren = parentNode.children.filter((c) => rowIndexById.has(c.id));
                    const isOpChain = nodes.get(id)!.op;
                    const isParentChain = nodes.get(id)!.depth <= 0;
                    if (!isOpChain && !isParentChain) {
                        expect(visibleChildren.length, `${id}: flat line although ${parentId} has ${visibleChildren.length} visible children`).toBe(1);
                    }
                    // nothing but control rows between parent and the flat child
                    for (let k = parentIndex! + 1; k < index; k++) {
                        expect(['fold', 'readMore'].includes(rows[k].kind), `${id}: post ${rows[k].key} sits between ${parentId} and its flat child`).toBe(true);
                    }
                }

                // (c) every column owner is a real ancestor of the row
                for (const { row } of posts) {
                    const id = postKeyId(row);
                    const ancestors = new Set<string>();
                    let cursor = visibleParentOf(id);
                    while (cursor) { ancestors.add(`at://did:plc:x/app.bsky.feed.post/${cursor}`); cursor = visibleParentOf(cursor); }
                    row.guide.owners.forEach((owner, level) => {
                        if (row.guide.columns[level] === 'none') return;
                        expect(ancestors.has(owner), `${id}: column ${level} owner ${owner} is not an ancestor`).toBe(true);
                    });
                    if (row.indent >= 1) {
                        expect(row.guide.columns[row.indent - 1], `${id}: parent column must be pass or end`).not.toBe('none');
                        expect(row.guide.elbow, `${id}: indented row must hang off its parent column`).toBe(row.relation === 'nested');
                    }
                }

                // (f) indentation is monotone: a nested row is exactly one level deeper than its parent (until the cap)
                for (const { row } of posts) {
                    const id = postKeyId(row);
                    const parentId = visibleParentOf(id);
                    if (!parentId || !rowIndexById.has(parentId)) continue;
                    const parentRow = rows[rowIndexById.get(parentId)!] as Extract<ThreadRow, { kind: 'post' }>;
                    const delta = row.indent - parentRow.indent;
                    expect(delta === 0 || delta === 1, `${id}: indent jumps by ${delta}`).toBe(true);
                    if (delta === 0 && !row.guide.top && nodes.get(id)!.depth >= 1) {
                        if (row.relation === 'nested') {
                            expect(row.indent, `${id}: same indent while nested is only allowed at the cap`).toBe(DEFAULT_MAX_INDENT);
                        } else {
                            expect(row.relation, `${id}: same indent without a line must be detached`).toBe('detached');
                            expect(parentRow.role, `${id}: detached rows hang only off the thread root`).toBe('anchor');
                            expect(visibleParentOf(parentId), `${id}: detached rows hang only off the thread root`).toBeNull();
                        }
                    }
                }

                // (e) control rows sit right after their owner's visible subtree
                rows.forEach((row, index) => {
                    if (row.kind !== 'fold' && row.kind !== 'readMore') return;
                    const ownerId = row.uri.split('/').pop()!;
                    const ownerIndex = rowIndexById.get(ownerId)!;
                    expect(ownerIndex, `${row.kind} for ${ownerId} without owner row`).toBeDefined();
                    expect(ownerIndex, `${row.kind} for ${ownerId} placed above its owner`).toBeLessThan(index);
                    for (let k = ownerIndex + 1; k < index; k++) {
                        const between = rows[k];
                        if (between.kind === 'post' || between.kind === 'tombstone') {
                            let cursor = visibleParentOf(postKeyId(between));
                            let inside = false;
                            while (cursor) { if (cursor === ownerId) { inside = true; break; } cursor = visibleParentOf(cursor); }
                            expect(inside, `${row.kind} for ${ownerId}: unrelated post ${between.key} between owner and control row`).toBe(true);
                        }
                    }
                });
            });
        }
    }
});

describe('a non-root subtree renders identically whether its top post is a child or the anchor', () => {
    const POST = 'app.bsky.unspecced.defs#threadItemPost';
    const idOf = (uri: string) => uri.split('/').pop()!;

    function describe(row: ThreadRow, base: number) {
        const g = row.guide;
        return {
            kind: row.kind,
            key: row.key,
            relation: row.relation,
            indent: row.indent - base,
            top: g.top,
            bottom: g.bottom,
            elbow: g.elbow,
            tick: g.tick,
            columns: g.columns.slice(base),
            owners: g.owners.slice(base),
            extra: row.kind === 'post'
                ? [row.role === 'anchor' ? 'reply' : row.role, row.isOp, row.isRootAuthor, row.number?.index, row.fold, row.canCollapse]
                : row.kind === 'fold' ? [row.mode, row.count]
                : row.kind === 'readMore' ? [row.count, row.deferred, row.continuesThread]
                : row.kind === 'tombstone' ? [row.reason]
                : [],
        };
    }

    for (const view of ['linear', 'tree'] as ThreadView[]) {
        for (let seed = 1; seed <= 60; seed++) {
            it(`${view} seed ${seed}`, () => {
                const { items, parent } = makeTree(seed);
                const byId = new Map(items.map((item) => [idOf(item.uri), item]));
                const targets = items.filter((item) => item.depth >= 1 && item.value.$type === POST).filter((_, k) => k % 3 === 0).slice(0, 4);
                const random = rng(seed * 7);
                const baseFolds = new Map<string, FoldMode>();
                for (const item of items) {
                    if (item.depth >= 1 && item.value.$type === POST && random() < 0.15) {
                        baseFolds.set(item.uri, random() < 0.5 ? 'all' : 'none');
                    }
                }

                for (const target of targets) {
                    const targetId = idOf(target.uri);
                    const chain: string[] = [];
                    let cursor = parent.get(targetId) ?? null;
                    while (cursor) {
                        chain.unshift(cursor);
                        cursor = parent.get(cursor) ?? null;
                    }
                    const start = items.indexOf(target);
                    let stop = start;
                    while (stop + 1 < items.length && items[stop + 1].depth > target.depth) stop++;
                    const reanchored: ThreadItemV2[] = [
                        ...chain.map((id) => ({ ...byId.get(id)!, depth: byId.get(id)!.depth - target.depth })),
                        ...items.slice(start, stop + 1).map((item) => ({ ...item, depth: item.depth - target.depth })),
                    ];

                    const folds = new Map(baseFolds);
                    if (folds.get(target.uri) !== 'all') folds.set(target.uri, 'none');
                    const state = { folds, hasOtherReplies: false, otherShown: false };
                    const asChild = buildThreadRows(flattenThreadV2(items), state, view, { maxIndent: 50 });
                    const asAnchor = buildThreadRows(flattenThreadV2(reanchored), state, view, { maxIndent: 50 });

                    const childStart = asChild.rows.findIndex((row) => row.key === `post:${target.uri}`);
                    if (childStart < 0) continue;
                    expect(asAnchor.rows[asAnchor.anchorIndex].key).toBe(`post:${target.uri}`);

                    const insideTarget = (row: ThreadRow): boolean => {
                        const id = row.kind === 'post' || row.kind === 'tombstone' ? idOf(row.key) : row.kind === 'showOther' ? '' : idOf(row.uri);
                        let node: string | null = id;
                        while (node) {
                            if (node === targetId) return true;
                            node = parent.get(node) ?? null;
                        }
                        return false;
                    };
                    const childRows: ThreadRow[] = [];
                    for (let k = childStart + 1; k < asChild.rows.length && insideTarget(asChild.rows[k]); k++) childRows.push(asChild.rows[k]);
                    const anchorRows = asAnchor.rows.slice(asAnchor.anchorIndex + 1);
                    const base = asChild.rows[childStart].indent;

                    expect(anchorRows.map((row) => describe(row, 0)), `${targetId}: subtree differs between child and anchor rendering`).toEqual(childRows.map((row) => describe(row, base)));
                    expect(asAnchor.rows[asAnchor.anchorIndex].guide.bottom, `${targetId}: line below the top post differs`).toBe(asChild.rows[childStart].guide.bottom);
                }
            });
        }
    }
});
