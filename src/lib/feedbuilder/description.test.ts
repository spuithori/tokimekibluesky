import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/feedbuilder/session.svelte', () => ({ session: { did: null, config: null } }));

import { DESCRIPTION_MAX, draftToRecord, feedBuilder, graphemeCount, recordToDraft } from './feedBuilder.svelte';
import { addLocales, setLocale } from 'tokimeki-i18n';
import ja from './locales/ja.json';

await addLocales({ ja: [ja as Record<string, string>] });
await setLocale('ja');

describe('フィードの説明', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    feedBuilder.reset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('入れた説明が定義レコードに入り、開き直しても同じ', () => {
    feedBuilder.setName('ねこ');
    feedBuilder.setDescription('猫の写真だけ\n2 行目');
    const record = draftToRecord(feedBuilder.draft);
    expect(record.description).toBe('猫の写真だけ\n2 行目');
    const back = recordToDraft({ ...record, createdAt: '2026-11-11T00:00:00Z' });
    expect(back?.description).toBe('猫の写真だけ\n2 行目');
  });

  it('空にしたらレコードから description のキーごと消える', () => {
    feedBuilder.setName('ねこ');
    feedBuilder.setDescription('猫');
    feedBuilder.setDescription('');
    expect('description' in draftToRecord(feedBuilder.draft)).toBe(false);
  });

  it('300 書記素を超えると保存できない（絵文字の合成は 1 文字と数える）', () => {
    expect(graphemeCount('👨‍👩‍👧が')).toBe(2);
    feedBuilder.setName('ねこ');
    feedBuilder.setDescription('猫'.repeat(DESCRIPTION_MAX));
    expect(feedBuilder.descriptionTooLong).toBe(false);
    expect(feedBuilder.canSave).toBe(true);
    feedBuilder.setDescription('猫'.repeat(DESCRIPTION_MAX + 1));
    expect(feedBuilder.descriptionTooLong).toBe(true);
    expect(feedBuilder.canSave).toBe(false);
    expect(feedBuilder.saveBlockedReason).toBe(`説明は ${DESCRIPTION_MAX} 文字までです`);
  });
});
