import { accountsDb } from "$lib/db";
import type { CatalogCloudEntry, CatalogFeed, CatalogList } from "./columnCatalog";

type PinnedItem = { type: 'feed' | 'list' | 'timeline'; value: string; pinned?: boolean };

interface StoredFeed {
    uri: string;
    name: string;
    cid?: string;
    avatar?: string;
    description?: string;
    contentMode?: string | null;
    creator?: { did: string; handle: string };
    pinned?: boolean;
}

interface StoredList {
    uri: string;
    name: string;
    avatar?: string;
    creator?: { did: string; handle: string };
    purpose?: string;
    pinned?: boolean;
}

function chunk<T>(items: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        out.push(items.slice(i, i + size));
    }
    return out;
}

export class CatalogSourcesState {
    feeds = $state.raw<CatalogFeed[]>([]);
    lists = $state.raw<CatalogList[]>([]);
    cloudLists = $state.raw<CatalogCloudEntry[]>([]);
    cloudBookmarks = $state.raw<CatalogCloudEntry[]>([]);
    feedsLoading = $state(true);
    listsLoading = $state(true);
    cloudListsLoading = $state(true);
    cloudBookmarksLoading = $state(true);
    #agent: any;
    #accountId: number | undefined;
    #epoch = 0;

    constructor(agent: any) {
        this.#agent = agent;
    }

    get pinnedFeeds(): CatalogFeed[] {
        return this.feeds.filter(feed => feed.pinned);
    }

    async load(): Promise<void> {
        const epoch = ++this.#epoch;
        const agent = this.#agent;
        const did = agent.did();

        const account = await accountsDb.accounts.where('did').equals(did).first();
        if (epoch !== this.#epoch) {
            return;
        }
        this.#accountId = account?.id;
        if (Array.isArray(account?.feeds)) {
            this.feeds = account.feeds as StoredFeed[];
        }
        if (Array.isArray(account?.lists)) {
            this.lists = account.lists as StoredList[];
        }
        if (Array.isArray(account?.cloudLists)) {
            this.cloudLists = account.cloudLists;
        }
        if (Array.isArray(account?.cloudBookmarks)) {
            this.cloudBookmarks = account.cloudBookmarks;
        }

        await Promise.all([
            this.#loadFeedsAndLists(epoch),
            this.#loadCloudLists(epoch),
            this.#loadCloudBookmarks(epoch),
        ]);
    }

    async reloadCloudLists(): Promise<void> {
        this.cloudListsLoading = true;
        await this.#loadCloudLists(this.#epoch);
    }

    async reloadCloudBookmarks(): Promise<void> {
        this.cloudBookmarksLoading = true;
        await this.#loadCloudBookmarks(this.#epoch);
    }

    async reloadLists(): Promise<void> {
        this.listsLoading = true;
        await this.#loadFeedsAndLists(this.#epoch);
    }

    async #loadFeedsAndLists(epoch: number): Promise<void> {
        const agent = this.#agent;
        const did = agent.did();

        let pinnedFeedUris = new Set<string>();
        let pinnedListUris = new Set<string>();
        let pinnedOrder: string[] = [];
        let savedFeedUris: string[] = [];

        try {
            const preferences: any[] = await agent.getPreferences();
            const v2: PinnedItem[] = preferences.find(p => p.$type === 'app.bsky.actor.defs#savedFeedsPrefV2')?.items ?? [];
            const v1: string[] = preferences.find(p => p.$type === 'app.bsky.actor.defs#savedFeedsPref')?.saved ?? [];
            for (const entry of v2) {
                if (entry.type === 'feed') {
                    savedFeedUris.push(entry.value);
                    if (entry.pinned) {
                        pinnedFeedUris.add(entry.value);
                        pinnedOrder.push(entry.value);
                    }
                } else if (entry.type === 'list' && entry.pinned) {
                    pinnedListUris.add(entry.value);
                }
            }
            for (const uri of v1) {
                if (!savedFeedUris.includes(uri)) {
                    savedFeedUris.push(uri);
                }
            }
        } catch (e) {
            console.error(e);
        }

