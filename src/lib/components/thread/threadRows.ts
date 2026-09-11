import type { PostView } from '$lib/types/atproto';
import { subtreeEnds, type ThreadFeedItem } from './threadV2';

export type ThreadView = 'linear' | 'tree';

export type FoldMode = 'none' | 'side' | 'all';

export type ThreadRelation = 'root' | 'flat' | 'nested' | 'detached';

export interface ThreadRowState {
    folds: ReadonlyMap<string, FoldMode>;
    hasOtherReplies: boolean;
    otherShown: boolean;
}

export interface ThreadRowOptions {
    maxIndent?: number;
}

export type ThreadGuideColumn = 'pass' | 'end' | 'none';

export interface ThreadGuide {
    top: boolean;
    bottom: boolean;
    elbow: boolean;
    tick: boolean;
    columns: ThreadGuideColumn[];
    owners: string[];
}

interface RowBase {
    key: string;
    depth: number;
    indent: number;
    relation: ThreadRelation;
    guide: ThreadGuide;
}

export interface ThreadPostRow extends RowBase {
    kind: 'post';
    item: ThreadFeedItem;
    post: PostView;
    role: 'parent' | 'anchor' | 'reply';
    isOp: boolean;
    isRootAuthor: boolean;
    number?: { index: number; count: number };
    fold: FoldMode;
    canCollapse: boolean;
}

export interface ThreadTombstoneRow extends RowBase {
    kind: 'tombstone';
    item: ThreadFeedItem;
    reason: 'notFound' | 'blocked' | 'noUnauthenticated';
}

export interface ThreadFoldRow extends RowBase {
    kind: 'fold';
    uri: string;
    post: PostView;
    mode: 'side' | 'all' | 'open';
    count: number;
}

export interface ThreadReadMoreRow extends RowBase {
    kind: 'readMore';
    uri: string;
    post: PostView;
    count: number;
    deferred: boolean;
    continuesThread: boolean;
    nextIndex?: number;
    total?: number;
}

export interface ThreadReadMoreUpRow extends RowBase {
    kind: 'readMoreUp';
    uri: string;
    post: PostView;
}

export interface ThreadShowOtherRow extends RowBase {
    kind: 'showOther';
}

export type ThreadRow = ThreadPostRow | ThreadTombstoneRow | ThreadFoldRow | ThreadReadMoreRow | ThreadReadMoreUpRow | ThreadShowOtherRow;

export interface ThreadRowsResult {
    rows: ThreadRow[];
    anchorIndex: number;
}

export const DEFAULT_MAX_INDENT = 5;

export const MOBILE_MAX_INDENT = 3;

function emptyGuide(): ThreadGuide {
    return { top: false, bottom: false, elbow: false, tick: false, columns: [], owners: [] };
}

function hasPostNumber(item: ThreadFeedItem): boolean {
    const index = item.opThreadPostIndex;
    const count = item.opThreadPostCount;
    return index !== undefined && count !== undefined && index >= 1 && count >= 1 && index <= count;
}

function rootAuthorDid(feed: readonly ThreadFeedItem[]): string | undefined {
    for (const item of feed) {
        if (item.post && item.opThread) {
            return item.post.author.did;
        }
    }
    const top = feed.find(item => item.post);
    return top && !(top.post!.record as { reply?: unknown }).reply ? top.post!.author.did : undefined;
}

function normalizeFeed(feed: readonly ThreadFeedItem[]): readonly ThreadFeedItem[] {
    for (const item of feed) {
        if (typeof item.depth !== 'number' || typeof item.uri !== 'string') {
            return feed.map(entry => ({
                ...entry,
                uri: typeof entry.uri === 'string' ? entry.uri : entry.post?.uri ?? '',
                depth: typeof entry.depth === 'number' ? entry.depth : 0,
            }));
        }
    }
    return feed;
}

