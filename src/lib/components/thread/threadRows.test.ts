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
    const cols = g.columns.length ? ' cols=' + g.columns.map(c => (c === 'pass' ? '|' : c === 'end' ? 'L' : '.')).join('') : '';
    const rel = row.relation === 'nested' ? ' >' : row.relation === 'detached' ? ' ~' : '';
    switch (row.kind) {
        case 'post':
            return `post:${row.key.split('/').pop()} i${row.indent}${rel} ${row.role}${row.isOp ? ' op' : ''}${row.isRootAuthor ? ' author' : ''}${row.number ? ` ${row.number.index}/${row.number.count}` : ''}${row.fold !== 'none' ? ` fold=${row.fold}` : ''}${row.canCollapse ? ' c' : ''} ${guide}${cols}`;
        case 'tombstone':
            return `tomb:${row.key.split('/').pop()} i${row.indent}${rel} ${row.reason} ${guide}${cols}`;
        case 'fold':
            return `fold:${row.uri.split('/').pop()} ${row.mode} ${row.count} ${guide}${cols}`;
        case 'readMore':
            return `more:${row.uri.split('/').pop()} ${row.count}${row.deferred ? ' deferred' : ''} ${guide}${cols}`;
        case 'readMoreUp':
            return `up:${row.uri.split('/').pop()} ${guide}`;
        case 'showOther':
            return `other i${row.indent}${rel} ${guide}${cols}`;
    }
}

function rows(items: ReturnType<typeof flattenThreadV2>, view: ThreadView = 'linear', folds: [string, FoldMode][] = [], other = { hasOtherReplies: false, otherShown: false }) {
    const result = buildThreadRows(items, { folds: new Map(folds.map(([id, m]) => [`at://did:plc:a/app.bsky.feed.post/${id}`, m])), ...other }, view);
    return { lines: result.rows.map(describeRow), anchorIndex: result.anchorIndex };
}

