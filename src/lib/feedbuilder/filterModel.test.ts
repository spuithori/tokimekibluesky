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

  it('下書きの形で表せないものは null（JSON モードで扱う）', () => {
    expect(
      filterToPredicates({ $type: G, op: 'and', items: [{ $type: G, op: 'not', items: [{ $type: G, op: 'or', items: [IMG, kw('猫')] }] }] })
    ).toBeNull();

    expect(filterToPredicates({ $type: G, op: 'or', items: [IMG] })).toBeNull();
    expect(filterToPredicates({ $type: G, op: 'not', items: [IMG] })).toBeNull();

    expect(
      filterToPredicates({ $type: G, op: 'and', items: [{ $type: G, op: 'or', items: [{ $type: G, op: 'and', items: [IMG] }] }] })
    ).toBeNull();

    expect(filterToPredicates({ $type: G, op: 'and', items: [{ $type: G, op: 'not', items: [IMG, kw('猫')] }] })).toBeNull();
  });
});
