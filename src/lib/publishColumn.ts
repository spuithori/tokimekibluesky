import { get } from 'svelte/store';
import { agent } from '$lib/stores';
import { animateLayout } from '$lib/animations/flip';
import { publishState } from '$lib/classes/publishState.svelte';
import {
    buildPublishColumn,
    findPublishColumn,
    getPreferredPreset,
    resolvePublishColumnName,
    readPublishColumnSettings,
    savePublishColumnSettings,
} from '$lib/publishColumnCore';
import type { Column } from '$lib/types/column';
import type { Slot } from '$lib/classes/deckLayout';

export {
    buildPublishColumn,
    findPublishColumn,
    getPreferredPreset,
    setPreferredPreset,
    readLegacyPublishPrefs,
    presetForLegacyLayout,
    resolvePublishColumnName,
    savePublishColumnSettings,
    readPublishColumnSettings,
    type PublishColumnPreset,
    type LegacyPublishPrefs,
} from '$lib/publishColumnCore';

type DeckState = {
    columns: Column[],
    slots: Slot[],
    raiseFloating: (id: string) => void,
    add: (column: Column) => void,
    remove: (id: string) => void,
};

export function ensurePublishColumn(columnState: DeckState): void {
    const existing = findPublishColumn(columnState.columns);

    if (existing) {
        if (existing.settings?.isPopup) {
            columnState.raiseFloating(existing.id);
        } else {
            existing.scrollElement?.scrollIntoView({ inline: 'nearest', behavior: 'smooth' });
        }
        publishState.focusTick++;
        return;
    }

    const saved = readPublishColumnSettings();
    const column = saved
        ? buildPublishColumn({
            id: self.crypto.randomUUID(),
            name: resolvePublishColumnName(),
            did: (get(agent) as any)?.did?.() ?? '',
            settings: saved,
        })
        : buildPublishColumn({
            id: self.crypto.randomUUID(),
            name: resolvePublishColumnName(),
            did: (get(agent) as any)?.did?.() ?? '',
            preset: getPreferredPreset(),
        });

    const isFloat = column.settings?.isPopup === true;

    animateLayout(() => {
        if (isFloat) {
            columnState.add(column);
        } else {
            columnState.columns.push(column);
            columnState.slots.unshift({ id: self.crypto.randomUUID(), layout: { type: 'leaf', columnId: column.id } });
        }
    });

    publishState.focusTick++;
}

export function removePublishColumn(columnState: DeckState): void {
    const existing = findPublishColumn(columnState.columns);
    if (!existing) return;

    savePublishColumnSettings(existing.settings);
    const id = existing.id;
    animateLayout(() => columnState.remove(id), { exiting: [id] });
}

export function togglePublishColumn(columnState: DeckState): void {
    if (findPublishColumn(columnState.columns)) {
        removePublishColumn(columnState);
    } else {
        ensurePublishColumn(columnState);
    }
}
