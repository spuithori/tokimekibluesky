import type { Column } from "$lib/types/column";
import { settingsStore } from "$lib/settings/settings.svelte";
import { applyDefaultColumnIcon } from "$lib/columnAvatar";
import { requestColumnIcon } from "$lib/ai/client";

interface ColumnAdder {
    add(column: Column): void;
    columnById: Map<string, Column>;
}

export function addColumnWithIcon(columnState: ColumnAdder, column: Column, description?: string): void {
    columnState.add(applyDefaultColumnIcon(column, settingsStore.design.defaultColumnIcon));
    applyAutoIcon(columnState, column, description);
}

async function applyAutoIcon(columnState: ColumnAdder, column: Column, description: string = ''): Promise<void> {
    if (column.algorithm?.type !== 'custom' || column.settings?.icon) {
        return;
    }

    try {
        const icon = await requestColumnIcon(column.algorithm.name ?? '', description);
        if (!icon) {
            return;
        }
        const target = columnState.columnById.get(column.id);
        if (target && !target.settings?.icon) {
            target.settings = { ...target.settings, icon };
        }
    } catch (e) {
        console.error(e);
    }
}
