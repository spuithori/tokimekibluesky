import * as svelte from 'svelte';
import * as svelteStore from 'svelte/store';
import * as svelteReactivity from 'svelte/reactivity';
import * as svelteReactivityWindow from 'svelte/reactivity/window';
import * as svelteTransition from 'svelte/transition';
import * as svelteMotion from 'svelte/motion';
import * as svelteEasing from 'svelte/easing';
import * as svelteAnimate from 'svelte/animate';
import * as svelteAttachments from 'svelte/attachments';
import * as svelteEvents from 'svelte/events';
import * as svelteInternalClient from 'svelte/internal/client';
import 'svelte/internal/disclose-version';
import * as pluginApi from './api';
import { RUNTIME_GLOBAL } from './shims';

const EMPTY_MODULE = {};

const registry = new Map<string, object>([
    ['svelte', svelte],
    ['svelte/store', svelteStore],
    ['svelte/reactivity', svelteReactivity],
    ['svelte/reactivity/window', svelteReactivityWindow],
    ['svelte/transition', svelteTransition],
    ['svelte/motion', svelteMotion],
    ['svelte/easing', svelteEasing],
    ['svelte/animate', svelteAnimate],
    ['svelte/attachments', svelteAttachments],
    ['svelte/events', svelteEvents],
    ['svelte/internal/client', svelteInternalClient],
    ['svelte/internal/disclose-version', EMPTY_MODULE],
    ['@tokimeki/plugin-api', pluginApi],
]);

(globalThis as Record<string, any>)[RUNTIME_GLOBAL] = registry;

export function resolveRuntimeModule(specifier: string): object | undefined {
    const found = registry.get(specifier);
    if (found !== undefined) return found;
    if (specifier.startsWith('svelte/internal/flags/')) return EMPTY_MODULE;
    return undefined;
}
