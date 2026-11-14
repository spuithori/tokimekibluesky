import { getPdsEndpoint, resolveDidDocument } from '$lib/oauth/resolver';
import { detectProfileCards, matchIndexedServices, otherServiceCandidates, otherServicesCard, type CardData, type ProfileCardDef } from './profileCards';
import { fetchCollectionIndex } from './registry';

interface Options {
    detect: boolean;
    fetcher?: typeof fetch;
    viewerDid?: string;
    getPostText?: (uri: string) => Promise<string | undefined>;
}

export class ProfileAtmosphereState {
    readonly did: string;
    readonly handle: string;
    readonly detect: boolean;
    readonly viewerDid: string | undefined;
    pds = $state('');
    collections = $state.raw<readonly string[]>([]);
    data = $state.raw<Readonly<Record<string, CardData | null>>>({});

    #detected = $state.raw<readonly ProfileCardDef[]>([]);
    #requested = new Set<string>();
    #loadWanted = false;
    #fetcher: typeof fetch;
    #getPostText: Options['getPostText'];

    constructor(did: string, handle: string, options: Options) {
        this.did = did;
        this.handle = handle;
        this.#fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
        this.#getPostText = options.getPostText;
        this.detect = options.detect;
        this.viewerDid = options.viewerDid;
        void this.#start(options.detect);
    }

    async #start(detect: boolean) {
        try {
            this.pds = getPdsEndpoint(await resolveDidDocument(this.did));
            if (!detect) {
                return;
            }
            const res = await this.#fetcher(`${this.pds}/xrpc/com.atproto.repo.describeRepo?repo=${encodeURIComponent(this.did)}`);
            if (!res.ok) {
                return;
            }
            const repo = await res.json();
            const collections: string[] = Array.isArray(repo?.collections) ? repo.collections : [];
            this.collections = collections;
            this.#detected = detectProfileCards(collections);
            const candidates = otherServiceCandidates(collections);
            if (!candidates.length) {
                return;
            }
            const matched = matchIndexedServices(await fetchCollectionIndex(this.#fetcher), candidates);
            if (matched.length) {
                this.#detected = [...this.#detected, otherServicesCard(matched)];
                if (this.#loadWanted) {
                    this.load();
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    get cards(): ProfileCardDef[] {
        return this.#detected.filter((def) => this.data[def.id] !== null);
    }

    refresh() {
        const ids = [...this.#requested];
        this.#requested.clear();
        for (const id of ids) {
            this.loadCard(id);
        }
    }

    has(collection: string): boolean {
        return this.collections.includes(collection);
    }

    load() {
        this.#loadWanted = true;
        for (const def of this.#detected) {
            this.#loadDef(def);
        }
    }

    loadCard(id: string) {
        const def = this.#detected.find((item) => item.id === id);
        if (def) {
            this.#loadDef(def);
        }
    }

    #loadDef(def: ProfileCardDef) {
        if (this.#requested.has(def.id)) {
            return;
        }
        this.#requested.add(def.id);
        def.load({ did: this.did, handle: this.handle, pds: this.pds, collections: this.collections, fetcher: this.#fetcher, now: Date.now(), viewerDid: this.viewerDid, getPostText: this.#getPostText })
            .catch((e) => {
                console.error(e);
                return null;
            })
            .then((result) => {
                this.data = { ...this.data, [def.id]: result };
            });
    }
}
