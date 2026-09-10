import type { PostView } from '$lib/types/atproto';
import { subtreeEnds, THREAD_BELOW, type ThreadFeedItem } from './threadV2';

export type ThreadView = 'linear' | 'tree';

export type FoldMode = 'none' | 'side' | 'all';

export interface ThreadRowState {
    folds: ReadonlyMap<string, FoldMode>;
    hasOtherReplies: boolean;
    otherShown: boolean;
}

export type ThreadGuideColumn = 'pass' | 'end' | 'none';

export interface ThreadGuide {
    top: boolean;
    bottom: boolean;
    columns: ThreadGuideColumn[];
    owners: string[];
}

interface RowBase {
    key: string;
    depth: number;
    visualDepth: number;
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

function visualDepthOf(depth: number, scope: number | null): number {
    if (depth <= 0) {
        return 0;
    }
    if (scope === null) {
        return 1;
    }
    const relative = depth - scope + 1;
    return relative < 0 ? 0 : relative > THREAD_BELOW ? THREAD_BELOW : relative;
}

function emptyGuide(): ThreadGuide {
    return { top: false, bottom: false, columns: [], owners: [] };
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

interface Emitted {
    row: ThreadRow;
    ownerIndex: number;
    linked: boolean;
    scope: number | null;
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

export function buildThreadRows(rawFeed: readonly ThreadFeedItem[], state: ThreadRowState, view: ThreadView): ThreadRowsResult {
    const feed = normalizeFeed(rawFeed);
    const n = feed.length;
    const end = subtreeEnds(feed);
    const opDid = rootAuthorDid(feed);
    const emitted: Emitted[] = [];
    const rowIndexOfItem = new Int32Array(n).fill(-1);
    const parentOf = new Int32Array(n).fill(-1);

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

    function childrenOf(index: number): number[] {
        const out: number[] = [];
        for (let j = index + 1; j <= end[index]; j = end[j] + 1) {
            out.push(j);
        }
        return out;
    }

    function foldModeOf(index: number, children: number[]): FoldMode {
        const item = feed[index];
        const explicit = state.folds.get(item.uri);
        if (explicit) {
            return explicit;
        }
        if (view === 'linear' && item.opThread && item.depth >= 1 && children.some(j => !feed[j].opThread)) {
            return 'side';
        }
        return 'none';
    }

    function linkedToParent(item: ThreadFeedItem): boolean {
        return item.depth <= 0 || item.depth >= 2 || item.opThread === true;
    }

    function pushFold(index: number, mode: 'side' | 'all' | 'open', count: number, scope: number | null): void {
        const item = feed[index];
        emitted.push({
            row: {
                kind: 'fold',
                key: `fold:${item.uri}`,
                uri: item.uri,
                post: item.post!,
                mode,
                count,
                depth: item.depth,
                visualDepth: visualDepthOf(item.depth + 1, scope),
                guide: emptyGuide(),
            },
            ownerIndex: index,
            linked: true,
            scope,
        });
    }

    function pushReadMore(index: number, deferred: boolean, scope: number | null): void {
        const item = feed[index];
        const continuesThread = item.opThread === true
            && item.opThreadPostIndex !== undefined
            && item.opThreadPostCount !== undefined
            && item.opThreadPostIndex < item.opThreadPostCount;
        emitted.push({
            row: {
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
                visualDepth: visualDepthOf(item.depth + 1, scope),
                guide: emptyGuide(),
            },
            ownerIndex: index,
            linked: true,
            scope,
        });
    }

    function emit(index: number, scope: number | null): void {
        const item = feed[index];

        if (item.moreParents && item.post && emitted.length === 0) {
            emitted.push({
                row: {
                    kind: 'readMoreUp',
                    key: `up:${item.uri}`,
                    uri: item.uri,
                    post: item.post,
                    depth: item.depth,
                    visualDepth: visualDepthOf(item.depth, scope),
                    guide: emptyGuide(),
                },
                ownerIndex: index,
                linked: true,
                scope,
            });
        }

        if (!item.post) {
            rowIndexOfItem[index] = emitted.length;
            emitted.push({
                row: {
                    kind: 'tombstone',
                    key: `post:${item.uri}`,
                    item,
                    reason: item.blocked ? 'blocked' : item.noUnauthenticated ? 'noUnauthenticated' : 'notFound',
                    depth: item.depth,
                    visualDepth: visualDepthOf(item.depth, scope),
                    guide: emptyGuide(),
                },
                ownerIndex: index,
                linked: linkedToParent(item),
                scope,
            });
            return;
        }

        const children = childrenOf(index);
        const mode = foldModeOf(index, children);
        const side = children.filter(j => !feed[j].opThread);
        const chain = children.filter(j => feed[j].opThread);
        const hasSideFold = view === 'linear' && item.opThread && item.depth >= 1 && side.length > 0;

        rowIndexOfItem[index] = emitted.length;
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
                visualDepth: visualDepthOf(item.depth, scope),
                guide: emptyGuide(),
            },
            ownerIndex: index,
            linked: linkedToParent(item),
            scope,
        });

        if (mode === 'all' && (children.length > 0 || (item.moreReplies ?? 0) > 0)) {
            pushFold(index, 'all', end[index] - index + (item.moreReplies ?? 0), scope);
            return;
        }

        if (hasSideFold) {
            if (mode === 'side') {
                pushFold(index, 'side', side.length, scope);
                for (const j of chain) {
                    emit(j, scope);
                }
            } else {
                pushFold(index, 'open', side.length, scope);
                for (const j of side) {
                    emit(j, item.depth);
                }
                for (const j of chain) {
                    emit(j, scope);
                }
            }
        } else {
            for (const j of children) {
                emit(j, scope);
            }
        }

        if ((item.moreReplies ?? 0) > 0 && item.depth > 0) {
            const deferred = children.length > 0;
            if (!deferred || scope !== null) {
                pushReadMore(index, deferred, scope);
            }
        }
    }

