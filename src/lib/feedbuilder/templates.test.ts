import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/feedbuilder/session.svelte', () => ({ session: { did: null, config: null } }));

import { BUILDER_TEMPLATES, draftToRecord, recordToDraft } from './feedBuilder.svelte';
import { easySupport } from './easyMode';
import { addLocales, setLocale } from 'tokimeki-i18n';
import ja from './locales/ja.json';

await addLocales({ ja: [ja as Record<string, string>] });
await setLocale('ja');

describe('テンプレート', () => {
  const records = Object.fromEntries(BUILDER_TEMPLATES.map((t) => [t.id, draftToRecord(t.seed())]));

  it('定義の JSON（サーバーの検証にかける）', async () => {
    await expect(JSON.stringify(records, null, 2) + '\n').toMatchFileSnapshot('./templates.fixture.json');
  });

  it('保存して開き直しても、組み合わせモードで同じ下書きに戻る', () => {
    for (const t of BUILDER_TEMPLATES) {
      const back = recordToDraft({ ...records[t.id], createdAt: '2026-11-10T00:00:00Z' });
      expect(back, t.id).not.toBeNull();
      expect(draftToRecord(back!), t.id).toEqual(records[t.id]);
    }
  });

  it('かんたんモードで開けるもの', () => {
    const easy = BUILDER_TEMPLATES.filter((t) => easySupport(t.seed()).ok).map((t) => t.id);
    expect(easy).toEqual(expect.arrayContaining(['following', 'cleanHot']));
  });
});
