import type { Component } from 'svelte';
import type { BarStyle } from './config/model';
import { statusbarItemRegistry, widgetRegistry } from './modules/registries.svelte';
import { resolveSideItemDef, type SideItemDef } from '$lib/components/side/sideItems';

type ComponentLoader = () => Promise<{ default: Component<any> }>;
type GetOptions = () => Record<string, string>;

export type BarItemResolved =
    | { kind: 'spacer' }
    | { kind: 'separator' }
    | { kind: 'tabs' }
    | { kind: 'menu' }
    | { kind: 'component'; loader: ComponentLoader; getOptions?: GetOptions }
    | { kind: 'widget'; loader: ComponentLoader; getOptions?: GetOptions }
    | { kind: 'action'; def: SideItemDef };

export function resolveBarItem(id: string, style: BarStyle, opts?: { allowWidgets?: boolean }): BarItemResolved | undefined {
    if (id === 'spacer') return { kind: 'spacer' };
    if (id === 'separator') return { kind: 'separator' };
    if (id === 'menu') return { kind: 'menu' };
    if (id === 'tabs' && opts?.allowWidgets) return { kind: 'tabs' };

    if (opts?.allowWidgets) {
        const widget = widgetRegistry.get(id);
        if (widget) return { kind: 'widget', loader: widget.loader, getOptions: widget.getOptions };
    }

    const entry = statusbarItemRegistry.get(id);
    const component = entry ? { kind: 'component' as const, loader: entry.loader, getOptions: entry.getOptions } : undefined;
    const action = resolveSideItemDef(id);

    if (style === 'bar') {
        if (component) return component;
        if (action) return { kind: 'action', def: action };
    } else {
        if (action) return { kind: 'action', def: action };
        if (component) return component;
    }
    return undefined;
}

export function barItemOptions(resolved: BarItemResolved | undefined, specOptions: Record<string, string>): Record<string, string> {
    const pluginOptions = resolved && 'getOptions' in resolved ? resolved.getOptions?.() : undefined;
    return pluginOptions ? { ...pluginOptions, ...specOptions } : specOptions;
}
