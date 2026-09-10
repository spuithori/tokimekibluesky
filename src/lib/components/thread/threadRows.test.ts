import { describe, it, expect } from 'vitest';
import { flattenThreadV2 } from './threadV2';
import { buildThreadRows, type FoldMode, type ThreadRow, type ThreadView } from './threadRows';
import { post } from './threadV2.test';

const OP = 'did:plc:a';
const op = (id: string, depth: number, index: number, count = 4, extra: Record<string, unknown> = {}) =>
    post(id, depth, { opThread: true, opThreadPostIndex: index, opThreadPostCount: count, did: OP, ...extra });
const other = (id: string, depth: number, extra: Record<string, unknown> = {}) => post(id, depth, { did: `did:plc:${id}`, ...extra });

function describeRow(row: ThreadRow): string {
    const g = row.guide;
    const guide = `${g.top ? '|' : '.'}${g.bottom ? '|' : '.'}`;
    const cols = row.guide.columns.length ? ' cols=' + row.guide.columns.map(c => (c === 'pass' ? '|' : c === 'end' ? 'L' : '.')).join('') : '';
    switch (row.kind) {
        case 'post':
            return `post:${row.key.split('/').pop()} d${row.depth} ${row.role}${row.isOp ? ' op' : ''}${row.isRootAuthor ? ' author' : ''}${row.number ? ` ${row.number.index}/${row.number.count}` : ''}${row.fold !== 'none' ? ` fold=${row.fold}` : ''}${row.canCollapse ? ' c' : ''} ${guide}${cols}`;
        case 'tombstone':
            return `tomb:${row.key.split('/').pop()} d${row.depth} ${row.reason} ${guide}${cols}`;
        case 'fold':
            return `fold:${row.uri.split('/').pop()} ${row.mode} ${row.count} ${guide}${cols}`;
        case 'readMore':
            return `more:${row.uri.split('/').pop()} ${row.count}${row.deferred ? ' deferred' : ''} ${guide}${cols}`;
        case 'readMoreUp':
            return `up:${row.uri.split('/').pop()} ${guide}`;
        case 'showOther':
            return 'other';
    }
}

function rows(items: ReturnType<typeof flattenThreadV2>, view: ThreadView = 'linear', folds: [string, FoldMode][] = [], other = { hasOtherReplies: false, otherShown: false }) {
    const result = buildThreadRows(items, { folds: new Map(folds.map(([id, m]) => [`at://did:plc:a/app.bsky.feed.post/${id}`, m])), ...other }, view);
    return { lines: result.rows.map(describeRow), anchorIndex: result.anchorIndex };
}