    const rootScope = view === 'tree' ? 1 : null;
    for (let i = 0; i < n; i = end[i] + 1) {
        emit(i, rootScope);
    }

    if (state.hasOtherReplies && !state.otherShown) {
        emitted.push({
            row: { kind: 'showOther', key: 'other', depth: 1, visualDepth: 1, guide: emptyGuide() },
            ownerIndex: -1,
            linked: false,
            scope: null,
        });
    }

    const rows = emitted.map(entry => entry.row);
    const count = rows.length;
    const lastLinkedRow = new Int32Array(n).fill(-1);

    for (let r = count - 1; r >= 0; r--) {
        const entry = emitted[r];
        if (entry.ownerIndex < 0 || !entry.linked) {
            continue;
        }
        let a = entry.row.kind === 'post' || entry.row.kind === 'tombstone' ? parentOf[entry.ownerIndex] : entry.ownerIndex;
        while (a >= 0) {
            if (lastLinkedRow[a] < r) {
                lastLinkedRow[a] = r;
            }
            if (!linkedToParent(feed[a])) {
                break;
            }
            a = parentOf[a];
        }
    }

    function spanContinues(index: number, r: number): boolean {
        let a = index;
        while (a >= 0) {
            if (lastLinkedRow[a] > r) {
                return true;
            }
            if (!linkedToParent(feed[a])) {
                return false;
            }
            a = parentOf[a];
        }
        return false;
    }

    for (let r = 0; r < count; r++) {
        const entry = emitted[r];
        const row = entry.row;
        if (row.kind === 'showOther') {
            continue;
        }
        if (row.kind === 'readMoreUp') {
            row.guide.bottom = true;
            continue;
        }

        const own = row.kind === 'post' || row.kind === 'tombstone';
        const owner = entry.ownerIndex;
        const parent = own ? parentOf[owner] : owner;
        const parentAbove = parent >= 0 && rowIndexOfItem[parent] >= 0 && rowIndexOfItem[parent] < r;

        const scope = entry.scope;

        if (scope === null || row.visualDepth <= 1) {
            row.guide.top = entry.linked && parentAbove;
            row.guide.bottom = own
                ? lastLinkedRow[owner] > r || (scope === null && entry.linked && parent >= 0 && spanContinues(parent, r))
                : spanContinues(owner, r);
            continue;
        }

        row.guide.bottom = own && lastLinkedRow[owner] > r;

        const chainAncestors: number[] = [];
        let a = own ? parentOf[owner] : owner;
        while (a >= 0 && feed[a].depth >= scope) {
            chainAncestors.push(a);
            a = parentOf[a];
        }
        chainAncestors.reverse();

        const columns: ThreadGuideColumn[] = [];
        const owners: string[] = [];
        for (let level = 1; level < row.visualDepth; level++) {
            const ancestor = chainAncestors[level - 1];
            if (ancestor === undefined) {
                columns.push('none');
                owners.push('');
                continue;
            }
            const branch = chainAncestors[level];
            const branchEnd = Math.max(r, branch === undefined ? (own ? lastLinkedRow[owner] : -1) : lastLinkedRow[branch]);
            const continues = lastLinkedRow[ancestor] > branchEnd;
            const isParentColumn = level === row.visualDepth - 1;
            columns.push(continues ? 'pass' : isParentColumn ? 'end' : 'none');
            owners.push(feed[ancestor].uri);
        }
        row.guide.columns = columns;
        row.guide.owners = owners;
    }

    const anchorIndex = rows.findIndex(row => row.kind === 'post' && row.role === 'anchor');

    return { rows, anchorIndex };
}
