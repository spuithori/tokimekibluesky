import type { Column } from '$lib/types/column';
import type { Slot } from '$lib/classes/deckLayout';
import { loadDeckState } from '$lib/classes/deckLayout';
import { appState } from '$lib/classes/appState.svelte';

export interface WorkspaceDeckState {
    columns: Column[];
    slots: Slot[];
}

export function switchWorkspace(columnState: WorkspaceDeckState, profile: any): void {
    appState.changeProfile(profile.id);
    const deck = loadDeckState(
        { version: profile.deckVersion, columns: profile.columns, slots: profile.slots },
        () => self.crypto.randomUUID(),
    );
    columnState.columns = deck.columns;
    columnState.slots = deck.slots;
}
