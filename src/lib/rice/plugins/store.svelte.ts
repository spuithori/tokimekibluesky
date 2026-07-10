import { browser } from '$app/environment';
import { ricePluginsDb } from '$lib/db';
import { settingsStore } from '$lib/settings/settings.svelte';
import type { InstalledRicePlugin } from '$lib/settings/types';
import { riceModuleHost } from '../modules/host.svelte';
import { pluginSettingsRegistry } from '../modules/registries.svelte';
import { pluginEntryId, synthesizeManifest } from './adapter';
import { fetchPluginFromSource, invalidatePluginModule, refetchRecord, type FetchedPlugin, type PluginSource } from './loader';
import { RicePluginError, validatePluginManifest } from './types';

export function installedPlugins(): Record<string, InstalledRicePlugin> {
    return settingsStore.plugins.installed;
}

function registerPlugin(manifest: Parameters<typeof synthesizeManifest>[0]): void {
    riceModuleHost.register(synthesizeManifest(manifest));
    if (manifest.settings) {
        pluginSettingsRegistry.set(manifest.id, manifest.settings);
    } else {
        pluginSettingsRegistry.delete(manifest.id);
    }
}

function plainSource(source: PluginSource): PluginSource {
    return source.kind === 'at'
        ? { kind: 'at', uri: source.uri, did: source.did, entryCid: source.entryCid, handle: source.handle }
        : { kind: 'url', manifestUrl: source.manifestUrl };
}

function installedRecordFrom(fetched: FetchedPlugin): InstalledRicePlugin {
    return {
        source: plainSource(fetched.source),
        name: fetched.manifest.name,
        version: fetched.manifest.version,
        integrity: fetched.integrity,
        svelteVersion: fetched.manifest.svelteVersion,
        installedAt: new Date().toISOString(),
    };
}

async function putRecord(id: string, fetched: FetchedPlugin): Promise<void> {
    await ricePluginsDb.plugins.put({
        id,
        source: plainSource(fetched.source),
        manifest: fetched.manifestText,
        code: fetched.code,
        integrity: fetched.integrity,
        version: fetched.manifest.version,
        updatedAt: new Date().toISOString(),
    });
}

let bootRegistered = false;

export async function registerInstalledPlugins(): Promise<void> {
    if (!browser || bootRegistered) return;
    bootRegistered = true;
    await Promise.all(Object.entries(installedPlugins()).map(async ([id, installed]) => {
        try {
            const record = await ricePluginsDb.plugins.get(id);
            const manifestText = record?.manifest ?? (await refetchRecord(id, installed.source, installed.integrity)).manifest;
            const validated = validatePluginManifest(JSON.parse(manifestText));
            if ('error' in validated) {
                throw new RicePluginError('manifest-invalid', validated.error);
            }
            registerPlugin(validated.ok);
        } catch (e) {
            console.error(`rice plugin "${id}" の登録に失敗しました`, e);
        }
    }));
}

export function canMutatePlugin(id: string): boolean {
    const entry = riceModuleHost.entries.get(pluginEntryId(id));
    return !entry || entry.status === 'disabled' || entry.status === 'error';
}

export async function commitInstall(fetched: FetchedPlugin): Promise<void> {
    const id = fetched.manifest.id;
    if (installedPlugins()[id] || riceModuleHost.entries.has(pluginEntryId(id))) {
        throw new RicePluginError('manifest-invalid', `プラグイン "${id}" は既にインストールされています`);
    }
    await putRecord(id, fetched);
    settingsStore.plugins.installed = { ...installedPlugins(), [id]: installedRecordFrom(fetched) };
    registerPlugin(fetched.manifest);
}

export async function uninstallPlugin(id: string): Promise<boolean> {
    if (!canMutatePlugin(id)) return false;
    if (!riceModuleHost.unregister(pluginEntryId(id))) return false;
    invalidatePluginModule(id);
    pluginSettingsRegistry.delete(id);
    await ricePluginsDb.plugins.delete(id);
    const next = { ...installedPlugins() };
    delete next[id];
    settingsStore.plugins.installed = next;
    return true;
}

export interface PluginUpdateCheck {
    fetched: FetchedPlugin;
    currentVersion: string;
    changed: boolean;
}

export async function checkPluginUpdate(id: string): Promise<PluginUpdateCheck> {
    const installed = installedPlugins()[id];
    if (!installed) {
        throw new RicePluginError('not-installed', `プラグイン "${id}" はインストールされていません`);
    }
    const fetched = await fetchPluginFromSource(installed.source);
    if (fetched.manifest.id !== id) {
        throw new RicePluginError('manifest-invalid', `配布元の id が "${fetched.manifest.id}" に変わっています`);
    }
    return {
        fetched,
        currentVersion: installed.version,
        changed: fetched.integrity !== installed.integrity || fetched.manifest.version !== installed.version,
    };
}

export async function commitUpdate(id: string, fetched: FetchedPlugin): Promise<boolean> {
    if (!canMutatePlugin(id)) return false;
    if (!riceModuleHost.unregister(pluginEntryId(id))) return false;
    invalidatePluginModule(id);
    await putRecord(id, fetched);
    const current = installedPlugins()[id];
    settingsStore.plugins.installed = {
        ...installedPlugins(),
        [id]: { ...installedRecordFrom(fetched), installedAt: current?.installedAt ?? new Date().toISOString() },
    };
    registerPlugin(fetched.manifest);
    return true;
}