describe('buildThreadRows — linear view', () => {
    it('keeps a single reply chain flat and connected, but nests sibling replies under their parent', () => {
        const items = flattenThreadV2([other('root', 0), other('a', 1), other('aa', 2), other('aaa', 3), other('ab', 2), other('b', 1), other('bb', 2), other('bbb', 3)]);
        const result = buildThreadRows(items, { folds: new Map(), hasOtherReplies: false, otherShown: false }, 'linear');
        expect(result.rows.map(describeRow)).toEqual([
            'post:root i0 anchor ..',
            'post:a i0 ~ reply c .|',
            'post:aa i1 > reply c .| cols=|',
            'post:aaa i1 reply |. cols=|',
            'post:ab i1 > reply .. cols=L',
            'post:b i0 ~ reply c .|',
            'post:bb i0 reply c ||',
            'post:bbb i0 reply |.',
        ]);
    });

    it('never draws a vertical line through sibling replies (the Rose case)', () => {
        const items = flattenThreadV2([other('root', 0), other('rose', 1), ...['r1', 'r2', 'r3', 'r4', 'r5'].map(id => other(id, 2)), other('next', 1)]);
        const result = buildThreadRows(items, { folds: new Map(), hasOtherReplies: false, otherShown: false }, 'linear');
        expect(result.rows.map(describeRow)).toEqual([
            'post:root i0 anchor ..',
            'post:rose i0 ~ reply c .|',
            'post:r1 i1 > reply .. cols=|',
            'post:r2 i1 > reply .. cols=|',
            'post:r3 i1 > reply .. cols=|',
            'post:r4 i1 > reply .. cols=|',
            'post:r5 i1 > reply .. cols=L',
            'post:next i0 ~ reply ..',
        ]);
        for (const row of result.rows.slice(2, 7)) {
            expect(row.guide.top).toBe(false);
            expect(row.guide.owners).toEqual(['at://did:plc:a/app.bsky.feed.post/rose']);
        }
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
                'post:p1 i0 anchor op 1/4 .|',
                'post:p2 i0 reply op 2/4 fold=side c ||',
                'fold:p2 side 1 ||',
                'post:p3 i0 reply op 3/4 fold=side c ||',
                'fold:p3 side 2 ||',
                'post:p4 i0 reply op 4/4 |.',
                'post:r1 i0 ~ reply ..',
                'post:r2 i0 ~ reply ..',
            ],
        });
    });

    it('opens a side fold directly below its OP post and keeps the line running through the group', () => {
        const items = flattenThreadV2([op('p1', 0, 1), op('p2', 1, 2), op('p3', 2, 3), other('s2a', 2), other('s2aa', 3), other('r1', 1)]);
        const result = buildThreadRows(items, { folds: new Map([['at://did:plc:a/app.bsky.feed.post/p2', 'none']]), hasOtherReplies: false, otherShown: false }, 'linear');
        expect(result.rows.map(describeRow)).toEqual([
            'post:p1 i0 anchor op 1/4 .|',
            'post:p2 i0 reply op 2/4 c ||',
            'fold:p2 open 1 ||',
            'post:s2a i1 > reply c .| cols=|',
            'post:s2aa i1 reply |. cols=|',
            'post:p3 i0 reply op 3/4 |.',
            'post:r1 i0 ~ reply ..',
        ]);
        expect(result.rows.map(r => r.indent)).toEqual([0, 0, 0, 1, 1, 0, 0]);
        expect((result.rows[3].guide.owners)).toEqual(['at://did:plc:a/app.bsky.feed.post/p2']);
        expect((result.rows[4].guide.owners)).toEqual(['at://did:plc:a/app.bsky.feed.post/p2']);
    });

    it('collapses a whole subtree into one fold row that ends the line', () => {
        const items = flattenThreadV2([other('root', 0), other('a', 1, { moreReplies: 2 }), other('aa', 2), other('aaa', 3), other('b', 1)]);
        expect(rows(items, 'linear', [['a', 'all']]).lines).toEqual([
            'post:root i0 anchor ..',
            'post:a i0 ~ reply fold=all c .|',
            'fold:a all 4 |.',
            'post:b i0 ~ reply ..',
        ]);
    });

    it('keeps the parent column passing a collapsed sibling until the last sibling', () => {
        const items = flattenThreadV2([other('root', 0), other('a', 1), other('x', 2), other('xx', 3), other('y', 2)]);
        expect(rows(items, 'linear', [['x', 'all']]).lines).toEqual([
            'post:root i0 anchor ..',
            'post:a i0 ~ reply c .|',
            'post:x i1 > reply fold=all c .| cols=|',
            'fold:x all 1 |. cols=|',
            'post:y i1 > reply .. cols=L',
        ]);
    });

    it('places a leaf read-more right after the leaf and hides deferred ones', () => {
        const items = flattenThreadV2([other('root', 0), other('a', 1, { moreReplies: 2 }), other('aa', 2), other('b', 1, { moreReplies: 5 })]);
        expect(rows(items).lines).toEqual([
            'post:root i0 anchor ..',
            'post:a i0 ~ reply c .|',
            'post:aa i0 reply |.',
            'post:b i0 ~ reply c .|',
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
                'post:gp i0 parent .|',
                'post:parent i0 parent ||',
                'post:anchor i0 anchor ||',
                'tomb:gone i1 > notFound .. cols=|',
                'post:opreply i1 > reply author c .| cols=|',
                'post:child i1 reply |. cols=|',
                'other i1 > .. cols=L',
            ],
        });
    });

    it('hangs the replies of a reply-anchor off it exactly as when that reply is a child (the Rose case, both views)', () => {
        const asChild = flattenThreadV2([other('root', 0), other('rose', 1), ...['r1', 'r2', 'r3'].map(id => other(id, 2)), other('r3a', 3), other('next', 1)]);
        const asAnchor = flattenThreadV2([other('root', -1), other('rose', 0), ...['r1', 'r2', 'r3'].map(id => other(id, 1)), other('r3a', 2)]);
        for (const view of ['linear', 'tree'] as ThreadView[]) {
            const child = rows(asChild, view).lines;
            const anchor = rows(asAnchor, view).lines;
            expect(anchor.slice(0, 2)).toEqual(['post:root i0 parent .|', 'post:rose i0 anchor ||']);
            expect(anchor.slice(2)).toEqual(child.slice(2, -1));
        }
        expect(rows(asAnchor, 'linear').lines).toEqual([
            'post:root i0 parent .|',
            'post:rose i0 anchor ||',
            'post:r1 i1 > reply .. cols=|',
            'post:r2 i1 > reply .. cols=|',
            'post:r3 i1 > reply c .| cols=L',
            'post:r3a i1 reply |. cols=L',
        ]);
        expect(rows(asAnchor, 'tree').lines).toEqual([
            'post:root i0 parent .|',
            'post:rose i0 anchor ||',
            'post:r1 i1 > reply .. cols=|',
            'post:r2 i1 > reply .. cols=|',
            'post:r3 i1 > reply c .| cols=L',
            'post:r3a i2 > reply .. cols=.L',
        ]);
    });

    it('continues a reply-anchor with a single reply as a plain chain', () => {
        const items = flattenThreadV2([other('root', -1), other('a', 0), other('b', 1), other('c', 2)]);
        expect(rows(items).lines).toEqual([
            'post:root i0 parent .|',
            'post:a i0 anchor ||',
            'post:b i0 reply c ||',
            'post:c i0 reply |.',
        ]);
        expect(rows(items, 'tree').lines).toEqual([
            'post:root i0 parent .|',
            'post:a i0 anchor ||',
            'post:b i1 > reply c .| cols=L',
            'post:c i2 > reply .. cols=.L',
        ]);
    });

    it('keeps the thread root special: its replies stay detached blocks even though replies of any other anchor nest', () => {
        const rootAnchored = flattenThreadV2([other('root', 0), other('a', 1), other('b', 1)]);
        expect(rows(rootAnchored).lines).toEqual(['post:root i0 anchor ..', 'post:a i0 ~ reply ..', 'post:b i0 ~ reply ..']);
        const truncated = flattenThreadV2([other('mid', 0, { moreParents: true }), other('a', 1), other('b', 1)]);
        expect(rows(truncated).lines).toEqual(['up:mid .|', 'post:mid i0 anchor .|', 'post:a i1 > reply .. cols=|', 'post:b i1 > reply .. cols=L']);
        const replyRecord = flattenThreadV2([other('orphan', 0, { post: { ...post('orphan', 0).value.post, record: { reply: { root: { uri: 'x', cid: 'x' }, parent: { uri: 'x', cid: 'x' } } } } }), other('a', 1), other('b', 1)]);
        expect(rows(replyRecord).lines).toEqual(['post:orphan i0 anchor .|', 'post:a i1 > reply .. cols=|', 'post:b i1 > reply .. cols=L']);
    });

    it('shows the side replies of an OP-post anchor open by default before the chain, still foldable, and without a fold row in tree view', () => {
        const items = flattenThreadV2([op('p1', -1, 1), op('p2', 0, 2), op('p3', 1, 3), other('s', 1), other('t', 1)]);
        expect(rows(items).lines).toEqual([
            'post:p1 i0 parent op 1/4 .|',
            'post:p2 i0 anchor op 2/4 ||',
            'fold:p2 open 2 ||',
            'post:s i1 > reply .. cols=|',
            'post:t i1 > reply .. cols=|',
            'post:p3 i0 reply op 3/4 |.',
        ]);
        expect(rows(items, 'linear', [['p2', 'side']]).lines).toEqual([
            'post:p1 i0 parent op 1/4 .|',
            'post:p2 i0 anchor op 2/4 fold=side ||',
            'fold:p2 side 2 ||',
            'post:p3 i0 reply op 3/4 |.',
        ]);
        expect(rows(items, 'tree').lines).toEqual([
            'post:p1 i0 parent op 1/4 .|',
            'post:p2 i0 anchor op 2/4 ||',
            'post:s i1 > reply .. cols=|',
            'post:t i1 > reply .. cols=|',
            'post:p3 i0 reply op 3/4 |.',
        ]);
    });

    it('lets the other-replies row stand in for hidden siblings of a reply-anchor', () => {
        const withChild = flattenThreadV2([other('root', -1), other('a', 0), other('b', 1)]);
        expect(rows(withChild, 'linear', [], { hasOtherReplies: true, otherShown: false }).lines).toEqual([
            'post:root i0 parent .|',
            'post:a i0 anchor ||',
            'post:b i1 > reply .. cols=|',
            'other i1 > .. cols=L',
        ]);
        expect(rows(withChild, 'linear', [], { hasOtherReplies: true, otherShown: true }).lines.slice(2)).toEqual(['post:b i0 reply |.']);
        const childless = flattenThreadV2([other('root', -1), other('a', 0)]);
        expect(rows(childless, 'linear', [], { hasOtherReplies: true, otherShown: false }).lines).toEqual([
            'post:root i0 parent .|',
            'post:a i0 anchor ||',
            'other i0 |.',
        ]);
        const rootAnchored = flattenThreadV2([other('root', 0), other('a', 1)]);
        expect(rows(rootAnchored, 'linear', [], { hasOtherReplies: true, otherShown: false }).lines).toEqual([
            'post:root i0 anchor ..',
            'post:a i0 ~ reply ..',
            'other i0 ~ ..',
        ]);
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

    it('saturates the indent at the cap (desktop 5, mobile 3) while single chains stay flat in linear view', () => {
        const items = flattenThreadV2([other('root', 0), ...[1, 2, 3, 4, 5, 6, 7, 8].map(d => other(`d${d}`, d))]);
        const tree = buildThreadRows(items, { folds: new Map(), hasOtherReplies: false, otherShown: false }, 'tree');
        expect(tree.rows.map(r => r.indent)).toEqual([0, 0, 1, 2, 3, 4, 5, 5, 5]);
        const mobile = buildThreadRows(items, { folds: new Map(), hasOtherReplies: false, otherShown: false }, 'tree', { maxIndent: 3 });
        expect(mobile.rows.map(r => r.indent)).toEqual([0, 0, 1, 2, 3, 3, 3, 3, 3]);
        expect(mobile.rows.slice(4).every(r => r.guide.columns.length === 3)).toBe(true);
        const linear = buildThreadRows(items, { folds: new Map(), hasOtherReplies: false, otherShown: false }, 'linear');
        expect(linear.rows.map(r => r.indent)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
        expect(linear.rows.slice(2).every(r => r.guide.top)).toBe(true);
    });
});

describe('buildThreadRows — tree view', () => {
    it('keeps the OP chain as a flat spine, hangs side replies off each OP post without fold rows, and nests every reply', () => {
        const items = flattenThreadV2([
            op('p1', 0, 1), op('p2', 1, 2), op('p3', 2, 3), other('s3a', 3), other('s2a', 2), other('s2aa', 3), other('r1', 1),
        ]);
        expect(rows(items, 'tree').lines).toEqual([
            'post:p1 i0 anchor op 1/4 .|',
            'post:p2 i0 reply op 2/4 c ||',
            'post:s2a i1 > reply c .| cols=|',
            'post:s2aa i2 > reply .. cols=|L',
            'post:p3 i0 reply op 3/4 c ||',
            'post:s3a i1 > reply .. cols=L',
            'post:r1 i0 ~ reply ..',
        ]);
        expect(rows(items, 'tree', [['p2', 'side']]).lines.filter(l => l.startsWith('fold'))).toEqual([]);
    });

    it('shows deferred read-more rows at the end of the subtree with the child indent', () => {
        const items = flattenThreadV2([other('root', 0), other('a', 1, { moreReplies: 2 }), other('aa', 2), other('b', 1)]);
        expect(rows(items, 'tree').lines).toEqual([
            'post:root i0 anchor ..',
            'post:a i0 ~ reply c .|',
            'post:aa i1 > reply .. cols=|',
            'more:a 2 deferred .. cols=L',
            'post:b i0 ~ reply ..',
        ]);
    });
});
