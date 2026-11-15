import { PROFILE_CARD_DEFS } from '$lib/atmosphere/profileCards';
import { fetchCollectionIndex, fetchIndexedService, localizeService, servicePath } from '$lib/atmosphere/registry';

export interface CollectionApp {
    name: string;
    icon?: string;
    href?: string;
}

export interface AppMatch {
    prefix: string;
    app: CollectionApp;
}

const BUILTIN: AppMatch[] = [
    { prefix: 'app.bsky', app: { name: 'Bluesky' } },
    { prefix: 'chat.bsky', app: { name: 'Bluesky Chat' } },
    { prefix: 'com.atproto', app: { name: 'AT Protocol' } },
    { prefix: 'tools.ozone', app: { name: 'Ozone' } },
];

export function collectionAuthority(nsid: string): string {
    return nsid.split('.').slice(0, 2).join('.');
}

export function namespaceOf(nsid: string): string {
    const parts = nsid.split('.');
    return parts.length > 2 ? parts.slice(0, -1).join('.') : nsid;
}

export function domainOf(prefix: string): string {
    return prefix.split('.').reverse().join('.');
}

export function findApp(nsid: string, matches: readonly AppMatch[]): AppMatch | undefined {
    let best: AppMatch | undefined;
    for (const match of matches) {
        if ((nsid === match.prefix || nsid.startsWith(match.prefix + '.')) && (!best || match.prefix.length > best.prefix.length)) best = match;
    }
    return best;
}

export const KNOWN_APPS: readonly AppMatch[] = [
    ...BUILTIN,
    ...PROFILE_CARD_DEFS.flatMap((def) => def.collections.map((collection) => ({
        prefix: namespaceOf(collection),
        app: { name: def.name, icon: typeof def.icon === 'string' ? def.icon : undefined },
    }))),
];

export async function indexedApps(collections: readonly string[], locale: string | undefined): Promise<AppMatch[]> {
    const unknown = collections.filter((nsid) => !findApp(nsid, KNOWN_APPS));
    if (!unknown.length) return [];

    const index = await fetchCollectionIndex();
    const found = await Promise.all(index.map(async (service): Promise<AppMatch[]> => {
        const prefixes = [...new Set(service.collections.map(namespaceOf))].filter((prefix) => unknown.some((nsid) => nsid === prefix || nsid.startsWith(prefix + '.')));
        if (!prefixes.length) return [];
        const entry = await fetchIndexedService(service).catch(() => null);
        if (!entry) return [];
        const localized = localizeService(entry, locale);
        const app = { name: localized.name, icon: localized.iconUrl ?? undefined, href: servicePath(service.did, service.rkey) };
        return prefixes.map((prefix) => ({ prefix, app }));
    }));
    return found.flat();
}
