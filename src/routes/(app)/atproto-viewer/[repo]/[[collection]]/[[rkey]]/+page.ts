import type { PageLoad } from './$types';
import { resolveIdentity, type Identity } from '$lib/explorer/identity';
import { explorerRecents } from '$lib/explorer/explorerState.svelte';
import { explorerPath } from '$lib/explorer/values';

let last: { keys: Set<string>; identity: Promise<Identity> } | undefined;

export const load: PageLoad = ({ params, fetch }) => {
    const key = params.repo.replace(/^@/, '');
    if (last?.keys.has(key) || last?.keys.has(key.toLowerCase())) {
        return { identity: last.identity };
    }

    const identity = resolveIdentity(params.repo, undefined, fetch);
    const entry = { keys: new Set([key, key.toLowerCase()]), identity };
    last = entry;
    identity.then((resolved) => {
        entry.keys.add(resolved.did);
        if (resolved.handle) entry.keys.add(resolved.handle.toLowerCase());
        explorerRecents.add({ path: explorerPath({ repo: resolved.did }), label: resolved.handle ? '@' + resolved.handle : resolved.did });
    }, () => {
        if (last === entry) last = undefined;
    });

    return { identity };
};

export const prerender = false;