describe('buildThreadRows — linear view', () => {
    it('does not link plain replies to the anchor but links reply chains', () => {
        const items = flattenThreadV2([other('root', 0), other('a', 1), other('aa', 2), other('aaa', 3), other('ab', 2), other('b', 1)]);
        expect(rows(items)).toEqual({
            anchorIndex: 0,
            lines: [
                'post:root d0 anchor ..',
                'post:a d1 reply c .|',
                'post:aa d2 reply c ||',
                'post:aaa d3 reply ||',
                'post:ab d2 reply |.',
                'post:b d1 reply ..',
            ],
        });
    });

    it('links parents, the anchor and the OP chain; folds OP side replies and surfaces root replies after the chain', () => {
        const items = flattenThreadV2([
            op('p1', 0, 1), op('p2', 1, 2), op('p3', 2, 3), op('p4', 3, 4),
            other('s3a', 3), other('s3b', 3),
            other('s2a', 2), other('s2aa', 3),
            other('r1', 1), other('r2', 1),
        ]);
        expect(rows(items)).toEqual({
            anchorIndex: 0,
            lines: [
                'post:p1 d0 anchor op 1/4 .|',
                'post:p2 d1 reply op 2/4 fold=side c ||',
                'fold:p2 side 1 ||',
                'post:p3 d2 reply op 3/4 fold=side c ||',
                'fold:p3 side 2 ||',
                'post:p4 d3 reply op 4/4 |.',
                'post:r1 d1 reply ..',
                'post:r2 d1 reply ..',
            ],
        });
    });

    it('opens a side fold directly below its OP post and keeps the line running through the group', () => {
        const items = flattenThreadV2([op('p1', 0, 1), op('p2', 1, 2), op('p3', 2, 3), other('s2a', 2), other('s2aa', 3), other('r1', 1)]);
        const result = buildThreadRows(items, { folds: new Map([['at://did:plc:a/app.bsky.feed.post/p2', 'none']]), hasOtherReplies: false, otherShown: false }, 'linear');
        expect(result.rows.map(describeRow)).toEqual([
            'post:p1 d0 anchor op 1/4 .|',
            'post:p2 d1 reply op 2/4 c ||',
            'fold:p2 open 1 ||',
            'post:s2a d2 reply c .| cols=|',
            'post:s2aa d3 reply .. cols=|L',
            'post:p3 d2 reply op 3/4 |.',
            'post:r1 d1 reply ..',
        ]);
        expect(result.rows.map(r => r.visualDepth)).toEqual([0, 1, 1, 2, 3, 1, 1]);
        expect((result.rows[3].guide.owners)).toEqual(['at://did:plc:a/app.bsky.feed.post/p2']);
        expect((result.rows[4].guide.owners)).toEqual(['at://did:plc:a/app.bsky.feed.post/p2', 'at://did:plc:a/app.bsky.feed.post/s2a']);
    });

    it('collapses a whole subtree into one fold row that ends the line', () => {
        const items = flattenThreadV2([other('root', 0), other('a', 1, { moreReplies: 2 }), other('aa', 2), other('aaa', 3), other('b', 1)]);
        expect(rows(items, 'linear', [['a', 'all']]).lines).toEqual([
            'post:root d0 anchor ..',
            'post:a d1 reply fold=all c .|',
            'fold:a all 4 |.',
            'post:b d1 reply ..',
        ]);
    });

    it('keeps the line passing through a collapsed sibling when the parent chain continues', () => {
        const items = flattenThreadV2([other('root', 0), other('a', 1), other('x', 2), other('xx', 3), other('y', 2)]);
        expect(rows(items, 'linear', [['x', 'all']]).lines).toEqual([
            'post:root d0 anchor ..',
            'post:a d1 reply c .|',
            'post:x d2 reply fold=all c ||',
            'fold:x all 1 ||',
            'post:y d2 reply |.',
        ]);
    });

    it('places a leaf read-more right after the leaf and hides deferred ones', () => {
        const items = flattenThreadV2([other('root', 0), other('a', 1, { moreReplies: 2 }), other('aa', 2), other('b', 1, { moreReplies: 5 })]);
        expect(rows(items).lines).toEqual([
            'post:root d0 anchor ..',
            'post:a d1 reply c .|',
            'post:aa d2 reply |.',
            'post:b d1 reply c .|',
            'more:b 5 |.',
        ]);
    });

    it('renders parents, read-more-up, tombstones, OP-author badge and the other-replies row', () => {
        const items = flattenThreadV2([
            other('gp', -2, { moreParents: true, did: OP }),
            other('parent', -1, { did: OP }),
            other('anchor', 0, { did: 'did:plc:z' }),
            { uri: 'at://did:plc:a/app.bsky.feed.post/gone', depth: 1, value: { $type: 'app.bsky.unspecced.defs#threadItemNotFound' } },
            other('opreply', 1, { did: OP }),
            other('child', 2),
        ]);
        expect(rows(items, 'linear', [], { hasOtherReplies: true, otherShown: false })).toEqual({
            anchorIndex: 3,
            lines: [
                'up:gp .|',
                'post:gp d-2 parent .|',
                'post:parent d-1 parent ||',
                'post:anchor d0 anchor |.',
                'tomb:gone d1 notFound ..',
                'post:opreply d1 reply author c .|',
                'post:child d2 reply |.',
                'other',
            ],
        });
    });

    it('labels the read-more after the last fetched OP post as a thread continuation', () => {
        const items = flattenThreadV2([op('p1', 0, 1, 32), op('p2', 1, 2, 32, { moreReplies: 1 }), other('x', 1, { moreReplies: 3 })]);
        const result = buildThreadRows(items, { folds: new Map(), hasOtherReplies: false, otherShown: false }, 'linear');
        const more = result.rows.filter(r => r.kind === 'readMore') as Array<Extract<ThreadRow, { kind: 'readMore' }>>;
        expect(more.map(r => [r.uri.split('/').pop(), r.continuesThread, r.nextIndex, r.total])).toEqual([
            ['p2', true, 3, 32],
            ['x', false, undefined, undefined],
        ]);
    });

    it('treats a bare seed post (no uri/depth) as the anchor while the thread loads', () => {
        const seed = [{ post: post('seed', 0).value.post as any }] as any;
        const result = buildThreadRows(seed, { folds: new Map(), hasOtherReplies: false, otherShown: false }, 'linear');
        expect(result.anchorIndex).toBe(0);
        expect(result.rows[0]).toMatchObject({ kind: 'post', role: 'anchor', key: 'post:at://did:plc:a/app.bsky.feed.post/seed' });
    });

    it('caps visual depth at the fetch limit', () => {
        const items = flattenThreadV2([other('root', 0), ...[1, 2, 3, 4, 5, 6, 7, 8].map(d => other(`d${d}`, d))]);
        const result = buildThreadRows(items, { folds: new Map(), hasOtherReplies: false, otherShown: false }, 'tree');
        expect(result.rows.map(r => r.visualDepth)).toEqual([0, 1, 2, 3, 4, 5, 6, 6, 6]);
    });
});

describe('buildThreadRows — tree view', () => {
    it('keeps DFS order, never folds OP side replies and draws ancestor columns', () => {
        const items = flattenThreadV2([
            op('p1', 0, 1), op('p2', 1, 2), op('p3', 2, 3), other('s3a', 3), other('s2a', 2), other('s2aa', 3), other('r1', 1),
        ]);
        expect(rows(items, 'tree').lines).toEqual([
            'post:p1 d0 anchor op 1/4 .|',
            'post:p2 d1 reply op 2/4 c ||',
            'post:p3 d2 reply op 3/4 c .| cols=|',
            'post:s3a d3 reply .. cols=|L',
            'post:s2a d2 reply c .| cols=L',
            'post:s2aa d3 reply .. cols=.L',
            'post:r1 d1 reply ..',
        ]);
    });

    it('shows deferred read-more rows at the end of the subtree with the child indent', () => {
        const items = flattenThreadV2([other('root', 0), other('a', 1, { moreReplies: 2 }), other('aa', 2), other('b', 1)]);
        expect(rows(items, 'tree').lines).toEqual([
            'post:root d0 anchor ..',
            'post:a d1 reply c .|',
            'post:aa d2 reply .. cols=|',
            'more:a 2 deferred .. cols=L',
            'post:b d1 reply ..',
        ]);
    });
});
