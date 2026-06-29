import { flushSync } from "svelte";
import { SvelteMap } from "svelte/reactivity";
import { ColumnState } from "$lib/classes/columnState.svelte";

export type FeedAdapter = {
    getFeed: (id: string) => any[];
    setFeed: (id: string, feed: any[]) => void;
};

export class LegacyFeeds {
    private feeds = $state.raw<Record<string, any[]>>({});
    getFeed(id: string): any[] {
        return this.feeds[id] ?? [];
    }
    setFeed(id: string, feed: any[]): void {
        this.feeds = { ...this.feeds, [id]: feed };
    }
}

export class MapFeeds {
    private feeds = $state.raw<Map<string, any[]>>(new Map());
    getFeed(id: string): any[] {
        return this.feeds.get(id) ?? [];
    }
    setFeed(id: string, feed: any[]): void {
        const next = new Map(this.feeds);
        next.set(id, feed);
        this.feeds = next;
    }
}

export class SvelteMapFeeds {
    private feeds = new SvelteMap<string, any[]>();
    getFeed(id: string): any[] {
        return this.feeds.get(id) ?? [];
    }
    setFeed(id: string, feed: any[]): void {
        this.feeds.set(id, feed);
    }
}

/**
 * Measures how many times each column's tracked reader re-runs when ONLY the
 * first column's feed is updated K times. `self` = target column reruns,
 * `cross` = sum of reruns of all OTHER columns (the over-invalidation cost).
 */
export function measureIsolation(adapter: FeedAdapter, keys: string[], K: number): { self: number; cross: number } {
    const counts = new Map<string, number>(keys.map((k) => [k, 0]));

    for (const k of keys) adapter.setFeed(k, [{ seed: true }]);

    const cleanup = $effect.root(() => {
        for (const k of keys) {
            $effect(() => {
                adapter.getFeed(k);
                counts.set(k, (counts.get(k) ?? 0) + 1);
            });
        }
    });

    flushSync();
    for (const k of keys) counts.set(k, 0);

    const target = keys[0];
    for (let i = 0; i < K; i++) {
        adapter.setFeed(target, [{ tick: i }]);
        flushSync();
    }

    cleanup();

    const self = counts.get(target) ?? 0;
    let cross = 0;
    for (const k of keys.slice(1)) cross += counts.get(k) ?? 0;
    return { self, cross };
}

export function createRealColumnState(): { cs: any; cleanup: () => void } {
    let cs: any;
    const cleanup = $effect.root(() => {
        cs = new ColumnState(true);
    });
    return { cs, cleanup };
}

export function measureRealIsolation(cs: any, keys: string[], K: number): { self: number; cross: number } {
    return measureIsolation(
        {
            getFeed: (id) => cs.getFeed(id),
            setFeed: (id, feed) => cs.setFeed(id, feed),
        },
        keys,
        K,
    );
}
