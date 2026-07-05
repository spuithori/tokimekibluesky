const STORAGE_KEY = 'paletteRecents';
const LIMIT = 20;

function load(): string[] {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        return Array.isArray(raw) ? raw.filter((k) => typeof k === 'string').slice(0, LIMIT) : [];
    } catch {
        return [];
    }
}

class PaletteRecency {
    keys = $state<string[]>(load());

    record(key: string) {
        this.keys = [key, ...this.keys.filter((k) => k !== key)].slice(0, LIMIT);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.keys));
        } catch {
        }
    }
}

export const paletteRecency = new PaletteRecency();
