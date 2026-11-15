import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/feedbuilder/session.svelte', () => ({ session: { did: null, agent: null } }));

import { CUSTOM_FEED_DEFS as D } from '$lib/feedbuilder/types';
import type { CustomFeedPredicate } from '$lib/feedbuilder/types';
import type { BuilderDraft, PredicateOrGroup } from './feedBuilder.svelte';
import type { FilterLeaf } from './filterModel';
import {
  EASY_CONDITIONS,
  addableConditions,
  appendCond,
  defaultJoiner,
  joinerAfter,
  removeCond,
  replaceCond,
  setNegated,
  toggleJoiner,
  easyConditionOf,
  easySentence,
  easySentenceText,
  easyUnits,
  easySorts,
  easySupport
} from './easyMode';
import { addLocales, setLocale } from 'tokimeki-i18n';
import ja from './locales/ja.json';

await addLocales({ ja: [ja as Record<string, string>] });
await setLocale('ja');

function draft(over: Partial<BuilderDraft> = {}): BuilderDraft {
  return {
    name: '',
    source: { kind: 'timeline', scope: 'global' },
    predicates: [],
    sort: 'chronological',
    visibility: 'private',
    ...over
  };
}

const kw = (value: string): CustomFeedPredicate => ({ $type: D.predicateKeyword, value });
const IMG: CustomFeedPredicate = { $type: D.predicateHasImage, value: true };
const VID: CustomFeedPredicate = { $type: D.predicateHasVideo, value: true };
const JA: CustomFeedPredicate = { $type: D.predicateLanguage, codes: ['ja'] };
const text = (predicates: PredicateOrGroup[]) => easySentenceText(draft({ predicates }));

function reason(d: BuilderDraft): string | null {
  const s = easySupport(d);
  return s.ok ? null : s.reason;
}

