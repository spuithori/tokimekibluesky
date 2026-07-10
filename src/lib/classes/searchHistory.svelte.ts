import { PersistedState } from 'runed';

const MAX_HISTORY = 15;

export type SearchScope = 'posts' | 'user' | 'feeds' | 'articles';

class SearchHistory {
    #items = new PersistedState<Record<string, string[]>>('searchHistoryV3', {});

    items(scope: SearchScope): string[] {
        return this.#items.current[scope] ?? [];
    }

    add(scope: SearchScope, value: string): void {
        const v = value.trim();
        if (!v) return;
        const list = this.items(scope);
        this.#items.current = {
            ...this.#items.current,
            [scope]: [v, ...list.filter(x => x !== v)].slice(0, MAX_HISTORY),
        };
    }

    remove(scope: SearchScope, value: string): void {
        this.#items.current = {
            ...this.#items.current,
            [scope]: this.items(scope).filter(x => x !== value),
        };
    }

    clear(scope: SearchScope): void {
        this.#items.current = { ...this.#items.current, [scope]: [] };
    }
}

export const searchHistory = new SearchHistory();
