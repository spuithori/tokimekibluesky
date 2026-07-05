import { t } from 'tokimeki-i18n';
import { defaultDeckSettings } from '$lib/components/deck/defaultDeckSettings';
import type { Column } from '$lib/types/column';

export type PublishColumnPreset = 'tile' | 'center' | 'bottom';

export type LegacyPublishPrefs = {
    layout: 'left' | 'bottom' | 'popup' | null,
    pinned: boolean,
};

const PRESET_STORAGE_KEY = 'publishColumnPreset';
const SETTINGS_STORAGE_KEY = 'publishColumnSettings';

const PUBLISH_COLUMN_WIDTH = 340;

export function findPublishColumn(columns: Column[]): Column | undefined {
    return columns.find(c => c?.algorithm?.type === 'publish');
}

export function resolvePublishColumnName(): string {
    try {
        const translated = t('column_publish');
        return translated && translated !== 'column_publish' ? translated : 'Post';
    } catch {
        return 'Post';
    }
}

export function buildPublishColumn(opts: {
    id: string,
    name: string,
    did?: string,
    preset?: PublishColumnPreset,
    settings?: any,
}): Column {
    let settings: Column['settings'];

    if (opts.settings) {
        settings = {
            ...structuredClone(defaultDeckSettings),
            ...structuredClone(opts.settings),
        };
    } else {
        const preset = opts.preset ?? 'tile';
        settings = {
            ...structuredClone(defaultDeckSettings),
            width: PUBLISH_COLUMN_WIDTH,
        };

        if (preset === 'center') {
            settings.isPopup = true;
            settings.popupPreset = preset;
            settings.popupPosition = { x: 0, y: 0, width: 600, height: 560 };
        } else if (preset === 'bottom') {
            settings.isPopup = true;
            settings.popupPreset = preset;
            settings.popupPosition = { x: 0, y: 0, width: 740, height: 340 };
        }
    }

    return {
        id: opts.id,
        algorithm: { type: 'publish', name: opts.name },
        style: 'default',
        did: opts.did ?? '',
        settings,
        data: { feed: [], cursor: '' },
    };
}

export function savePublishColumnSettings(settings: any): void {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {}
}

export function readPublishColumnSettings(): any | null {
    try {
        const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

export function getPreferredPreset(): PublishColumnPreset {
    try {
        const stored = localStorage.getItem(PRESET_STORAGE_KEY);
        if (stored === 'tile' || stored === 'center' || stored === 'bottom') {
            return stored;
        }
    } catch {}
    return 'tile';
}

export function setPreferredPreset(preset: PublishColumnPreset): void {
    try {
        localStorage.setItem(PRESET_STORAGE_KEY, preset);
    } catch {}
}

export function hasStoredPreset(): boolean {
    try {
        return localStorage.getItem(PRESET_STORAGE_KEY) !== null;
    } catch {
        return false;
    }
}

export function readLegacyPublishPrefs(): LegacyPublishPrefs | null {
    try {
        const layoutRaw = localStorage.getItem('layout');
        const layout = layoutRaw === 'left' || layoutRaw === 'bottom' || layoutRaw === 'popup' ? layoutRaw : null;
        let pinned = false;
        try {
            pinned = JSON.parse(localStorage.getItem('pinned') || 'false') === true;
        } catch {}
        return { layout, pinned };
    } catch {
        return null;
    }
}

export function presetForLegacyLayout(layout: LegacyPublishPrefs['layout']): PublishColumnPreset {
    if (layout === 'popup') return 'center';
    if (layout === 'bottom') return 'bottom';
    return 'tile';
}
