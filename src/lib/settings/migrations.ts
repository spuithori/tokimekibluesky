import type { Settings } from './types';
import { createDefaultSettings } from './defaults';
import { oldThemeConvert } from '$lib/builtInThemes';

/**
 * Pure (DOM/localStorage-free) settings migration. Brings an arbitrary stored
 * payload up to CURRENT_VERSION, applies the idempotent skin/theme
 * normalisations that used to live inline in (app)/+layout.svelte, then
 * deep-merges against the defaults so missing keys are backfilled (resolving
 * schema drift) while unknown keys are preserved (non-destructive — a newer
 * client on another device must not lose keys this build doesn't know yet).
 */

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge<T>(defaults: T, stored: unknown): T {
    if (!isPlainObject(stored)) {
        return defaults;
    }

    const result: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };

    for (const key of Object.keys(stored)) {
        const storedValue = stored[key];
        const defaultValue = result[key];

        if (isPlainObject(defaultValue) && isPlainObject(storedValue)) {
            result[key] = deepMerge(defaultValue, storedValue);
        } else {
            // Arrays, primitives and unknown keys: take the stored value verbatim.
            result[key] = storedValue;
        }
    }

    return result as T;
}

const LABEL_PREFS = new Set(['hide', 'warn', 'ignore']);

const LEGACY_SINGLE_WIDTH_PX: Record<string, number> = {
    xxs: 380, xs: 420, small: 460, medium: 528, large: 600, xl: 680, xxl: 760,
};

function normalizeLabelers(value: unknown): unknown[] {
    if (!Array.isArray(value)) {
        return [];
    }
    const result: { did: string; labels: Record<string, string> }[] = [];
    for (const entry of value) {
        if (!isPlainObject(entry) || typeof entry.did !== 'string') {
            continue;
        }
        const labels: Record<string, string> = {};
        if (isPlainObject(entry.labels)) {
            for (const [key, pref] of Object.entries(entry.labels)) {
                if (typeof pref === 'string' && LABEL_PREFS.has(pref)) {
                    labels[key] = pref;
                }
            }
        }
        result.push({ did: entry.did, labels });
    }
    return result;
}

export function migrate(
    rawSettings: unknown,
    legacy?: { stateSettings?: unknown; keywordMutes?: unknown; labelerSettings?: unknown },
): Settings {
    const defaults = createDefaultSettings();

    if (!isPlainObject(rawSettings)) {
        return defaults;
    }

    const stored = structuredClone(rawSettings) as Record<string, any>;

    if (!stored.version) {
        stored.version = 1;
    }

    if (stored.version < 2) {
        if (isPlainObject(stored.design)) {
            stored.design.skin = 'default';
        }
        stored.version = 2;
    }

    if (stored.version < 3) {
        if (!isPlainObject(stored.embed)) {
            stored.embed = {};
        }
        if ((stored.embed as Record<string, unknown>).klipy === undefined) {
            (stored.embed as Record<string, unknown>).klipy = true;
        }
        stored.version = 3;
    }

    // Idempotent theme normalisation (previously ran every boot in +layout.svelte).
    if (isPlainObject(stored.design)) {
        const design = stored.design as Record<string, any>;

        if (design.skin === 'default' || design.skin === 'twilight') {
            const convertedTheme = oldThemeConvert(design.theme);
            if (convertedTheme) {
                design.theme = convertedTheme;
            }
        }

        if (design.skin === 'twilight') {
            design.skin = 'default';
            design.darkmode = true;
        }
    }

    // v3 -> v4: fold the legacy 'stateSettings' localStorage key into the unified
    // tree, distributing its keys to their meaningful categories.
    if (stored.version < 4) {
        if (isPlainObject(legacy?.stateSettings)) {
            const stateSettings = legacy.stateSettings as Record<string, any>;
            if (!isPlainObject(stored.general)) stored.general = {};
            if (!isPlainObject(stored.embed)) stored.embed = {};
            const general = stored.general as Record<string, any>;
            const embed = stored.embed as Record<string, any>;
            if (stateSettings.translationModel !== undefined) general.translationModel = stateSettings.translationModel;
            if (stateSettings.autoTranslate !== undefined) general.autoTranslate = stateSettings.autoTranslate;
            if (stateSettings.markedUnread !== undefined) general.markedUnread = stateSettings.markedUnread;
            if (stateSettings.disableEmbedVia !== undefined) embed.disableEmbedVia = stateSettings.disableEmbedVia;
        }
        stored.version = 4;
    }

    if (stored.version < 5) {
        if (!isPlainObject(stored.moderation)) stored.moderation = {};
        if (legacy && Array.isArray(legacy.keywordMutes)) {
            (stored.moderation as Record<string, any>).keywordMutes = legacy.keywordMutes;
        }
        stored.version = 5;
    }

    if (stored.version < 6) {
        if (!isPlainObject(stored.moderation)) stored.moderation = {};
        if (legacy && Array.isArray(legacy.labelerSettings)) {
            (stored.moderation as Record<string, any>).labelers = normalizeLabelers(legacy.labelerSettings);
        } else {
            delete (stored.moderation as Record<string, any>).labelers;
        }
        stored.version = 6;
    }

    if (stored.version < 7) {
        stored.version = 7;
    }

    if (stored.version < 8) {
        if (isPlainObject(stored.design)) {
            delete (stored.design as Record<string, any>).mobileNewUi;
        }
        stored.version = 8;
    }

    if (stored.version < 9) {
        if (isPlainObject(stored.design)) {
            const design = stored.design as Record<string, any>;
            if (typeof design.singleWidth === 'string') {
                design.singleWidth = LEGACY_SINGLE_WIDTH_PX[design.singleWidth] ?? 528;
            } else if (design.singleWidth !== undefined && typeof design.singleWidth !== 'number') {
                delete design.singleWidth;
            }
        }
        stored.version = 9;
    }

    if (stored.version < 10) {
        stored.version = 10;
    }

    if (stored.version < 11) {
        if (isPlainObject(stored.rice) && isPlainObject((stored.rice as Record<string, any>).plugins)) {
            const plugins = (stored.rice as Record<string, any>).plugins as Record<string, any>;
            for (const entry of Object.values(plugins)) {
                if (isPlainObject(entry) && entry.source === undefined && typeof entry.url === 'string') {
                    entry.source = { kind: 'url', manifestUrl: entry.url };
                    delete entry.url;
                }
            }
        }
        stored.version = 11;
    }

    return deepMerge(defaults, stored);
}
