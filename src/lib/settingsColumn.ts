import { t } from 'tokimeki-i18n';
import { animateLayout } from '$lib/animations/flip';
import { defaultDeckSettings } from '$lib/components/deck/defaultDeckSettings';
import type { Column } from '$lib/types/column';
import type { Slot } from '$lib/classes/deckLayout';
import type { SettingsPageId } from '$lib/settings/pagesRegistry';

const SETTINGS_COLUMN_WIDTH = 400;

type DeckState = {
    columns: Column[],
    slots: Slot[],
    raiseFloating: (id: string) => void,
    add: (column: Column) => void,
    remove: (id: string) => void,
};

export function findSettingsColumn(columns: Column[]): Column | undefined {
    return columns.find(c => c?.algorithm?.type === 'settings');
}

export function resolveSettingsColumnName(): string {
    try {
        const translated = t('settings');
        return translated && translated !== 'settings' ? translated : 'Settings';
    } catch {
        return 'Settings';
    }
}

export function buildSettingsColumn(opts: { id: string, name: string, categoryId?: SettingsPageId | 'root' }): Column {
    return {
        id: opts.id,
        algorithm: {
            type: 'settings',
            name: opts.name,
            id: opts.categoryId && opts.categoryId !== 'root' ? opts.categoryId : undefined,
        },
        style: 'default',
        did: '',
        settings: {
            ...structuredClone(defaultDeckSettings),
            width: SETTINGS_COLUMN_WIDTH,
        },
        data: { feed: [], cursor: '' },
    };
}

export function openSettingsColumn(columnState: DeckState, categoryId: SettingsPageId | 'root'): void {
    const existing = findSettingsColumn(columnState.columns);

    if (existing) {
        existing.algorithm = {
            ...existing.algorithm,
            id: categoryId !== 'root' ? categoryId : undefined,
        };
        if (existing.settings?.isPopup) {
            columnState.raiseFloating(existing.id);
        } else {
            existing.scrollElement?.scrollIntoView({ inline: 'nearest', behavior: 'smooth' });
        }
        return;
    }

    const column = buildSettingsColumn({
        id: self.crypto.randomUUID(),
        name: resolveSettingsColumnName(),
        categoryId,
    });

    animateLayout(() => columnState.add(column));
}

export function closeSettingsColumn(columnState: DeckState): void {
    const existing = findSettingsColumn(columnState.columns);
    if (!existing) return;

    const id = existing.id;
    animateLayout(() => columnState.remove(id), { exiting: [id] });
}
