import type { Component } from 'svelte';
import type { ColumnKindCapability } from '$lib/columnKinds';

export const PLUGIN_ID_RE = /^[a-z][a-z0-9-]*$/;

export const INTEGRITY_RE = /^sha256-[A-Za-z0-9+/]+={0,2}$/;

export type RicePluginErrorCode =
    | 'not-installed'
    | 'fetch-failed'
    | 'manifest-invalid'
    | 'integrity-mismatch'
    | 'api-version'
    | 'svelte-major-mismatch'
    | 'unsupported-import'
    | 'import-failed'
    | 'entry-missing';

export class RicePluginError extends Error {
    readonly code: RicePluginErrorCode;

    constructor(code: RicePluginErrorCode, message: string) {
        super(`[${code}] ${message}`);
        this.name = 'RicePluginError';
        this.code = code;
    }
}

export interface RicePluginContributesJson {
    columnKinds?: { kind: string; capability?: Partial<ColumnKindCapability> }[];
    statusbarItems?: { id: string }[];
    widgets?: { id: string }[];
    sidebarItems?: { id: string; title: string; command: string; commandArg?: string }[];
    effectLayers?: { id: string; zIndex?: number }[];
    themeTokens?: Record<string, string>;
    commands?: { id: string; title: string }[];
    quickActions?: { id: string; title: string; kind: 'toggle' | 'action' }[];
}

export interface RicePluginManifestJson {
    id: string;
    name: string;
    version: string;
    apiVersion: number;
    svelteVersion: string;
    entry: string;
    integrity: string;
    description?: string;
    author?: string;
    homepage?: string;
    contributes?: RicePluginContributesJson;
    activate?: boolean;
}

export interface RicePluginModule {
    effectLayers?: Record<string, Component<any>>;
    columnKinds?: Record<string, { component: Component<any>; icon?: Component }>;
    statusbarItems?: Record<string, Component<any>>;
    widgets?: Record<string, Component<any>>;
    commands?: Record<string, (arg?: string) => void | Promise<void>>;
    quickActions?: Record<string, { get?: () => boolean; run: () => void | Promise<void> }>;
    activate?: () => Promise<{ dispose?: () => void } | void> | { dispose?: () => void } | void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

function isIdArray(value: unknown, key: 'id' | 'kind'): boolean {
    return Array.isArray(value) && value.every((item) => isRecord(item) && isNonEmptyString(item[key]));
}

export function validatePluginManifest(json: unknown): { ok: RicePluginManifestJson } | { error: string } {
    if (!isRecord(json)) return { error: 'manifest はオブジェクトではありません' };
    if (!isNonEmptyString(json.id) || !PLUGIN_ID_RE.test(json.id)) return { error: `id が不正です(${PLUGIN_ID_RE} に一致する必要があります)` };
    if (!isNonEmptyString(json.name)) return { error: 'name が必要です' };
    if (!isNonEmptyString(json.version)) return { error: 'version が必要です' };
    if (typeof json.apiVersion !== 'number') return { error: 'apiVersion が必要です' };
    if (!isNonEmptyString(json.svelteVersion)) return { error: 'svelteVersion が必要です' };
    if (!isNonEmptyString(json.entry)) return { error: 'entry が必要です' };
    if (!isNonEmptyString(json.integrity) || !INTEGRITY_RE.test(json.integrity)) return { error: 'integrity は sha256-<base64> 形式で必要です' };
    if (json.contributes !== undefined) {
        if (!isRecord(json.contributes)) return { error: 'contributes はオブジェクトではありません' };
        const c = json.contributes;
        if (c.columnKinds !== undefined && !isIdArray(c.columnKinds, 'kind')) return { error: 'contributes.columnKinds が不正です' };
        for (const key of ['statusbarItems', 'widgets', 'sidebarItems', 'effectLayers', 'commands', 'quickActions'] as const) {
            if (c[key] !== undefined && !isIdArray(c[key], 'id')) return { error: `contributes.${key} が不正です` };
        }
        if (c.themeTokens !== undefined && !isRecord(c.themeTokens)) return { error: 'contributes.themeTokens が不正です' };
    }
    if (json.activate !== undefined && typeof json.activate !== 'boolean') return { error: 'activate は boolean です' };
    return { ok: json as unknown as RicePluginManifestJson };
}

export function svelteMajor(version: string): number {
    return Number.parseInt(version.split('.')[0] ?? '', 10);
}