describe('文', () => {
  it('条件がなければ「起点の投稿を並びで。」', () => {
    expect(easySentenceText(draft())).toBe('Bluesky 全体の投稿を新しい順で。');
  });

  it('条件は起点と「の投稿を」の間に、置いた順で並ぶ', () => {
    const d = draft({
      predicates: [
        { $type: D.predicateLanguage, codes: ['ja'] },
        { $type: D.predicateHasImage, value: true }
      ],
      sort: 'trending',
      sortWindow: 'PT24H'
    });
    expect(easySentenceText(d)).toBe('Bluesky 全体の日本語かつ画像つきの投稿をいま伸びている順で。');
    const conds = easySentence(d).filter((t) => t.kind === 'cond');
    expect(conds.map((t) => (t.kind === 'cond' ? t.index : -1))).toEqual([0, 1]);
  });

  it('「〜を含む」で終わるときは「の」を挟まない', () => {
    expect(text([JA, kw('猫')])).toBe('Bluesky 全体の日本語かつ「猫」を含む投稿を新しい順で。');
    expect(text([kw('猫'), JA])).toBe('Bluesky 全体の「猫」を含むかつ日本語の投稿を新しい順で。');
  });

  it('語句が続くときは「を含む」を最後に 1 回だけ付ける', () => {
    expect(text([{ kind: 'or', items: [kw('猫'), kw('犬')] }])).toBe('Bluesky 全体の「猫」または「犬」を含む投稿を新しい順で。');
    expect(text([kw('猫'), kw('犬')])).toBe('Bluesky 全体の「猫」かつ「犬」を含む投稿を新しい順で。');
  });

  it('「かつ」と「または」が混ざるときだけ、「または」のまとまりを（ ）で囲む', () => {
    expect(text([{ kind: 'or', items: [IMG, VID] }])).toBe('Bluesky 全体の画像つきまたは動画つきの投稿を新しい順で。');
    expect(text([{ kind: 'or', items: [kw('猫'), kw('犬')] }, IMG])).toBe(
      'Bluesky 全体の（「猫」または「犬」）を含むかつ画像つきの投稿を新しい順で。'
    );
    expect(text([JA, { kind: 'or', items: [IMG, VID] }])).toBe(
      'Bluesky 全体の日本語かつ（画像つきまたは動画つき）の投稿を新しい順で。'
    );
  });

  it('「を含む」は（ ）をまたいで分け合わない', () => {
    expect(text([kw('猫'), { kind: 'or', items: [kw('犬'), IMG] }])).toBe(
      'Bluesky 全体の「猫」を含むかつ（「犬」を含むまたは画像つき）の投稿を新しい順で。'
    );
    expect(text([{ kind: 'or', items: [kw('猫'), kw('犬')] }, kw('鳥')])).toBe(
      'Bluesky 全体の（「猫」または「犬」）を含むかつ「鳥」を含む投稿を新しい順で。'
    );
  });

  it('改行しないまとまり: 「（」は次の札に、「）」や「を含む」は前の札に付く', () => {
    const d = draft({ predicates: [JA, { kind: 'or', items: [kw('猫'), IMG] }] });
    const units = easyUnits(easySentence(d)).map((u) =>
      u.tokens.map((t) => (t.kind === 'text' ? t.text : t.kind === 'join' ? `<${t.op}>` : `[${t.label}]`)).join('')
    );
    expect(units).toEqual([
      '[Bluesky 全体]の',
      '[日本語]',
      '<and>',
      '（[「猫」]を含む',
      '<or>',
      '[画像つき]）の投稿を',
      '[新しい順]で。'
    ]);
  });

  it('つなぎの語は、隣どうしの条件の位置（1 列での番号）を持つ', () => {
    const d = draft({ predicates: [JA, { kind: 'or', items: [IMG, VID] }] });
    const joins = easySentence(d).flatMap((t) => (t.kind === 'join' ? [[t.index, t.op]] : []));
    expect(joins).toEqual([
      [0, 'and'],
      [1, 'or']
    ]);
  });

  it('期間を選べる並びは、期間も文に出す（全期間も明記する）', () => {
    expect(easySentenceText(draft({ sort: 'likeCount', sortWindow: 'P7D' }))).toBe(
      'Bluesky 全体の投稿をいいね順（7d）で。'
    );
    expect(easySentenceText(draft({ sort: 'likeCount', sortWindow: undefined }))).toBe(
      'Bluesky 全体の投稿をいいね順（全期間）で。'
    );
  });

  it('検索の起点は語句ごと文に出る', () => {
    expect(easySentenceText(draft({ source: { kind: 'search', query: ' 猫 ' } }))).toBe(
      '「猫」の検索結果の投稿を新しい順で。'
    );
  });
});

describe('かつ・または', () => {
  it('「かつ」を押すと隣のまとまりと合わさり、「または」を押すとそこで分かれる', () => {
    const start: PredicateOrGroup[] = [JA, IMG, VID];
    const merged = toggleJoiner(start, 1);
    expect(merged).toEqual([JA, { kind: 'or', items: [IMG, VID] }]);
    expect(joinerAfter(merged, 0)).toBe('and');
    expect(joinerAfter(merged, 1)).toBe('or');

    expect(toggleJoiner(merged, 0)).toEqual([{ kind: 'or', items: [JA, IMG, VID] }]);

    expect(toggleJoiner([{ kind: 'or', items: [JA, IMG, VID] }], 0)).toEqual([JA, { kind: 'or', items: [IMG, VID] }]);

    expect(toggleJoiner(toggleJoiner(start, 1), 1)).toEqual(start);
  });

  it('外すと、1 つだけ残ったまとまりは、ただの条件に戻る', () => {
    expect(removeCond([JA, { kind: 'or', items: [IMG, VID] }], 2)).toEqual([JA, IMG]);
    expect(removeCond([JA, { kind: 'or', items: [IMG, VID] }], 0)).toEqual([{ kind: 'or', items: [IMG, VID] }]);
  });

  it('差し替えは 1 列での番号で、まとまりの中も指せる', () => {
    expect(replaceCond([JA, { kind: 'or', items: [kw('猫'), kw('犬')] }], 2, kw('鳥'))).toEqual([
      JA,
      { kind: 'or', items: [kw('猫'), kw('鳥')] }
    ]);
  });

  it('足すときは、語句のあとの語句だけ「または」で、ほかは「かつ」', () => {
    expect(defaultJoiner([kw('猫')], kw('犬'))).toBe('or');
    expect(defaultJoiner([kw('猫')], IMG)).toBe('and');
    expect(defaultJoiner([IMG], kw('猫'))).toBe('and');
    expect(appendCond([kw('猫')], kw('犬'), 'or')).toEqual([{ kind: 'or', items: [kw('猫'), kw('犬')] }]);
    expect(appendCond([kw('猫')], IMG, 'and')).toEqual([kw('猫'), IMG]);
  });

  it('同じ条件は「または」のまとまりの中にあっても 2 度出さない', () => {
    const ids = addableConditions(draft({ predicates: [{ kind: 'or', items: [IMG, VID] }] })).map((c) => c.id);
    expect(ids).not.toContain('image');
    expect(ids).not.toContain('video');
  });
});

