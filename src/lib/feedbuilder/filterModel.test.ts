import { describe, expect, it } from 'vitest';
import { CUSTOM_FEED_DEFS as D } from '$lib/feedbuilder/types';
import type { CustomFeedPredicate } from '$lib/feedbuilder/types';
import { filterToPredicates, predicatesToFilter, type PredicateOrGroup } from './filterModel';

const G = D.filterGroup;
const kw = (value: string): CustomFeedPredicate => ({ $type: D.predicateKeyword, value });
const IMG: CustomFeedPredicate = { $type: D.predicateHasImage, value: true };

describe('下書きの条件 ⇄ レコードの filter', () => {
  it('除くは filterGroup op:not に、または は op:or になる', () => {
    const preds: PredicateOrGroup[] = [
      { kind: 'not', item: kw('猫') },
      { kind: 'or', items: [IMG, { kind: 'not', item: kw('犬') }] }
    ];
    const filter = predicatesToFilter(preds);
    expect(filter).toEqual({
      $type: G,
      op: 'and',
      items: [
        { $type: G, op: 'not', items: [kw('猫')] },
        { $type: G, op: 'or', items: [IMG, { $type: G, op: 'not', items: [kw('犬')] }] }
      ]
    });
    expect(filterToPredicates(filter)).toEqual(preds);
  });

  it('条件がなければ filter を出さない', () => {
    expect(predicatesToFilter([])).toBeUndefined();
    expect(filterToPredicates(undefined)).toEqual([]);
  });

  it('単体の条件は 1 つの条件として読む', () => {
    expect(filterToPredicates(IMG)).toEqual([IMG]);
  });

  it('「または」の中の「かつ」の組は op:and になり、読み戻すと元の形（語句ごとの条件）', () => {
    const preds: PredicateOrGroup[] = [
      {
        kind: 'or',
        items: [
          { kind: 'and', items: [kw('猫'), IMG] },
          { kind: 'and', items: [kw('犬'), { kind: 'not', item: kw('子犬') }] },
          kw('鳥')
        ]
      }
    ];
    const filter = predicatesToFilter(preds);
    expect(filter).toEqual({
      $type: G,
      op: 'and',
      items: [
        {
          $type: G,
          op: 'or',
          items: [
            { $type: G, op: 'and', items: [kw('猫'), IMG] },
            { $type: G, op: 'and', items: [kw('犬'), { $type: G, op: 'not', items: [kw('子犬')] }] },
            kw('鳥')
          ]
        }
      ]
    });
    expect(filterToPredicates(filter)).toEqual(preds);
  });

  it('中身 1 つの「かつ」の組は条件そのものとして書き、空の組は書かない', () => {
    const preds: PredicateOrGroup[] = [
      { kind: 'or', items: [{ kind: 'and', items: [IMG] }, { kind: 'and', items: [] }, kw('猫')] }
    ];
    expect(predicatesToFilter(preds)).toEqual({
      $type: G,
      op: 'and',
      items: [{ $type: G, op: 'or', items: [IMG, kw('猫')] }]
    });
    expect(
      filterToPredicates({ $type: G, op: 'and', items: [{ $type: G, op: 'or', items: [{ $type: G, op: 'and', items: [IMG] }, kw('猫')] }] })
    ).toEqual([{ kind: 'or', items: [IMG, kw('猫')] }]);
  });

  it('最上位が「または」なら、まとまり 1 つとして読む', () => {
    const and = { $type: G, op: 'and' as const, items: [kw('猫'), IMG] };
    expect(filterToPredicates({ $type: G, op: 'or', items: [and, kw('犬')] })).toEqual([
      { kind: 'or', items: [{ kind: 'and', items: [kw('猫'), IMG] }, kw('犬')] }
    ]);
    expect(filterToPredicates({ $type: G, op: 'or', items: [IMG] })).toEqual([{ kind: 'or', items: [IMG] }]);
  });

  it('下書きの形で表せないものは null（JSON モードで扱う）', () => {
    const or = (...items: (CustomFeedPredicate | object)[]) => ({ $type: G, op: 'or' as const, items }) as never;
    const and = (...items: (CustomFeedPredicate | object)[]) => ({ $type: G, op: 'and' as const, items }) as never;
    const not = (...items: (CustomFeedPredicate | object)[]) => ({ $type: G, op: 'not' as const, items }) as never;
    expect(filterToPredicates(and(not(or(IMG, kw('猫')))))).toBeNull();
    expect(filterToPredicates(not(IMG))).toBeNull();
    expect(filterToPredicates(and(or(and(IMG, or(kw('猫'), kw('犬'))))))).toBeNull();
    expect(filterToPredicates(and(or(IMG, or(kw('猫'), kw('犬')))))).toBeNull();
    expect(filterToPredicates(and(and(IMG, kw('猫'))))).toBeNull();
    expect(filterToPredicates(and(or(not(and(IMG, kw('猫'))), kw('犬'))))).toBeNull();
    expect(filterToPredicates(and(or(and(), IMG)))).toBeNull();
    expect(filterToPredicates(or())).toBeNull();
    expect(filterToPredicates(and(not(IMG, kw('猫'))))).toBeNull();
  });
});