interface Emitted {
    row: ThreadRow;
    ownerIndex: number;
    own: boolean;
}

export function buildThreadRows(rawFeed: readonly ThreadFeedItem[], state: ThreadRowState, view: ThreadView, options?: ThreadRowOptions): ThreadRowsResult {
    const feed = normalizeFeed(rawFeed);
    const n = feed.length;
    const maxIndent = options?.maxIndent ?? DEFAULT_MAX_INDENT;
    const end = subtreeEnds(feed);
    const opDid = rootAuthorDid(feed);
    const parentOf = new Int32Array(n).fill(-1);
    const childrenCache = new Map<number, number[]>();
    const emitted: Emitted[] = [];
    const rowIndexOfItem = new Int32Array(n).fill(-1);
    const relationOf: ThreadRelation[] = new Array(n).fill('root');
    const indentOf = new Int32Array(n);
    const otherPending = state.hasOtherReplies && !state.otherShown;

    {
        const open: number[] = [];
        for (let i = 0; i < n; i++) {
            const depth = feed[i].depth;
            while (open.length && feed[open[open.length - 1]].depth >= depth) {
                open.pop();
            }
            parentOf[i] = open.length ? open[open.length - 1] : -1;
            open.push(i);
        }
    }

    const anchorFeedIndex = feed.findIndex(item => item.depth === 0);
    const rootIndex = anchorFeedIndex >= 0 && isThreadRoot(anchorFeedIndex) ? anchorFeedIndex : -1;

    function isThreadRoot(index: number): boolean {
        const item = feed[index];
        if (parentOf[index] >= 0 || item.moreParents === true) {
            return false;
        }
        const record = item.post?.record as { reply?: unknown } | undefined;
        return !record?.reply;
    }

    function visibleSiblingCount(parent: number): number {
        return childrenOf(parent).length + (otherPending && parent === anchorFeedIndex ? 1 : 0);
    }

    function childrenOf(index: number): number[] {
        let cached = childrenCache.get(index);
        if (!cached) {
            cached = [];
            for (let j = index + 1; j <= end[index]; j = end[j] + 1) {
                cached.push(j);
            }
            childrenCache.set(index, cached);
        }
        return cached;
    }

    function foldModeOf(index: number, hasSide: boolean): FoldMode {
        const explicit = state.folds.get(feed[index].uri);
        if (explicit === 'all') {
            return 'all';
        }
        if (view !== 'linear' || !hasSide) {
            return 'none';
        }
        return explicit ?? (feed[index].depth === 0 ? 'none' : 'side');
    }

    function relationFor(index: number, parent: number, forceNested: boolean): ThreadRelation {
        const item = feed[index];
        if (parent < 0) {
            return 'root';
        }
        if (item.depth <= 0 || item.opThread === true) {
            return 'flat';
        }
        if (forceNested) {
            return 'nested';
        }
        if (parent === rootIndex) {
            return 'detached';
        }
        if (view === 'tree') {
            return 'nested';
        }
        return visibleSiblingCount(parent) === 1 ? 'flat' : 'nested';
    }

    function pushControl(row: ThreadRow, ownerIndex: number): void {
        emitted.push({ row, ownerIndex, own: false });
    }

    function pushFold(index: number, mode: 'side' | 'all' | 'open', count: number): void {
        const item = feed[index];
        pushControl({
            kind: 'fold',
            key: `fold:${item.uri}`,
            uri: item.uri,
            post: item.post!,
            mode,
            count,
            depth: item.depth,
            indent: indentOf[index],
            relation: 'flat',
            guide: emptyGuide(),
        }, index);
    }

    function pushReadMore(index: number, deferred: boolean): void {
        const item = feed[index];
        const continuesThread = item.opThread === true
            && item.opThreadPostIndex !== undefined
            && item.opThreadPostCount !== undefined
            && item.opThreadPostIndex < item.opThreadPostCount;
        pushControl({
            kind: 'readMore',
            key: `more:${item.uri}`,
            uri: item.uri,
            post: item.post!,
            count: item.moreReplies!,
            deferred,
            continuesThread,
            nextIndex: continuesThread ? item.opThreadPostIndex! + 1 : undefined,
            total: continuesThread ? item.opThreadPostCount : undefined,
            depth: item.depth,
            indent: deferred ? Math.min(indentOf[index] + 1, maxIndent) : indentOf[index],
            relation: deferred ? 'nested' : 'flat',
            guide: emptyGuide(),
        }, index);
    }

    function emit(index: number, parent: number, forceNested: boolean): void {
        const item = feed[index];
        const relation = relationFor(index, parent, forceNested);
        const indent = relation === 'nested' ? Math.min(indentOf[parent] + 1, maxIndent) : parent >= 0 ? indentOf[parent] : 0;
        relationOf[index] = relation;
        indentOf[index] = indent;

        if (item.moreParents && item.post && emitted.length === 0) {
            pushControl({
                kind: 'readMoreUp',
                key: `up:${item.uri}`,
                uri: item.uri,
                post: item.post,
                depth: item.depth,
                indent,
                relation: 'flat',
                guide: emptyGuide(),
            }, index);
        }

        rowIndexOfItem[index] = emitted.length;

        if (!item.post) {
            emitted.push({
                row: {
                    kind: 'tombstone',
                    key: `post:${item.uri}`,
                    item,
                    reason: item.blocked ? 'blocked' : item.noUnauthenticated ? 'noUnauthenticated' : 'notFound',
                    depth: item.depth,
                    indent,
                    relation,
                    guide: emptyGuide(),
                },
                ownerIndex: index,
                own: true,
            });
            return;
        }

        const children = childrenOf(index);
        const side = children.filter(j => !feed[j].opThread);
        const chain = children.filter(j => feed[j].opThread);
        const hasSide = item.opThread === true && item.depth >= 0 && index !== rootIndex && side.length > 0;
        const mode = foldModeOf(index, hasSide);

        emitted.push({
            row: {
                kind: 'post',
                key: `post:${item.uri}`,
                item,
                post: item.post,
                role: item.depth < 0 ? 'parent' : item.depth === 0 ? 'anchor' : 'reply',
                isOp: item.opThread === true,
                isRootAuthor: item.depth >= 1 && opDid !== undefined && item.post.author.did === opDid && item.opThread !== true,
                number: hasPostNumber(item) ? { index: item.opThreadPostIndex!, count: item.opThreadPostCount! } : undefined,
                fold: mode,
                canCollapse: item.depth >= 1 && (children.length > 0 || (item.moreReplies ?? 0) > 0),
                depth: item.depth,
                indent,
                relation,
                guide: emptyGuide(),
            },
            ownerIndex: index,
            own: true,
        });

        if (mode === 'all' && (children.length > 0 || (item.moreReplies ?? 0) > 0)) {
            pushFold(index, 'all', end[index] - index + (item.moreReplies ?? 0));
            return;
        }

        if (hasSide && view === 'linear') {
            if (mode === 'side') {
                pushFold(index, 'side', side.length);
                for (const j of chain) {
                    emit(j, index, false);
                }
            } else {
                pushFold(index, 'open', side.length);
                for (const j of side) {
                    emit(j, index, true);
                }
                for (const j of chain) {
                    emit(j, index, false);
                }
            }
        } else if (hasSide) {
            for (const j of side) {
                emit(j, index, true);
            }
            for (const j of chain) {
                emit(j, index, false);
            }
        } else {
            for (const j of children) {
                emit(j, index, false);
            }
        }

        if ((item.moreReplies ?? 0) > 0 && item.depth >= 0 && index !== rootIndex) {
            const deferred = children.length > 0;
            if (!deferred || view === 'tree') {
                pushReadMore(index, deferred);
            }
        }
    }

    for (let i = 0; i < n; i = end[i] + 1) {
        emit(i, -1, false);
    }

    if (otherPending) {
        const attached = anchorFeedIndex >= 0 && anchorFeedIndex !== rootIndex && feed[anchorFeedIndex].post !== undefined;
        const nested = attached && childrenOf(anchorFeedIndex).length > 0;
        emitted.push({
            row: {
                kind: 'showOther',
                key: 'other',
                depth: 1,
                indent: nested ? Math.min(indentOf[anchorFeedIndex] + 1, maxIndent) : attached ? indentOf[anchorFeedIndex] : 0,
                relation: nested ? 'nested' : attached ? 'flat' : 'detached',
                guide: emptyGuide(),
            },
            ownerIndex: attached ? anchorFeedIndex : -1,
            own: false,
        });
    }

    const rows = emitted.map(entry => entry.row);
    const count = rows.length;
    const spanEnd = new Int32Array(n).fill(-1);

    function linksUp(index: number): boolean {
        const relation = relationOf[index];
        return relation === 'flat' || relation === 'nested';
    }

    for (let r = count - 1; r >= 0; r--) {
        const entry = emitted[r];
        if (entry.ownerIndex < 0) {
            continue;
        }
        let a: number;
        if (entry.own) {
            if (!linksUp(entry.ownerIndex)) {
                continue;
            }
            a = parentOf[entry.ownerIndex];
        } else {
            a = entry.ownerIndex;
        }
        while (a >= 0) {
            if (spanEnd[a] < r) {
                spanEnd[a] = r;
            }
            if (!linksUp(a)) {
                break;
            }
            a = parentOf[a];
        }
    }

    function ancestorAtIndent(start: number, indent: number): number {
        let a = start;
        while (a >= 0) {
            if (indentOf[a] === indent) {
                return a;
            }
            if (!linksUp(a)) {
                return -1;
            }
            a = parentOf[a];
        }
        return -1;
    }

    for (let r = 0; r < count; r++) {
        const entry = emitted[r];
        const row = entry.row;
        if (entry.ownerIndex < 0) {
            continue;
        }

        const owner = entry.ownerIndex;
        const guide = row.guide;

        if (entry.own) {
            guide.top = row.relation === 'flat';
            guide.elbow = row.relation === 'nested';
            guide.bottom = spanEnd[owner] > r;
        } else if (row.kind === 'readMoreUp') {
            guide.bottom = true;
            continue;
        } else {
            guide.tick = row.relation === 'flat';
            guide.top = row.relation === 'flat';
            guide.elbow = row.relation === 'nested';
            guide.bottom = row.relation === 'flat' && spanEnd[owner] > r;
        }

        if (row.indent === 0) {
            continue;
        }

        const columns: ThreadGuideColumn[] = [];
        const owners: string[] = [];
        const base = entry.own ? parentOf[owner] : owner;
        const baseLinks = entry.own ? linksUp(owner) : row.relation !== 'detached';
        for (let level = 0; level < row.indent; level++) {
            const ancestor = baseLinks ? ancestorAtIndent(base, level) : -1;
            if (ancestor < 0) {
                columns.push('none');
                owners.push('');
                continue;
            }
            const branch = level + 1 < row.indent ? ancestorAtIndent(base, level + 1) : -1;
            const branchEnd = branch >= 0 ? Math.max(r, spanEnd[branch]) : Math.max(r, entry.own ? spanEnd[owner] : r);
            const continues = spanEnd[ancestor] > branchEnd;
            const isParentColumn = level === row.indent - 1;
            columns.push(continues ? 'pass' : isParentColumn ? 'end' : 'none');
            owners.push(feed[ancestor].uri);
        }
        guide.columns = columns;
        guide.owners = owners;
    }

    const anchorIndex = rows.findIndex(row => row.kind === 'post' && row.role === 'anchor');

    return { rows, anchorIndex };
}