        const feedsTask = (async () => {
            if (!savedFeedUris.length) {
                return [] as StoredFeed[];
            }
            const results: StoredFeed[] = [];
            for (const uris of chunk(savedFeedUris, 150)) {
                const res = await agent.xrpc.get('app.bsky.feed.getFeedGenerators', { feeds: uris });
                for (const feed of res.feeds ?? []) {
                    results.push({
                        uri: feed.uri,
                        name: feed.displayName,
                        cid: feed.cid,
                        avatar: feed.avatar,
                        description: feed.description,
                        contentMode: feed.contentMode ?? null,
                        creator: feed.creator ? { did: feed.creator.did, handle: feed.creator.handle } : undefined,
                        pinned: pinnedFeedUris.has(feed.uri),
                    });
                }
            }
            const rank = (uri: string) => {
                const index = pinnedOrder.indexOf(uri);
                return index === -1 ? Number.MAX_SAFE_INTEGER : index;
            };
            return results.sort((a, b) => rank(a.uri) - rank(b.uri));
        })();

        const listsTask = (async () => {
            const res = await agent.xrpc.get('app.bsky.graph.getLists', { actor: did, limit: 100, cursor: '' });
            const own: StoredList[] = (res.lists ?? [])
                .filter((list: any) => list?.purpose !== 'app.bsky.graph.defs#modlist')
                .map((list: any) => ({
                    uri: list.uri,
                    name: list.name,
                    avatar: list.avatar,
                    creator: list.creator ? { did: list.creator.did, handle: list.creator.handle } : undefined,
                    purpose: list.purpose,
                    pinned: pinnedListUris.has(list.uri),
                }));
            const known = new Set(own.map(list => list.uri));
            const foreign = await Promise.all([...pinnedListUris].filter(uri => !known.has(uri)).map(async uri => {
                try {
                    const res = await agent.xrpc.get('app.bsky.graph.getList', { list: uri, limit: 1 });
                    const list = res?.list;
                    if (!list) {
                        return null;
                    }
                    return {
                        uri: list.uri,
                        name: list.name,
                        avatar: list.avatar,
                        creator: list.creator ? { did: list.creator.did, handle: list.creator.handle } : undefined,
                        purpose: list.purpose,
                        pinned: true,
                    } as StoredList;
                } catch (e) {
                    console.error(e);
                    return null;
                }
            }));
            return [...own, ...foreign.filter(Boolean) as StoredList[]];
        })();

        const [feedsResult, listsResult] = await Promise.allSettled([feedsTask, listsTask]);
        if (epoch !== this.#epoch) {
            return;
        }

        if (feedsResult.status === 'fulfilled') {
            this.feeds = feedsResult.value;
        } else {
            console.error(feedsResult.reason);
        }
        this.feedsLoading = false;

        if (listsResult.status === 'fulfilled') {
            this.lists = listsResult.value;
        } else {
            console.error(listsResult.reason);
        }
        this.listsLoading = false;

        if (this.#accountId !== undefined) {
            await accountsDb.accounts.update(this.#accountId, {
                feeds: feedsResult.status === 'fulfilled' ? feedsResult.value : [],
                lists: listsResult.status === 'fulfilled' ? listsResult.value : [],
            });
        }
    }

    async #loadCloudLists(epoch: number): Promise<void> {
        try {
            const result = await this.#agent.getCloudLists();
            if (epoch !== this.#epoch) {
                return;
            }
            this.cloudLists = result.lists ?? [];
            if (this.#accountId !== undefined) {
                await accountsDb.accounts.update(this.#accountId, { cloudLists: this.cloudLists });
            }
        } catch (e) {
            console.error(e);
        }
        if (epoch === this.#epoch) {
            this.cloudListsLoading = false;
        }
    }

    async #loadCloudBookmarks(epoch: number): Promise<void> {
        try {
            const result = await this.#agent.getCloudBookmarks();
            if (epoch !== this.#epoch) {
                return;
            }
            this.cloudBookmarks = result.bookmarks ?? [];
            if (this.#accountId !== undefined) {
                await accountsDb.accounts.update(this.#accountId, { cloudBookmarks: this.cloudBookmarks });
            }
        } catch (e) {
            console.error(e);
        }
        if (epoch === this.#epoch) {
            this.cloudBookmarksLoading = false;
        }
    }
}
