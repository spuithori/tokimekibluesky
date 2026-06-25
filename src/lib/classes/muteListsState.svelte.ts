import { PersistedState } from 'runed';

class MuteListsState {
    #postMutes = new PersistedState<string[]>('postMutes', []);
    #repostMutes = new PersistedState<string[]>('repostMutes', []);

    postMuteSet = $derived(new Set(this.#postMutes.current));
    repostMuteSet = $derived(new Set(this.#repostMutes.current));

    get postMutes(): string[] {
        return this.#postMutes.current;
    }

    get repostMutes(): string[] {
        return this.#repostMutes.current;
    }

    mutePost(uri: string): void {
        if (this.#postMutes.current.includes(uri)) {
            return;
        }
        this.#postMutes.current = [...this.#postMutes.current, uri];
    }

    unmutePost(uri: string): void {
        this.#postMutes.current = this.#postMutes.current.filter((u) => u !== uri);
    }

    clearPostMutes(): void {
        this.#postMutes.current = [];
    }

    muteRepost(did: string): void {
        if (this.#repostMutes.current.includes(did)) {
            return;
        }
        this.#repostMutes.current = [...this.#repostMutes.current, did];
    }

    unmuteRepost(did: string): void {
        this.#repostMutes.current = this.#repostMutes.current.filter((d) => d !== did);
    }

    importLists(lists: { postMutes?: unknown; repostMutes?: unknown }): void {
        if (Array.isArray(lists?.postMutes)) {
            this.#postMutes.current = lists.postMutes.filter((x): x is string => typeof x === 'string');
        }
        if (Array.isArray(lists?.repostMutes)) {
            this.#repostMutes.current = lists.repostMutes.filter((x): x is string => typeof x === 'string');
        }
    }
}

export const muteListsState = new MuteListsState();
