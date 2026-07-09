import { HOST_SVELTE_VERSION as hostSvelteVersion } from './hostVersion';
import type { RiceModuleManifest } from '../modules/types';
import { riceState } from '../riceState.svelte';
import { loadPluginModule } from './loader';
import { RicePluginError, svelteMajor, type RicePluginContext, type RicePluginManifestJson, type RicePluginModule } from './types';

export function pluginEntryId(id: string): `plugin:${string}` {
    return `plugin:${id}`;
}

export function synthesizeManifest(json: RicePluginManifestJson): RiceModuleManifest {
    const entryId = pluginEntryId(json.id);
    const majorMismatch = svelteMajor(json.svelteVersion) !== svelteMajor(hostSvelteVersion);
    let loaded: RicePluginModule | null = null;
    const load = async (): Promise<RicePluginModule> => {
        if (majorMismatch) {
            throw new RicePluginError('svelte-major-mismatch', `svelte ${json.svelteVersion} でビルドされたプラグインは svelte ${hostSvelteVersion} のホストでは動作しません`);
        }
        const mod = await loadPluginModule(json.id);
        loaded = mod;
        return mod;
    };
    const missing = (kind: string, key: string): never => {
        throw new RicePluginError('entry-missing', `プラグイン "${json.id}" の main.js に ${kind} "${key}" の実体がありません`);
    };
    const getOptions = () => riceState.pluginConfig(json.id)?.options ?? {};
    const context = (): RicePluginContext => ({ options: getOptions() });
    const c = json.contributes;
    const needsEagerLoad = json.activate === true || (c?.quickActions?.length ?? 0) > 0 || majorMismatch;
    return {
        id: entryId,
        name: json.name,
        version: json.version,
        apiVersion: json.apiVersion,
        contributes: {
            columnKinds: c?.columnKinds?.map((kind) => ({
                type: `${entryId}:${kind.kind}` as const,
                capability: kind.capability,
                loader: () => load().then((mod) => ({ default: (mod.columnKinds?.[kind.kind] ?? missing('columnKind', kind.kind)).component })),
            })),
            statusbarItems: c?.statusbarItems?.map((item) => ({
                id: `${entryId}.${item.id}`,
                getOptions,
                loader: () => load().then((mod) => ({ default: mod.statusbarItems?.[item.id] ?? missing('statusbarItem', item.id) })),
            })),
            widgets: c?.widgets?.map((widget) => ({
                id: `${entryId}.${widget.id}`,
                getOptions,
                loader: () => load().then((mod) => ({ default: mod.widgets?.[widget.id] ?? missing('widget', widget.id) })),
            })),
            sidebarItems: c?.sidebarItems?.map((item) => ({
                id: `${entryId}.${item.id}`,
                title: item.title,
                command: item.command,
                commandArg: item.commandArg,
            })),
            effectLayers: c?.effectLayers?.map((layer) => ({
                id: `${entryId}.${layer.id}`,
                zIndex: layer.zIndex,
                getOptions,
                loader: () => load().then((mod) => ({ default: mod.effectLayers?.[layer.id] ?? missing('effectLayer', layer.id) })),
            })),
            themeTokens: c?.themeTokens,
            commands: c?.commands?.map((command) => ({
                id: command.id,
                title: command.title,
                run: (arg?: string) => load().then((mod) => (mod.commands?.[command.id] ?? missing('command', command.id))(arg, context())),
            })),
            quickActions: c?.quickActions?.map((action) => ({
                id: action.id,
                title: action.title,
                kind: action.kind,
                get: () => loaded?.quickActions?.[action.id]?.get?.() ?? false,
                run: () => load().then((mod) => (mod.quickActions?.[action.id] ?? missing('quickAction', action.id)).run(context())),
            })),
        },
        activate: needsEagerLoad
            ? async () => {
                const mod = await load();
                const activated = await mod.activate?.(context());
                return activated ?? undefined;
            }
            : undefined,
    };
}
