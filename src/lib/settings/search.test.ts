import { describe, it, expect } from 'vitest';
import { buildIndex, searchSettings } from './search.svelte';

// Minimal i18n mocks: `ja` resolves display labels, `en` resolves the english
// labels used for cross-locale search. Unknown keys fall back to the key itself
// (mirrors tokimeki-i18n returning the key when a message is missing).
const jaLabels: Record<string, string> = {
    darkmode: 'ダークモード',
    disable_embed_via: '埋め込みのvia表示を無効化',
    posts_font_size: '投稿のフォントサイズ',
    skip_repost_confirm: 'リポストの確認をスキップ',
    settings_design: 'デザイン',
    settings_general: '全般',
    settings_moderation: 'モデレーション',
    settings_keyword_mutes: 'キーワードミュート',
};
const enLabels: Record<string, string> = {
    darkmode: 'Dark mode',
    disable_embed_via: 'Disable embed via',
    posts_font_size: 'Posts font size',
    skip_repost_confirm: 'Skip repost confirmation',
    settings_design: 'Design',
    settings_general: 'General',
    settings_moderation: 'Content moderation',
    settings_keyword_mutes: 'Keyword Mutes',
};

const ja = (key: string) => jaLabels[key] ?? key;
const en = (key: string) => enLabels[key] ?? key;

describe('settings search', () => {
    const index = buildIndex(ja, en);

    it('finds a setting by its key variable name (camelCase joined)', () => {
        const results = searchSettings(index, 'darkmode');
        expect(results.some((r) => r.id === 'design.darkmode')).toBe(true);
    });

    it('finds a setting by english label while UI is in Japanese', () => {
        const results = searchSettings(index, 'dark');
        expect(results.some((r) => r.id === 'design.darkmode')).toBe(true);
    });

    it('finds via camelCase word-split (e.g. "embed via")', () => {
        const results = searchSettings(index, 'embed via');
        expect(results.some((r) => r.id === 'embed.disableEmbedVia')).toBe(true);
    });

    it('finds by current-locale (ja) label and ranks an exact match first', () => {
        const results = searchSettings(index, 'ダークモード');
        expect(results[0]?.id).toBe('design.darkmode');
    });

    it('matches english description text (haystack)', () => {
        // 'confirmation' only appears in the english label of skip_repost_confirm
        const results = searchSettings(index, 'confirmation');
        expect(results.some((r) => r.id === 'general.repostConfirmSkip')).toBe(true);
    });

    it('finds a bespoke settings page by name (page-level entry, no hash)', () => {
        const results = searchSettings(index, 'moderation');
        const page = results.find((r) => r.id === 'page:moderation');
        expect(page).toBeDefined();
        expect(page?.hash).toBeUndefined();
        expect(page?.route).toBe('/settings/moderation');
    });

    it('finds a settings page by its Japanese name', () => {
        const results = searchSettings(index, 'モデレーション');
        expect(results.some((r) => r.id === 'page:moderation')).toBe(true);
    });

    it('finds the keyword-mutes page by english query under a JA UI', () => {
        const results = searchSettings(index, 'keyword');
        expect(results.some((r) => r.id === 'page:keyword-mutes')).toBe(true);
    });

    it('returns nothing for a blank query', () => {
        expect(searchSettings(index, '   ')).toEqual([]);
    });

    it('caps results at 12', () => {
        const results = searchSettings(index, 'e');
        expect(results.length).toBeLessThanOrEqual(12);
    });
});
