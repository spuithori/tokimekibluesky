import type { Settings } from './types';
import { migrate } from './migrations';
import { persistence } from './persistence';
import { createAccessor } from './accessor';

/**
 * Unified settings store — the single source of truth for global settings.
 * A rune $state tree, persisted by exactly one $effect (writes coalesce within
 * a tick, so no debounce timer is needed). The legacy `$settings` writable in
 * stores.ts is a thin toStore shim over this, so the ~270 existing call sites
 * keep working unchanged while consumers migrate to fine-grained rune access.
 */

function loadSettings(): Settings {
    let legacyStateSettings: unknown;
    try {
        const raw = localStorage.getItem('stateSettings');
        legacyStateSettings = raw ? JSON.parse(raw) : undefined;
    } catch {
        legacyStateSettings = undefined;
    }

    let legacyKeywordMutes: unknown;
    try {
        const raw = localStorage.getItem('keywordMutes');
        legacyKeywordMutes = raw ? JSON.parse(raw) : undefined;
    } catch {
        legacyKeywordMutes = undefined;
    }

    let legacyLabelerSettings: unknown;
    try {
        const raw = localStorage.getItem('labelerSettings');
        legacyLabelerSettings = raw ? JSON.parse(raw) : undefined;
    } catch {
        legacyLabelerSettings = undefined;
    }

    return migrate(persistence.read('global'), {
        stateSettings: legacyStateSettings,
        keywordMutes: legacyKeywordMutes,
        labelerSettings: legacyLabelerSettings,
    });
}

class SettingsStore {
    #data: Settings = $state(loadSettings());

    get general() {
        return this.#data.general;
    }
    get design() {
        return this.#data.design;
    }
    get timeline() {
        return this.#data.timeline;
    }
    get moderation() {
        return this.#data.moderation;
    }
    get embed() {
        return this.#data.embed;
    }
    get langFilter() {
        return this.#data.langFilter;
    }
    get rice() {
        return this.#data.rice;
    }
    get version() {
        return this.#data.version;
    }

    get raw(): Settings {
        return this.#data;
    }
    set raw(value: Settings) {
        this.#data = value;
    }

    /**
     * Deep snapshot used by the legacy store shim. Reading it touches every
     * nested leaf, reproducing the coarse-grained subscription of the old
     * `writable` so any nested mutation notifies legacy `$settings` subscribers.
     */
    get snapshot(): Settings {
        return $state.snapshot(this.#data) as Settings;
    }

    constructor() {
        $effect.root(() => {
            $effect(() => {
                persistence.write('global', $state.snapshot(this.#data));
            });
            return () => {};
        });
    }
}

export const settingsStore = new SettingsStore();

export const accessor = createAccessor(() => settingsStore.raw);
