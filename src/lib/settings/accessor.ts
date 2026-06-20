/**
 * Path-based accessor — the load-bearing seam between the holding layer and the
 * schema-driven UI. The UI reads/writes settings only through get(path)/set(path)
 * and stays agnostic to whether the source is a rune $state tree or the legacy
 * store. Reads touch only the addressed leaf signal, so a mutation re-runs just
 * the one field that reads it (fine-grained reactivity, no over-render).
 */

export interface SettingsAccessor {
    get(path: string): unknown;
    set(path: string, value: unknown): void;
}

export function createAccessor(root: () => Record<string, any>): SettingsAccessor {
    return {
        get(path: string): unknown {
            return path.split('.').reduce<any>((object, key) => object?.[key], root());
        },
        set(path: string, value: unknown): void {
            const keys = path.split('.');
            const last = keys.pop();
            if (last === undefined) {
                return;
            }
            const parent = keys.reduce<any>((object, key) => object?.[key], root());
            if (parent) {
                parent[last] = value;
            }
        },
    };
}
