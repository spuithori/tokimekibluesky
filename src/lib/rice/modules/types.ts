import type { Component } from 'svelte';
import type { ColumnKindCapability } from '$lib/columnKinds';
import type { ModuleColumnKindId } from '$lib/types/column';

export const RICE_API_VERSION = 1;

export type ComponentLoader = () => Promise<{ default: Component<any> }>;

export interface RiceModuleContributes {
    columnKinds?: {
        type: ModuleColumnKindId;
        icon?: Component;
        capability?: Partial<ColumnKindCapability>;
        loader: ComponentLoader;
    }[];
    statusbarItems?: { id: string; loader: ComponentLoader; getOptions?: () => Record<string, string> }[];
    widgets?: { id: string; loader: ComponentLoader; getOptions?: () => Record<string, string> }[];
    sidebarItems?: { id: string; title: string; icon?: Component; command: string; commandArg?: string }[];
    effectLayers?: { id: string; zIndex?: number; loader: ComponentLoader; getOptions?: () => Record<string, string> }[];
    themeTokens?: Record<string, string>;
    commands?: { id: string; title: string; run: (arg?: string) => void | Promise<void> }[];
    quickActions?: {
        id: string;
        title: string;
        icon?: Component;
        kind: 'toggle' | 'action';
        get?: () => boolean;
        run: () => void | Promise<void>;
    }[];
}

export interface RiceModuleManifest {
    id: string;
    name: string;
    version: string;
    apiVersion: number;
    contributes?: RiceModuleContributes;
    activate?: () => Promise<{ dispose?: () => void } | void> | { dispose?: () => void } | void;
}

export type ModuleStatus = 'disabled' | 'enabling' | 'enabled' | 'disabling' | 'error';
