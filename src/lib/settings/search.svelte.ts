import { settingsSchema } from './schema';
import type { SettingsCategoryId } from './schema.types';

/**
 * Self-built settings search (no fuzzy-search dependency). ~170 entries makes a
 * normalized substring matcher both sufficient and correct across all locales —
 * notably for CJK, where Fuse.js's token/typo model would be worse.
 *
 * The index always carries the ENGLISH label and the key's variable name (incl.
 * camelCase word-split), so an English query (e.g. "dark", "embed via") hits the
 * setting under any UI locale. Rebuilt from the schema + i18n on locale change.
 */

const categoryRoute: Record<SettingsCategoryId, string> = {
    general: '/settings/general',
    design: '/settings/design',
    timeline: '/settings/timeline',
    embed: '/settings/design/embed',
    moderation: '/settings/moderation',
};

export const categoryLabel: Record<SettingsCategoryId, string> = {
    general: 'settings_general',
    design: 'settings_design',
    timeline: 'settings_timeline',
    embed: 'settings_embed',
    moderation: 'settings_moderation',
};

function normalize(text: string): string {
    return text.normalize('NFKC').toLowerCase().replace(/[̀-ͯ]/g, '');
}

/** Leaf variable name + camelCase split: 'disableEmbedVia' -> 'disableEmbedVia disable Embed Via'. */
function keyToText(key: string): string {
    const leaf = key.split('.').pop() ?? '';
    const spaced = leaf.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    return `${leaf} ${spaced}`;
}

export interface SearchEntry {
    key: string;
    category: SettingsCategoryId;
    route: string;
    label: string; // current-locale display label
    labelNorm: string;
    labelEnNorm: string; // english label, so EN queries hit under any UI locale
    keyNorm: string; // variable name (camelCase-split)
    haystack: string; // descriptions, category label, keywords (current + english)
}

export interface SearchResult extends SearchEntry {
    score: number;
}

/**
 * Build the search index. `translate` is the resolved svelte-i18n `$_`;
 * `translateEn` resolves the same key under the English locale.
 */
export function buildIndex(
    translate: (key: string) => string,
    translateEn: (key: string) => string,
): SearchEntry[] {
    return settingsSchema.map((item) => {
        const label = item.literalLabel ? item.label : translate(item.label);
        const labelEn = item.literalLabel ? item.label : translateEn(item.label);
        const parts = [
            label,
            labelEn,
            item.description ? translate(item.description) : '',
            item.description ? translateEn(item.description) : '',
            translate(categoryLabel[item.category]),
            ...(item.searchKeywords ?? []).flatMap((keyword) => [translate(keyword), translateEn(keyword)]),
        ];
        return {
            key: item.key,
            category: item.category,
            route: categoryRoute[item.category],
            label,
            labelNorm: normalize(label),
            labelEnNorm: normalize(labelEn),
            keyNorm: normalize(keyToText(item.key)),
            haystack: normalize(parts.join(' ')),
        };
    });
}

export function searchSettings(index: SearchEntry[], query: string): SearchResult[] {
    const normalized = normalize(query.trim());
    if (!normalized) {
        return [];
    }

    const results: SearchResult[] = [];
    for (const entry of index) {
        let score = 0;
        if (entry.labelNorm === normalized) score = 100;
        else if (entry.labelNorm.startsWith(normalized)) score = 80;
        else if (entry.labelEnNorm === normalized) score = 75;
        else if (entry.labelEnNorm.startsWith(normalized)) score = 65;
        else if (entry.labelNorm.includes(normalized)) score = 55;
        else if (entry.labelEnNorm.includes(normalized)) score = 50;
        else if (entry.keyNorm.includes(normalized)) score = 40;
        else if (entry.haystack.includes(normalized)) score = 25;

        if (score) {
            results.push({ ...entry, score });
        }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, 12);
}
