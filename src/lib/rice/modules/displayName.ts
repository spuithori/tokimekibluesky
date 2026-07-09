import type { RiceModuleManifest } from './types';

export function isPluginEntryId(id: string): boolean {
    return id.startsWith('plugin:');
}

export function moduleDisplayName(manifest: RiceModuleManifest, translate: (key: string) => string): string {
    return isPluginEntryId(manifest.id) ? manifest.name : translate(manifest.name);
}
