import { createContext } from 'svelte';
import { PersistedState } from 'runed';
import type { Agent } from '$lib/agent';
import type { XrpcClient } from '$lib/xrpc-client';
import { RefResolver } from './resolver.svelte';
import { indexedApps, type AppMatch } from './apps';
import type { Identity } from './identity';
import { describeRepo, getRecord, getRepoStatus, listRecords, type RepoRecord, type RepoStatus } from './pds';
import { loadLexicons, resolveLexicon, type Lexicons, type ResolvedLexicon } from './lexicon';
import type { CarRepo } from './carClient';
import { explorerPath, parseAtUri } from './values';

const MAX_RECENTS = 12;

export interface RecentEntry {
    path: string;
    label: string;
}

class ExplorerRecents {
    #items = new PersistedState<RecentEntry[]>('explorerRecentV1', []);

    get items(): RecentEntry[] {
        return this.#items.current;
    }

    add(entry: RecentEntry): void {
        if (this.#items.current[0]?.path === entry.path) return;
        this.#items.current = [entry, ...this.#items.current.filter((item) => item.path !== entry.path)].slice(0, MAX_RECENTS);
    }

    remove(path: string): void {
        this.#items.current = this.#items.current.filter((item) => item.path !== path);
    }

    clear(): void {
        this.#items.current = [];
    }
}

export const explorerRecents = new ExplorerRecents();

export interface RecordPage {
    records: RepoRecord[];
    cursor?: string;
}

export interface RepoSource {
    readonly local: boolean;
    readonly car?: CarRepo;
    list(collection: string, cursor: string | undefined, reverse: boolean, signal: AbortSignal): Promise<RecordPage>;
    get(collection: string, rkey: string, signal: AbortSignal): Promise<RepoRecord>;
}

export function pdsSource(pds: string, did: string): RepoSource {
    return {
        local: false,
        list: (collection, cursor, reverse, signal) => listRecords(pds, { repo: did, collection, cursor, reverse }, signal),
        get: (collection, rkey, signal) => getRecord(pds, { repo: did, collection, rkey }, signal),
    };
}

export function carSource(car: CarRepo): RepoSource {
    return {
        local: true,
        car,
        async list(collection, cursor, reverse) {
            const page = await car.list(collection, Number(cursor ?? 0), reverse);
            return { records: page.records, cursor: page.next === undefined ? undefined : String(page.next) };
        },
        async get(collection, rkey) {
            const record = await car.get(collection, rkey);
            if (!record) throw new Error('not found');
            return record;
        },
    };
}

export function rkeyOf(uri: string): string {
    return uri.slice(uri.lastIndexOf('/') + 1);
}

export class RecordListState {
    records = $state.raw<RepoRecord[]>([]);
    loading = $state(true);
    loadingAll = $state(false);
    done = $state(false);
    failed = $state(false);
    #cursor: string | undefined;
    #controller = new AbortController();

    constructor(readonly source: RepoSource, readonly collection: string, readonly reverse: boolean) {
        void this.#load();
    }

