import { on } from 'svelte/events';

function parseStored<T>(key: string, raw: string | null): T | undefined {
    if (raw === null) {
        return undefined;
    }

    try {
        return JSON.parse(raw) as T;
    } catch (error) {
        console.error(`Error when parsing persisted value "${key}"`, error);
        return undefined;
    }
}

export class PersistedValue<T> {
    #key: string;
    #value: T = $state.raw() as T;

    constructor(key: string, initialValue: T) {
        this.#key = key;
        this.#value = initialValue;

        if (typeof window === 'undefined') {
            return;
        }

        const stored = parseStored<T>(key, localStorage.getItem(key));
        if (stored !== undefined) {
            this.#value = stored;
        }

        on(window, 'storage', (event) => {
            if (event.key !== this.#key) {
                return;
            }

            const next = parseStored<T>(this.#key, event.newValue);
            if (next !== undefined) {
                this.#value = next;
            }
        });
    }

    get current(): T {
        return this.#value;
    }

    set current(value: T) {
        this.#value = value;

        try {
            localStorage.setItem(this.#key, JSON.stringify(value));
        } catch (error) {
            console.error(`Error when writing persisted value "${this.#key}"`, error);
        }
    }
}
