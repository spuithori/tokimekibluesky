import type { Component } from 'svelte';
import type { BarStyle } from './config/model';
import { statusbarItemRegistry, widgetRegistry } from './modules/registries.svelte';
import { resolveSideItemDef, type SideItemDef } from '$lib/components/side/sideItems';

export type BarItemResolved =
    | { kind: 'spacer' }
    | { kind: 'separator' }
    | { kind: 'tabs' }
    | { kind: 'menu' }
    | { kind: 'component'; loader: () => Promise<{ default: Component<any> }> }
    | { kind: 'widget'; loader: () => Promise<{ default: Component<any> }> }
    | { kind: 'action'; def: SideItemDef };

export function resolveBarItem(id: string, style: BarStyle, opts?: { allowWidgets?: boolean }): BarItemResolved | undefined {
    if (id === 'spacer') return { kind: 'spacer' };
    if (id === 'separator') return { kind: 'separator' };
    if (id === 'menu') return { kind: 'menu' };
    if (id === 'tabs' && opts?.allowWidgets) return { kind: 'tabs' };

    if (opts?.allowWidgets) {
        const widget = widgetRegistry.get(id);
        if (widget) return { kind: 'widget', loader: widget };
    }

    const component = statusbarItemRegistry.get(id);
    const action = resolveSideItemDef(id);

    if (style === 'bar') {
        if (component) return { kind: 'component', loader: component };
        if (action) return { kind: 'action', def: action };
    } else {
        if (action) return { kind: 'action', def: action };
        if (component) return { kind: 'component', loader: component };
    }
    return undefined;
}
