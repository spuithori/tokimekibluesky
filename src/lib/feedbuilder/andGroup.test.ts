import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/feedbuilder/session.svelte', () => ({ session: { did: null, config: null } }));

import { CUSTOM_FEED_DEFS as D } from '$lib/feedbuilder/types';
import type { CustomFeedPredicate } from '$lib/feedbuilder/types';
import { draftHasKeyword, draftSummary, draftToRecord, feedBuilder, recordToDraft } from './feedBuilder.svelte';
import { easySupport } from './easyMode';
import { addLocales, setLocale } from 'tokimeki-i18n';
import ja from './locales/ja.json';

await addLocales({ ja: [ja as Record<string, string>] });
await setLocale('ja');

const G = D.filterGroup;
const kw = (value: string): CustomFeedPredicate => ({ $type: D.predicateKeyword, value });
const IMG: CustomFeedPredicate = { $type: D.predicateHasImage, value: true };
const LIKES: CustomFeedPredicate = { $type: D.predicateMinLikes, threshold: 10 };
const JA: CustomFeedPredicate = { $type: D.predicateLanguage, codes: ['ja'] };

describe('語句ごとの条件', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    feedBuilder.reset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function build() {
    feedBuilder.setName('ねこといぬ');
    feedBuilder.addPredicate(JA);
    feedBuilder.addOrGroup(kw('猫'));
    feedBuilder.addToOrGroup(1, kw('犬'));
    feedBuilder.addAndCondition(1, 0, IMG);
    feedBuilder.addAndCondition(1, 1, LIKES);
  }

  it('「かつ」で足した条件は、その語句だけにかかる形でレコードに入る', () => {
    build();
    const record = draftToRecord(feedBuilder.draft);
    expect(record.filter).toEqual({
      $type: G,
      op: 'and',
      items: [
        JA,
        {
          $type: G,
          op: 'or',
          items: [
            { $type: G, op: 'and', items: [kw('猫'), IMG] },
            { $type: G, op: 'and', items: [kw('犬'), LIKES] }
          ]
        }
      ]
    });
    const back = recordToDraft({ ...record, createdAt: '2026-11-16T00:00:00Z' });
    expect(back?.predicates).toEqual(feedBuilder.draft.predicates);
    expect(draftToRecord(back!).filter).toEqual(record.filter);
  });

  it('組の中の条件を差し替え・除く・外すと、その語句の分だけ変わる', () => {
    build();
    feedBuilder.updateConditionAt({ group: 1, child: 1, sub: 1 }, { $type: D.predicateMinLikes, threshold: 30 });
    feedBuilder.updateConditionAt({ group: 1, child: 0, sub: 1 }, { kind: 'not', item: IMG });
    expect(draftToRecord(feedBuilder.draft).filter?.items[1]).toEqual({
      $type: G,
      op: 'or',
      items: [
        { $type: G, op: 'and', items: [kw('猫'), { $type: G, op: 'not', items: [IMG] }] },
        { $type: G, op: 'and', items: [kw('犬'), { $type: D.predicateMinLikes, threshold: 30 }] }
      ]
    });
    feedBuilder.removeConditionAt({ group: 1, child: 0, sub: 1 });
    expect(draftToRecord(feedBuilder.draft).filter?.items[1]).toEqual({
      $type: G,
      op: 'or',
      items: [kw('猫'), { $type: G, op: 'and', items: [kw('犬'), { $type: D.predicateMinLikes, threshold: 30 }] }]
    });
  });

  it('ドラッグで、条件を組へ入れる・組から出す', () => {
    build();
    expect(feedBuilder.moveCondition({ group: 0 }, { kind: 'and', group: 1, child: 0, index: 2 })).toBe(true);
    expect(draftToRecord(feedBuilder.draft).filter).toEqual({
      $type: G,
      op: 'and',
      items: [
        {
          $type: G,
          op: 'or',
          items: [
            { $type: G, op: 'and', items: [kw('猫'), IMG, JA] },
            { $type: G, op: 'and', items: [kw('犬'), LIKES] }
          ]
        }
      ]
    });
    expect(feedBuilder.moveCondition({ group: 0, child: 1, sub: 1 }, { kind: 'top', index: 1 })).toBe(true);
    expect(draftToRecord(feedBuilder.draft).filter).toEqual({
      $type: G,
      op: 'and',
      items: [{ $type: G, op: 'or', items: [{ $type: G, op: 'and', items: [kw('猫'), IMG, JA] }, kw('犬')] }, LIKES]
    });
  });

  it('要約の文は組を ( ) で囲み、組の中の語句も関連度順の根拠に数える', () => {
    build();
    expect(draftSummary(feedBuilder.draft)).toContain(
      '((「猫」を含む かつ 画像付き) または (「犬」を含む かつ 10 Like 以上))'
    );
    feedBuilder.reset();
    feedBuilder.addOrGroup(IMG);
    expect(draftHasKeyword(feedBuilder.draft)).toBe(false);
    feedBuilder.addAndCondition(0, 0, kw('猫'));
    expect(draftHasKeyword(feedBuilder.draft)).toBe(true);
    feedBuilder.updateConditionAt({ group: 0, child: 0, sub: 1 }, { kind: 'not', item: kw('猫') });
    expect(draftHasKeyword(feedBuilder.draft)).toBe(false);
  });

  it('かんたんモードでは表せない（理由つきで断る）', () => {
    build();
    const s = easySupport(feedBuilder.draft);
    expect(s.ok ? null : s.reason).toBe('「または」の中に「かつ」の組があります');
    feedBuilder.removeConditionAt({ group: 1, child: 0, sub: 1 });
    feedBuilder.removeConditionAt({ group: 1, child: 1, sub: 1 });
    expect(easySupport(feedBuilder.draft).ok).toBe(true);
  });
});