describe('除く（NOT）', () => {
  const not = (p: CustomFeedPredicate): FilterLeaf => ({ kind: 'not', item: p });

  it('除いた条件は「〜を含まない」「〜なし」「〜以外」「〜未満」になる', () => {
    expect(text([not(kw('猫'))])).toBe('Bluesky 全体の「猫」を含まない投稿を新しい順で。');
    expect(text([not(IMG)])).toBe('Bluesky 全体の画像なしの投稿を新しい順で。');
    expect(text([not(JA)])).toBe('Bluesky 全体の日本語以外の投稿を新しい順で。');
    expect(text([not({ $type: D.predicateMinLikes, threshold: 10 })])).toBe('Bluesky 全体のいいね 10 未満の投稿を新しい順で。');
  });

  it('除く語句は「を含まない」を分け合わず、1 つずつ書く', () => {
    expect(text([{ kind: 'or', items: [{ kind: 'not', item: kw('猫') }, { kind: 'not', item: kw('犬') }] }])).toBe(
      'Bluesky 全体の「猫」を含まないまたは「犬」を含まない投稿を新しい順で。'
    );
    expect(text([kw('猫'), not(kw('犬'))])).toBe('Bluesky 全体の「猫」を含むかつ「犬」を含まない投稿を新しい順で。');
  });

  it('付け外しと差し替えで、ほかの条件や「除く」は変わらない', () => {
    const start: PredicateOrGroup[] = [JA, { kind: 'or', items: [kw('猫'), IMG] }];
    const negated = setNegated(start, 1, true);
    expect(negated).toEqual([JA, { kind: 'or', items: [{ kind: 'not', item: kw('猫') }, IMG] }]);
    expect(replaceCond(negated, 1, kw('鳥'))).toEqual([JA, { kind: 'or', items: [{ kind: 'not', item: kw('鳥') }, IMG] }]);
    expect(setNegated(negated, 1, false)).toEqual(start);
  });

  it('除く語句は関連度順の根拠にならない', () => {
    expect(easySorts(draft({ predicates: [not(kw('猫'))] })).some((o) => o.sort === 'relevance')).toBe(false);
  });

  it('除く語句が絡むときの最初のつなぎは「かつ」', () => {
    expect(defaultJoiner([not(kw('猫'))], kw('犬'))).toBe('and');
    expect(defaultJoiner([kw('猫')], { kind: 'not', item: kw('犬') })).toBe('and');
  });

  it('除く条件を含む定義も、かんたんモードで表せる', () => {
    expect(reason(draft({ predicates: [not(kw('猫')), { kind: 'or', items: [IMG, not(VID)] }] }))).toBeNull();
  });
});

