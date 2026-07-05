import type { Component } from 'svelte';
import { commandRegistry, runCommand } from './registry.svelte';
import { SETTINGS_PAGE_IDS, SETTINGS_PAGE_TITLES } from '$lib/settings/pagesRegistry';
import { accountsDb } from '$lib/db';
import { appState } from '$lib/classes/appState.svelte';
import type { ColumnState } from '$lib/classes/columnState.svelte';

export interface PaletteEntry {
    key: string;
    title: string;
    hintKey: string;
    icon?: Component;
    run: () => void;
}

export interface PaletteDeps {
    columnState: ColumnState;
    translate: (key: string) => string;
}

export function collectCommandEntries({ translate }: Pick<PaletteDeps, 'translate'>): PaletteEntry[] {
    const entries: PaletteEntry[] = [];
    for (const def of commandRegistry.values()) {
        if (def.hidden) continue;
        if (def.when && !def.when()) continue;
        entries.push({
            key: `command:${def.id}`,
            title: translate(def.title),
            hintKey: 'palette_hint_command',
            icon: def.icon,
            run: () => runCommand(def.id),
        });
    }
    return entries;
}

export function collectColumnEntries({ columnState }: Pick<PaletteDeps, 'columnState'>): PaletteEntry[] {
    return columnState.slots.map((slot, index) => {
        const column = columnState.getSlotColumn(index);
        return {
            key: `column:${slot.id}`,
            title: column?.algorithm?.name ?? `#${index + 1}`,
            hintKey: 'palette_hint_column',
            run: () => runCommand('column.focus', String(index + 1)),
        };
    });
}

export function collectSettingsEntries({ translate }: Pick<PaletteDeps, 'translate'>): PaletteEntry[] {
    return SETTINGS_PAGE_IDS.map((pageId) => ({
        key: `settings:${pageId}`,
        title: translate(SETTINGS_PAGE_TITLES[pageId]),
        hintKey: 'palette_hint_settings',
        run: () => runCommand('settings.open', pageId),
    }));
}

export async function collectWorkspaceEntries(): Promise<PaletteEntry[]> {
    const profiles = await accountsDb.profiles.toArray();
    return profiles
        .filter((profile) => profile.id !== appState.profile.current)
        .map((profile) => ({
            key: `workspace:${profile.id}`,
            title: profile.name,
            hintKey: 'palette_hint_workspace',
            run: () => runCommand('workspace.switch', String(profile.id)),
        }));
}
