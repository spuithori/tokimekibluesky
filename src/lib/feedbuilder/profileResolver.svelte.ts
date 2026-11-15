import { SvelteMap } from 'svelte/reactivity';
import { xrpcQuery } from './api';
import type { ProfileViewDetailed } from '$lib/feedbuilder/types';

const cache = new SvelteMap<string, ProfileViewDetailed | null>();
const pending = new Map<string, Promise<ProfileViewDetailed | null>>();

export function getCachedProfile(did: string): ProfileViewDetailed | null | undefined {
  return cache.get(did);
}

export async function resolveProfile(did: string): Promise<ProfileViewDetailed | null> {
  if (!did) return null;
  if (cache.has(did)) return cache.get(did) ?? null;
  const existing = pending.get(did);
  if (existing) return existing;

  const task = (async () => {
    try {
      const res = await xrpcQuery<ProfileViewDetailed>(
        'app.bsky.actor.getProfile',
        { actor: did }
      );
      cache.set(did, res);
      return res;
    } catch {
      cache.set(did, null);
      return null;
    } finally {
      pending.delete(did);
    }
  })();
  pending.set(did, task);
  return task;
}

export function primeProfile(p: ProfileViewDetailed): void {
  if (p.did && !cache.get(p.did)) cache.set(p.did, p);
}

export function invalidateProfile(did: string): void {
  cache.delete(did);
  pending.delete(did);
}
