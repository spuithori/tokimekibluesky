import { describe, expect, it } from 'vitest';
import { CUSTOM_FEED_DEFS as D } from '$lib/feedbuilder/types';
import {
  addAnd,
  excludeAuthorLeaf,
  excludedAuthorIndex,
  isAndGroup,
  isOrGroup,
  moveNode,
  removeAt,
  setLeafAt,
  type OrItem,
  type PredicateOrGroup
} from './filterModel';

const k = (value: string) => ({ $type: D.predicateKeyword, value });
const or = (...values: string[]): PredicateOrGroup => ({ kind: 'or', items: values.map(k) });
const orOf = (...items: (string | string[])[]): PredicateOrGroup => ({
  kind: 'or',
  items: items.map((i): OrItem => (typeof i === 'string' ? k(i) : { kind: 'and', items: i.map(k) }))
});
function show(preds: PredicateOrGroup[] | null): string {
  if (!preds) return 'null';
  const value = (n: unknown) => (n as { value: string }).value;
  const item = (i: OrItem) => (isAndGroup(i) ? `[${i.items.map(value).join('&')}]` : value(i));
  return preds.map((n) => (isOrGroup(n) ? `(${n.items.map(item).join('|')})` : value(n))).join(' ');
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

describe('「かつ」の組を動かす', () => {
  const base: PredicateOrGroup[] = [k('a'), orOf('x', ['p', 'q', 'r'], 'y'), k('b'), orOf('m', ['s', 't'])];

  it('条件を組に入れる（最上位から・同じまとまりから・別のまとまりから）', () => {
    expect(show(moveNode(base, { group: 0 }, { kind: 'and', group: 1, child: 1, index: 1 }))).toBe(
      '(x|[p&a&q&r]|y) b (m|[s&t])'
    );
    expect(show(moveNode(base, { group: 1, child: 0 }, { kind: 'and', group: 1, child: 1, index: 3 }))).toBe(
      'a ([p&q&r&x]|y) b (m|[s&t])'
    );
    expect(show(moveNode(base, { group: 3, child: 0 }, { kind: 'and', group: 1, child: 1, index: 0 }))).toBe(
      'a (x|[m&p&q&r]|y) b s t'
    );
  });

  it('組から出す（まとまりの中へ・最上位へ・別の組へ）', () => {
    expect(show(moveNode(base, { group: 1, child: 1, sub: 0 }, { kind: 'group', group: 1, index: 0 }))).toBe(
      'a (p|x|[q&r]|y) b (m|[s&t])'
    );
    expect(show(moveNode(base, { group: 1, child: 1, sub: 2 }, { kind: 'top', index: 0 }))).toBe(
      'r a (x|[p&q]|y) b (m|[s&t])'
    );
    expect(show(moveNode(base, { group: 1, child: 1, sub: 1 }, { kind: 'and', group: 3, child: 1, index: 1 }))).toBe(
      'a (x|[p&r]|y) b (m|[s&q&t])'
    );
  });

  it('組の中で並び替える', () => {
    expect(show(moveNode(base, { group: 1, child: 1, sub: 0 }, { kind: 'and', group: 1, child: 1, index: 3 }))).toBe(
      'a (x|[q&r&p]|y) b (m|[s&t])'
    );
    expect(show(moveNode(base, { group: 1, child: 1, sub: 2 }, { kind: 'and', group: 1, child: 1, index: 1 }))).toBe(
      'a (x|[p&r&q]|y) b (m|[s&t])'
    );
  });

  it('残りが 1 つになった組は条件に戻り、まとまりも 1 つになれば最上位に出る', () => {
    expect(show(moveNode(base, { group: 3, child: 1, sub: 0 }, { kind: 'group', group: 3, index: 0 }))).toBe(
      'a (x|[p&q&r]|y) b (s|m|t)'
    );
    const single: PredicateOrGroup[] = [orOf(['s', 't']), k('a')];
    expect(show(moveNode(single, { group: 0, child: 0, sub: 0 }, { kind: 'top', index: 2 }))).toBe('t a s');
  });

  it('組ごと動かす（まとまりの中で・別のまとまりへ）', () => {
    expect(show(moveNode(base, { group: 1, child: 1 }, { kind: 'group', group: 1, index: 3 }))).toBe(
      'a (x|y|[p&q&r]) b (m|[s&t])'
    );
    expect(show(moveNode(base, { group: 1, child: 1 }, { kind: 'group', group: 3, index: 0 }))).toBe(
      'a (x|y) b ([p&q&r]|m|[s&t])'
    );
  });

  it('組を最上位に出すと、ばらして並ぶ（最上位は「かつ」なので同じ意味）', () => {
    expect(show(moveNode(base, { group: 3, child: 1 }, { kind: 'top', index: 0 }))).toBe('s t a (x|[p&q&r]|y) b m');
  });

  it('組は組の中へ、まとまりは組の中へ入れられない。組でないところを組として指しても動かない', () => {
    expect(moveNode(base, { group: 3, child: 1 }, { kind: 'and', group: 1, child: 1, index: 0 })).toBeNull();
    expect(moveNode(base, { group: 3 }, { kind: 'and', group: 1, child: 1, index: 0 })).toBeNull();
    expect(moveNode(base, { group: 1, child: 1 }, { kind: 'and', group: 1, child: 1, index: 0 })).toBeNull();
    expect(moveNode(base, { group: 0 }, { kind: 'and', group: 1, child: 0, index: 0 })).toBeNull();
    expect(moveNode(base, { group: 1, child: 0, sub: 0 }, { kind: 'top', index: 0 })).toBeNull();
    expect(moveNode(base, { group: 1, child: 1, sub: 9 }, { kind: 'top', index: 0 })).toBeNull();
  });
});

describe('その場での編集', () => {
  const base: PredicateOrGroup[] = [k('a'), orOf('x', ['p', 'q'], 'y')];

  it('「かつ」で足すと、条件 1 つは組になり、組には末尾に加わる', () => {
    expect(show(addAnd(base, 1, 0, k('n')))).toBe('a ([x&n]|[p&q]|y)');
    expect(show(addAnd(base, 1, 1, k('n')))).toBe('a (x|[p&q&n]|y)');
    expect(show(addAnd([or('x')], 0, 0, k('n')))).toBe('([x&n])');
    expect(addAnd(base, 0, 0, k('n'))).toBe(base);
    expect(addAnd(base, 1, 9, k('n'))).toBe(base);
  });

  it('条件を差し替える（まとまりの中・組の中）', () => {
    expect(show(setLeafAt(base, { group: 1, child: 0 }, k('n')))).toBe('a (n|[p&q]|y)');
    expect(show(setLeafAt(base, { group: 1, child: 1, sub: 1 }, k('n')))).toBe('a (x|[p&n]|y)');
    expect(show(setLeafAt(base, { group: 0 }, k('n')))).toBe('n (x|[p&q]|y)');
    expect(setLeafAt(base, { group: 1, child: 1 }, k('n'))).toBe(base);
    expect(setLeafAt(base, { group: 1 }, k('n'))).toBe(base);
  });

  it('条件を外す（残りが 1 つの組・まとまりは条件に戻る）', () => {
    expect(show(removeAt(base, { group: 1, child: 1, sub: 0 }))).toBe('a (x|q|y)');
    expect(show(removeAt(base, { group: 1, child: 0 }))).toBe('a ([p&q]|y)');
    expect(show(removeAt(base, { group: 1, child: 1 }))).toBe('a (x|y)');
    expect(show(removeAt([k('a'), or('x', 'y')], { group: 1, child: 0 }))).toBe('a y');
    expect(show(removeAt([k('a'), orOf('x', ['p', 'q'])], { group: 1, child: 0 }))).toBe('a p q');
    expect(show(removeAt([or('x')], { group: 0, child: 0 }))).toBe('');
    expect(show(removeAt([or('s'), or('x', 'y', 'z')], { group: 1, child: 0 }))).toBe('(s) (y|z)');
    expect(removeAt(base, { group: 5 })).toBe(base);
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
