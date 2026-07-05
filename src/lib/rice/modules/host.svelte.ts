import { SvelteMap } from 'svelte/reactivity';
import { registerColumnKind } from '$lib/columnKindRegistry.svelte';
import { registerCommand } from '$lib/commands/registry.svelte';
import { statusbarItemRegistry, sidebarItemRegistry, effectLayerRegistry, moduleThemeTokens, quickActionRegistry, widgetRegistry } from './registries.svelte';
import { RICE_API_VERSION, type ModuleStatus, type RiceModuleManifest } from './types';

export class ModuleEntry {
    readonly manifest: RiceModuleManifest;
    status = $state<ModuleStatus>('disabled');
    errorMessage = $state<string | null>(null);
    wanted = false;
    unregisters: (() => void)[] = [];
    dispose: (() => void) | undefined;

    constructor(manifest: RiceModuleManifest) {
        this.manifest = manifest;
    }
}

export class RiceModuleHost {
    readonly entries = new SvelteMap<string, ModuleEntry>();

    register(manifest: RiceModuleManifest): void {
        if (this.entries.has(manifest.id)) return;
        const entry = new ModuleEntry(manifest);
        if (manifest.apiVersion !== RICE_API_VERSION) {
            entry.status = 'error';
            entry.errorMessage = `apiVersion ${manifest.apiVersion} is not supported (host: ${RICE_API_VERSION})`;
        }
        this.entries.set(manifest.id, entry);
    }

    setWanted(id: string, wanted: boolean): void {
        const entry = this.entries.get(id);
        if (!entry) return;
        entry.wanted = wanted;
        void this.reconcile(entry);
    }

    private async reconcile(entry: ModuleEntry): Promise<void> {
        if (entry.status === 'enabling' || entry.status === 'disabling') return;
        if (entry.status === 'error') {
            if (!entry.wanted) {
                entry.status = 'disabled';
                entry.errorMessage = null;
            }
            return;
        }
        if (entry.wanted && entry.status === 'disabled') {
            await this.enable(entry);
            void this.reconcile(entry);
        } else if (!entry.wanted && entry.status === 'enabled') {
            this.disable(entry);
            void this.reconcile(entry);
        }
    }

    private async enable(entry: ModuleEntry): Promise<void> {
        entry.status = 'enabling';
        try {
            const contributes = entry.manifest.contributes;
            for (const kind of contributes?.columnKinds ?? []) {
                entry.unregisters.push(registerColumnKind(kind));
            }
            for (const item of contributes?.statusbarItems ?? []) {
                statusbarItemRegistry.set(item.id, item.loader);
                entry.unregisters.push(() => statusbarItemRegistry.delete(item.id));
            }
            for (const widget of contributes?.widgets ?? []) {
                widgetRegistry.set(widget.id, widget.loader);
                entry.unregisters.push(() => widgetRegistry.delete(widget.id));
            }
            for (const item of contributes?.sidebarItems ?? []) {
                sidebarItemRegistry.set(item.id, { title: item.title, icon: item.icon, command: item.command, commandArg: item.commandArg });
                entry.unregisters.push(() => sidebarItemRegistry.delete(item.id));
            }
            for (const layer of contributes?.effectLayers ?? []) {
                effectLayerRegistry.set(layer.id, { zIndex: layer.zIndex ?? 0, loader: layer.loader });
                entry.unregisters.push(() => effectLayerRegistry.delete(layer.id));
            }
            if (contributes?.themeTokens) {
                moduleThemeTokens.set(entry.manifest.id, contributes.themeTokens);
                entry.unregisters.push(() => moduleThemeTokens.delete(entry.manifest.id));
            }
            for (const command of contributes?.commands ?? []) {
                entry.unregisters.push(registerCommand({ ...command, id: `${entry.manifest.id}.${command.id}` }));
            }
            for (const action of contributes?.quickActions ?? []) {
                const actionId = `${entry.manifest.id}.${action.id}`;
                quickActionRegistry.set(actionId, { title: action.title, icon: action.icon, kind: action.kind, get: action.get, run: action.run });
                entry.unregisters.push(() => quickActionRegistry.delete(actionId));
            }
            const activated = await entry.manifest.activate?.();
            if (activated && typeof activated === 'object' && activated.dispose) {
                entry.dispose = activated.dispose;
            }
            entry.status = 'enabled';
        } catch (e) {
            this.runUnregisters(entry);
            entry.status = 'error';
            entry.errorMessage = e instanceof Error ? e.message : String(e);
        }
    }

    private disable(entry: ModuleEntry): void {
        entry.status = 'disabling';
        try {
            entry.dispose?.();
        } catch (e) {
            console.error(e);
        }
        entry.dispose = undefined;
        this.runUnregisters(entry);
        entry.status = 'disabled';
    }

    private runUnregisters(entry: ModuleEntry): void {
        for (const unregister of entry.unregisters.splice(0)) {
            try {
                unregister();
            } catch (e) {
                console.error(e);
            }
        }
    }
}

export const riceModuleHost = new RiceModuleHost();
