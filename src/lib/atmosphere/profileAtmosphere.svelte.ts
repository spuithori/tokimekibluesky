import { getPdsEndpoint, resolveDidDocument } from '$lib/oauth/resolver';
import { detectProfileCards, type CardData, type ProfileCardDef } from './profileCards';

interface Options {
    detect: boolean;
    fetcher?: typeof fetch;
    viewerDid?: string;
    getPostText?: (uri: string) => Promise<string | undefined>;
}

export class ProfileAtmosphereState {
    readonly did: string;
    readonly handle: string;
    pds = $state('');
    collections = $state.raw<readonly string[]>([]);
    data = $state.raw<Readonly<Record<string, CardData | null>>>({});

    #detected = $state.raw<readonly ProfileCardDef[]>([]);
    #requested = new Set<string>();
    #fetcher: typeof fetch;
    #getPostText: Options['getPostText'];
    #viewerDid: string | undefined;

    constructor(did: string, handle: string, options: Options) {
        this.did = did;
        this.handle = handle;
        this.#fetcher = options.fetcher ?? ((input, init) => fetch(input, init));
        this.#getPostText = options.getPostText;
        this.#viewerDid = options.viewerDid;
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
        } catch (e) {
            console.error(e);
        }
    }

    get cards(): ProfileCardDef[] {
        return this.#detected.filter((def) => this.data[def.id] !== null);
    }

    has(collection: string): boolean {
        return this.collections.includes(collection);
    }

    load() {
        for (const def of this.#detected) {
            if (this.#requested.has(def.id)) {
                continue;
            }
            this.#requested.add(def.id);
            def.load({ did: this.did, handle: this.handle, pds: this.pds, collections: this.collections, fetcher: this.#fetcher, now: Date.now(), viewerDid: this.#viewerDid, getPostText: this.#getPostText })
                .catch((e) => {
                    console.error(e);
                    return null;
                })
                .then((result) => {
                    this.data = { ...this.data, [def.id]: result };
                });
        }
    }
}
