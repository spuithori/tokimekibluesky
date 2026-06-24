import { settingsSchema } from './schema';
import { settingsNav } from './nav';
import type { SettingsCategoryId } from './schema.types';

/**
 * Self-built settings search (no fuzzy-search dependency). ~170 entries makes a
 * normalized substring matcher both sufficient and correct across all locales —
 * notably for CJK, where Fuse.js's token/typo model would be worse.
 *
 * The index carries two kinds of entry:
 *  - field entries (from the schema) — jump to a specific setting via #key.
 *  - page entries (from the nav) — jump to a whole settings page, so bespoke,
 *    not-yet-schematized pages (moderation, keyword mutes, ...) are findable.
 *
 * Every entry also carries the ENGLISH label and the key/id variable name (incl.
 * camelCase/kebab word-split), so an English query hits under any UI locale.
 * Rebuilt from the schema + nav + i18n on locale change.
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

/** Variable name + word split: 'disableEmbedVia'/'keyword-mutes' -> '... disable embed via'. */
function nameToText(name: string): string {
    const spaced = name.replace(/[-_.]/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
    return `${name} ${spaced}`;
}

export interface SearchEntry {
    id: string; // unique: field key, or 'page:<navId>'
    route: string;
    hash?: string; // field anchor (#key); absent for page entries
    label: string; // current-locale display label
    badge: string; // category label for fields; '' for page entries
    labelNorm: string;
    labelEnNorm: string; // english label, so EN queries hit under any UI locale
    keyNorm: string; // variable name / id (word-split)
    haystack: string;
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
    const fieldEntries: SearchEntry[] = settingsSchema.map((item) => {
        const label = item.literalLabel ? item.label : translate(item.label);
        const labelEn = item.literalLabel ? item.label : translateEn(item.label);
        const badge = translate(categoryLabel[item.category]);
        const parts = [
            label,
            labelEn,
            item.description ? translate(item.description) : '',
            item.description ? translateEn(item.description) : '',
            badge,
            ...(item.searchKeywords ?? []).flatMap((keyword) => [translate(keyword), translateEn(keyword)]),
        ];
        return {
            id: item.key,
            route: categoryRoute[item.category],
            hash: item.key,
            label,
            badge,
            labelNorm: normalize(label),
            labelEnNorm: normalize(labelEn),
            keyNorm: normalize(nameToText(item.key)),
            haystack: normalize(parts.join(' ')),
        };
    });

    const pageEntries: SearchEntry[] = settingsNav.map((nav) => {
        const label = translate(nav.label);
        const labelEn = translateEn(nav.label);
        return {
            id: `page:${nav.id}`,
            route: nav.href,
            hash: undefined,
            label,
            badge: '',
            labelNorm: normalize(label),
            labelEnNorm: normalize(labelEn),
            keyNorm: normalize(nameToText(nav.id)),
            haystack: normalize([label, labelEn].join(' ')),
        };
    });

    return [...fieldEntries, ...pageEntries];
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
