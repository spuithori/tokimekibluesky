import type { Component } from 'svelte';
import Puzzle from '@lucide/svelte/icons/puzzle';
import type { BarStyle } from './config/model';
import { statusbarItemRegistry, sidebarItemRegistry, widgetRegistry } from './modules/registries.svelte';
import { coreSideItems, type SideItemDef } from '$lib/components/side/sideItems';
import type { SideItem } from '$lib/classes/sideState.svelte';

export type BarItemResolved =
    | { kind: 'spacer' }
    | { kind: 'separator' }
    | { kind: 'tabs' }
    | { kind: 'component'; loader: () => Promise<{ default: Component<any> }> }
    | { kind: 'widget'; loader: () => Promise<{ default: Component<any> }> }
    | { kind: 'action'; def: SideItemDef };

export function resolveBarItem(id: string, style: BarStyle, opts?: { allowWidgets?: boolean }): BarItemResolved | undefined {
    if (id === 'spacer') return { kind: 'spacer' };
    if (id === 'separator') return { kind: 'separator' };
    if (id === 'tabs' && opts?.allowWidgets) return { kind: 'tabs' };

    if (opts?.allowWidgets) {
        const widget = widgetRegistry.get(id);
        if (widget) return { kind: 'widget', loader: widget };
    }

    const component = statusbarItemRegistry.get(id);
    const core = coreSideItems[id as SideItem];
    const moduleSideItem = sidebarItemRegistry.get(id);
    const action: SideItemDef | undefined = core ?? (moduleSideItem
        ? {
            icon: moduleSideItem.icon ?? Puzzle,
            labelKey: moduleSideItem.title,
            command: moduleSideItem.command,
            commandArg: moduleSideItem.commandArg,
        }
        : undefined);

    if (style === 'bar') {
        if (component) return { kind: 'component', loader: component };
        if (action) return { kind: 'action', def: action };
    } else {
        if (action) return { kind: 'action', def: action };
        if (component) return { kind: 'component', loader: component };
    }
    return undefined;
}