    async #load(): Promise<boolean> {
        this.loading = true;
        this.failed = false;
        try {
            const page = await this.source.list(this.collection, this.#cursor, this.reverse, this.#controller.signal);
            this.records = this.#cursor ? [...this.records, ...page.records] : page.records;
            this.#cursor = page.cursor;
            this.done = !page.cursor || page.records.length === 0;
            return true;
        } catch (e) {
            if (this.#controller.signal.aborted) return false;
            this.failed = true;
            return false;
        } finally {
            this.loading = false;
        }
    }

    loadMore(): void {
        if (this.loading || this.done) return;
        void this.#load();
    }

    async loadAll(): Promise<void> {
        if (this.loadingAll || this.done) return;
        this.loadingAll = true;
        while (this.loadingAll && !this.done && !this.#controller.signal.aborted) {
            if (this.loading) break;
            if (!(await this.#load())) break;
        }
        this.loadingAll = false;
    }

    stopLoadingAll(): void {
        this.loadingAll = false;
    }

    find(rkey: string): RepoRecord | undefined {
        return this.records.find((record) => rkeyOf(record.uri) === rkey);
    }

    upsert(record: RepoRecord): void {
        const index = this.records.findIndex((item) => item.uri === record.uri);
        this.records = index === -1 ? [record, ...this.records] : this.records.with(index, record);
    }

    remove(uris: string[]): void {
        const gone = new Set(uris);
        this.records = this.records.filter((record) => !gone.has(record.uri));
    }

    dispose(): void {
        this.#controller.abort();
    }
}

export type DetailTab = 'view' | 'record' | 'backlinks' | 'info' | 'schema';

export class RepoContext {
    readonly did: string;
    readonly pds: string | undefined;
    collections = $state.raw<string[]>([]);
    collectionsState = $state<'loading' | 'ready' | 'deactivated' | 'takendown' | 'unreachable'>('loading');
    handleIsCorrect = $state<boolean>();
    status = $state.raw<RepoStatus>();
    counts = $state.raw<Map<string, number>>();
    car = $state.raw<CarRepo>();
    detailTab = $state<DetailTab>('view');
    apps = $state.raw<AppMatch[]>([]);
    readonly resolver: RefResolver | undefined;
    #appsLoading = false;
    reverse = $state(false);
    #lexicons = new Map<string, Promise<Lexicons>>();
    #resolved = new Map<string, Promise<ResolvedLexicon | undefined>>();
    #controller = new AbortController();

    constructor(
        readonly identity: Identity,
        readonly source: RepoSource | undefined,
        readonly base = '/atproto-viewer',
        readonly xrpc?: XrpcClient,
    ) {
        this.did = identity.did;
        this.pds = identity.pds;
        this.resolver = xrpc && !source?.local ? new RefResolver(xrpc, this.#controller.signal) : undefined;
        if (source?.local) {
            this.collectionsState = 'ready';
            if (source.car) {
                this.car = source.car;
                this.collections = source.car.summary.collections.map((item) => item.nsid);
                this.counts = new Map(source.car.summary.collections.map((item) => [item.nsid, item.count]));
            }
        } else {
            void this.refresh();
        }
    }

    get signal(): AbortSignal {
        return this.#controller.signal;
    }

    async refresh(): Promise<void> {
        if (!this.pds) {
            this.collectionsState = 'unreachable';
            return;
        }
        const signal = this.#controller.signal;
        getRepoStatus(this.pds, this.did, signal).then((status) => {
            this.status = status;
        }, () => {});
        try {
            const description = await describeRepo(this.pds, this.did, signal);
            this.collections = description.collections;
            this.handleIsCorrect = description.handleIsCorrect;
            this.collectionsState = 'ready';
        } catch (e) {
            if (signal.aborted) return;
            const message = (e as Error)?.message ?? '';
            this.collectionsState = /deactivat/i.test(message) ? 'deactivated' : /taken ?down|suspend/i.test(message) ? 'takendown' : 'unreachable';
        }
    }

    loadApps(locale: string | undefined): void {
        if (this.#appsLoading || !this.collections.length) return;
        this.#appsLoading = true;
        indexedApps(this.collections, locale).then((indexed) => {
            if (indexed.length && !this.#controller.signal.aborted) this.apps = indexed;
        }, () => {});
    }

    lexicon(nsid: string): Promise<ResolvedLexicon | undefined> {
        let pending = this.#resolved.get(nsid);
        if (!pending) {
            pending = resolveLexicon(nsid, this.#controller.signal);
            this.#resolved.set(nsid, pending);
        }
        return pending;
    }

    lexicons(collection: string): Promise<Lexicons> {
        let pending = this.#lexicons.get(collection);
        if (!pending) {
            pending = loadLexicons(collection, (id) => this.lexicon(id)).catch(() => new Map());
            this.#lexicons.set(collection, pending);
        }
        return pending;
    }

    path(collection?: string, rkey?: string): string {
        if (this.source?.local) {
            const query = new URLSearchParams();
            if (collection) query.set('c', collection);
            if (rkey) query.set('r', rkey);
            const qs = query.toString();
            return this.base + (qs ? '?' + qs : '');
        }
        return explorerPath({ repo: this.did, collection, rkey });
    }

    linkFor(value: string): string | undefined {
        if (value.startsWith('did:')) return explorerPath({ repo: value });
        const uri = parseAtUri(value);
        return uri ? explorerPath(uri) : undefined;
    }

    blobUrl(cid: string): string | undefined {
        return this.pds ? `${this.pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(this.did)}&cid=${encodeURIComponent(cid)}` : undefined;
    }

    dispose(): void {
        this.#controller.abort();
        this.car?.close();
    }
}

export const [getRepoContext, setRepoContext] = createContext<RepoContext>();
export const [getOwnAgent, setOwnAgent] = createContext<() => Agent | undefined>();