describe('並び順', () => {
  it('あなた向けなら、おすすめ度順が先頭に出る', () => {
    const sorts = easySorts(draft({ source: { kind: 'forYou', events: ['like'], withinHours: 24 } }));
    expect(sorts[0]).toMatchObject({ sort: 'relevance', label: 'おすすめ度順' });
  });

  it('関連度順は、語句があるときだけ選べる', () => {
    const has = (d: BuilderDraft) => easySorts(d).some((o) => o.sort === 'relevance');
    expect(has(draft())).toBe(false);
    expect(has(draft({ predicates: [{ $type: D.predicateKeyword, value: '猫' }] }))).toBe(true);
    expect(has(draft({ source: { kind: 'search', query: '猫' } }))).toBe(true);
  });
});

describe('条件', () => {
  it('どの条件も、作った初期値を自分自身として読み戻せる', () => {
    for (const c of EASY_CONDITIONS) {
      expect(easyConditionOf(c.make())?.id).toBe(c.id);
    }
  });

  it('同じ条件は 2 度出さないが、語句は何度でも足せる', () => {
    const d = draft({
      predicates: [
        { $type: D.predicateHasImage, value: true },
        { $type: D.predicateKeyword, value: '猫' }
      ]
    });
    const ids = addableConditions(d).map((c) => c.id);
    expect(ids).not.toContain('image');
    expect(ids).toContain('keyword');
    expect(ids).toContain('language');
  });
});

describe('かんたんモードで表せるか', () => {
  it('よくある定義は表せる', () => {
    expect(reason(draft())).toBeNull();
    expect(reason(draft({ predicates: [JA, { kind: 'or', items: [kw('猫'), kw('犬')] }] }))).toBeNull();
    expect(
      reason(
        draft({
          source: { kind: 'forYou', events: ['like', 'repost'], withinHours: 24 },
          predicates: [{ $type: D.predicateHasReply, value: false }],
          sort: 'relevance',
          hideSeen: true,
          maxPerAuthor: 2
        })
      )
    ).toBeNull();
    expect(reason(draft({ sort: 'hotness', sortWindow: 'PT24H', hotnessHalflife: 'PT24H' }))).toBeNull();
  });

  it('表せない定義は、理由つきで断る', () => {
    expect(reason(draft({ source: { kind: 'authors', dids: ['did:plc:a'] } }))).toContain('特定の人');
    expect(reason(draft({ source: { kind: 'collection', postUris: [] } }))).toContain('コレクション');
    expect(reason(draft({ source: { kind: 'search', query: '猫', exact: true } }))).toContain('単語単位');
    expect(reason(draft({ predicates: [{ kind: 'or', items: [] }] }))).toContain('空の「または」');
    expect(
      reason(draft({ predicates: [{ kind: 'or', items: [IMG, { $type: D.predicateMentions, did: 'did:plc:a' }] }] }))
    ).toContain('条件');

    expect(reason(draft({ predicates: [{ $type: D.predicateHasImage, value: false }] }))).toContain('条件');
    expect(reason(draft({ predicates: [{ $type: D.predicateMentions, did: 'did:plc:a' }] }))).toContain('条件');
    expect(reason(draft({ sort: 'expression' }))).toContain('並び順');
    expect(reason(draft({ sort: 'relevance' }))).toContain('並び順');
    expect(reason(draft({ sort: 'likeCount', sortWindow: 'PT48H' }))).toContain('期間');
    expect(reason(draft({ sort: 'hotness', sortWindow: 'PT24H', hotnessHalflife: 'PT6H' }))).toContain('半減期');
  });
});

describe('リプライはフォロー中の人あてだけ', () => {
  it('「返信以外 または フォロー中の人への返信」の 1 文で表せる', () => {
    const group: PredicateOrGroup = {
      kind: 'or',
      items: [
        { $type: D.predicateHasReply, value: false },
        { $type: D.predicateReplyToFollowing, value: true }
      ]
    };
    expect(easySupport(draft({ source: { kind: 'timeline', scope: 'following' }, predicates: [group] })).ok).toBe(true);
    expect(easySentenceText(draft({ source: { kind: 'timeline', scope: 'following' }, predicates: [group] }))).toBe(
      'フォロー中の人の返信以外またはフォロー中の人への返信の投稿を新しい順で。'
    );
  });
});

