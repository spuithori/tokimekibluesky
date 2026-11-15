import { describe, expect, it } from 'vitest';
import { CUSTOM_FEED_DEFS as D } from '$lib/feedbuilder/types';
import { excludeAuthorLeaf, excludedAuthorIndex, moveNode, type PredicateOrGroup } from './filterModel';

const k = (value: string) => ({ $type: D.predicateKeyword, value });
const or = (...values: string[]): PredicateOrGroup => ({ kind: 'or', items: values.map(k) });

function show(preds: PredicateOrGroup[] | null): string {
  if (!preds) return 'null';
  return preds
    .map((n) =>
      'kind' in n && n.kind === 'or'
        ? `(${n.items.map((i) => (i as { value: string }).value).join('|')})`
        : (n as { value: string }).value
    )
    .join(' ');
}

describe('条件を動かす', () => {
  const base: PredicateOrGroup[] = [k('a'), or('x', 'y'), k('b'), or('p', 'q', 'r')];

  it('最上位で並び替える（後ろへ・前へ）', () => {
    expect(show(moveNode(base, { group: 0 }, { kind: 'top', index: 3 }))).toBe('(x|y) b a (p|q|r)');
    expect(show(moveNode(base, { group: 2 }, { kind: 'top', index: 0 }))).toBe('b a (x|y) (p|q|r)');
    expect(show(moveNode(base, { group: 1 }, { kind: 'top', index: 4 }))).toBe('a b (p|q|r) (x|y)');
  });

  it('条件を「または」に入れる', () => {
    expect(show(moveNode(base, { group: 0 }, { kind: 'group', group: 1, index: 1 }))).toBe('(x|a|y) b (p|q|r)');
    expect(show(moveNode(base, { group: 2 }, { kind: 'group', group: 3, index: 3 }))).toBe('a (x|y) (p|q|r|b)');
  });

  it('「または」から出す（残りが 1 つなら条件に戻す）', () => {
    expect(show(moveNode(base, { group: 1, child: 0 }, { kind: 'top', index: 0 }))).toBe('x a y b (p|q|r)');
    expect(show(moveNode(base, { group: 3, child: 1 }, { kind: 'top', index: 4 }))).toBe('a (x|y) b (p|r) q');
  });

  it('「または」の中で並び替える', () => {
    expect(show(moveNode(base, { group: 3, child: 0 }, { kind: 'group', group: 3, index: 3 }))).toBe('a (x|y) b (q|r|p)');
    expect(show(moveNode(base, { group: 3, child: 2 }, { kind: 'group', group: 3, index: 0 }))).toBe('a (x|y) b (r|p|q)');
  });

  it('別の「または」へ移す（移した先の位置は、元が条件に戻っても変わらない）', () => {
    expect(show(moveNode(base, { group: 1, child: 1 }, { kind: 'group', group: 3, index: 0 }))).toBe('a x b (y|p|q|r)');
    expect(show(moveNode(base, { group: 3, child: 0 }, { kind: 'group', group: 1, index: 2 }))).toBe('a (x|y|p) b (q|r)');
  });

  it('中身 1 つのまとまりから出すとまとまりは消え、後ろの位置がずれる', () => {
    const single: PredicateOrGroup[] = [{ kind: 'or', items: [k('s')] }, k('a'), or('x', 'y')];
    expect(show(moveNode(single, { group: 0, child: 0 }, { kind: 'group', group: 2, index: 0 }))).toBe('a (s|x|y)');
  });

  it('まとまりはまとまりの中へ入れられない', () => {
    expect(moveNode(base, { group: 1 }, { kind: 'group', group: 3, index: 0 })).toBeNull();
    expect(moveNode(base, { group: 9 }, { kind: 'top', index: 0 })).toBeNull();
  });
});

describe('投稿者を除く', () => {
  it('同じ人を除く条件を見つける', () => {
    const preds: PredicateOrGroup[] = [k('a'), excludeAuthorLeaf('did:plc:x')];
    expect(excludedAuthorIndex(preds, 'did:plc:x')).toBe(1);
    expect(excludedAuthorIndex(preds, 'did:plc:y')).toBe(-1);

    expect(excludedAuthorIndex([{ $type: D.predicateAuthor, did: 'did:plc:x' }], 'did:plc:x')).toBe(-1);
  });
});
