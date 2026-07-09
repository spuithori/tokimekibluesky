import type { Component } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
import type { ComponentLoader } from './types';

export const statusbarItemRegistry = new SvelteMap<string, ComponentLoader>();

export const widgetRegistry = new SvelteMap<string, ComponentLoader>();

export const sidebarItemRegistry = new SvelteMap<string, { title: string; icon?: Component; command: string; commandArg?: string }>();

export const effectLayerRegistry = new SvelteMap<string, { zIndex: number; loader: ComponentLoader; getOptions?: () => Record<string, string> }>();

export const moduleThemeTokens = new SvelteMap<string, Record<string, string>>();

export const quickActionRegistry = new SvelteMap<string, {
    title: string;
    icon?: Component;
    kind: 'toggle' | 'action';
    get?: () => boolean;
    run: () => void | Promise<void>;
}>();