describe('語句の対象', () => {
  it('代替テキストを対象にした語句は、かんたんモードでは表せない', () => {
    const preds: PredicateOrGroup[] = [{ $type: D.predicateKeyword, value: '夕焼け', target: 'alt' }];
    expect(easySupport(draft({ predicates: preds })).ok).toBe(false);
    expect(easySupport(draft({ predicates: [{ $type: D.predicateKeyword, value: '夕焼け' }] })).ok).toBe(true);
  });
});

describe('投稿者', () => {
  it('投稿者を除く条件を文で表せる（名前が分からなければ DID の頭）', () => {
    const preds: PredicateOrGroup[] = [{ kind: 'not', item: { $type: D.predicateAuthor, did: 'did:plc:abcdefghijklmnop' } }];
    expect(easySupport(draft({ predicates: preds })).ok).toBe(true);
    expect(text(preds)).toBe('Bluesky 全体のdid:plc:abcdefgh… 以外の投稿を新しい順で。');
  });

  it('投稿者は何度でも足せる', () => {
    const preds: PredicateOrGroup[] = [{ $type: D.predicateAuthor, did: 'did:plc:a' }];
    expect(addableConditions(draft({ predicates: preds })).some((c) => c.id === 'author')).toBe(true);
  });
});

describe('連投・重複', () => {
  it('かんたんモードの文で表せる', () => {
    const preds: PredicateOrGroup[] = [
      { $type: D.predicateAuthorMaxPosts, max: 100, withinHours: 24 },
      { $type: D.predicateIsDuplicate, value: false }
    ];
    expect(easySupport(draft({ predicates: preds })).ok).toBe(true);
    expect(text(preds)).toBe('Bluesky 全体の連投していない人（24 時間に 100 件まで）かつ重複なしの投稿を新しい順で。');
  });

  it('連投した時間帯だけを除く形（分単位）も文で表せる', () => {
    const preds: PredicateOrGroup[] = [{ $type: D.predicateAuthorMaxPosts, max: 10, withinMinutes: 30, mode: 'burst' }];
    expect(easySupport(draft({ predicates: preds })).ok).toBe(true);
    expect(text(preds)).toBe('Bluesky 全体の連投した時間帯以外（30 分に 10 件まで）の投稿を新しい順で。');
  });
});

describe('リポストの混在', () => {
  it('フォロー中はリポストを含むのが既定で、外したときだけ文に出す', () => {
    expect(easySupport(draft({ source: { kind: 'timeline', scope: 'following' } })).ok).toBe(true);
    expect(easySentenceText(draft({ source: { kind: 'timeline', scope: 'following', includeReposts: false } }))).toBe(
      'フォロー中の人（リポストなし）の投稿を新しい順で。'
    );
  });
});

describe('時間帯とほかのフィード', () => {
  const NIGHT: CustomFeedPredicate = { $type: D.predicateTimeOfDay, timezone: 'Asia/Tokyo', start: '22:00', end: '05:00' };
  it('時間帯の条件を文にできる', () => {
    expect(easySupport(draft({ predicates: [NIGHT] })).ok).toBe(true);
    expect(text([NIGHT])).toBe('Bluesky 全体の日本時間 22:00〜05:00の時間帯の投稿を新しい順で。');
    expect(text([{ kind: 'not', item: { ...NIGHT, weekdays: [0, 6] } }])).toBe(
      'Bluesky 全体の日本時間 22:00〜05:00・土日の時間帯以外の投稿を新しい順で。'
    );
  });
  it('ほかのフィードを起点にできる（名前は画面で差し替える）', () => {
    const feed = draft({ source: { kind: 'feed', feed: 'at://did:plc:a/app.bsky.feed.generator/x' } });
    expect(easySupport(feed).ok).toBe(true);
    expect(easySentenceText(feed)).toBe('選んだフィードの投稿を新しい順で。');
    expect(easySentenceText(draft({ source: { kind: 'feed', feed: '' } }))).toBe('ほかのフィード（未選択）の投稿を新しい順で。');
  });
});
