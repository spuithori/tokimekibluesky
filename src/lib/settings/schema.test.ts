import { describe, it, expect } from 'vitest';
import { settingsSchema } from './schema';
import { createDefaultSettings } from './defaults';

/**
 * Guards the schema ↔ defaults relationship so the two never drift apart
 * silently. This changes no runtime behaviour — it just fails CI if a schema
 * entry references a non-existent key, if a schema `default` disagrees with the
 * value createDefaultSettings() produces, or if defaults grow an undefined leaf.
 *
 * Runtime-dependent defaults legitimately differ from the schema's static
 * placeholder (browser language / engine detection), so they're allowlisted.
 */
const RUNTIME_DEPENDENT = new Set(['general.userLanguage', 'general.language', 'design.nonoto']);

function getPath(object: unknown, path: string): unknown {
    return path.split('.').reduce<any>((value, key) => value?.[key], object);
}

function findUndefinedLeaves(value: unknown, prefix = ''): string[] {
    if (value === undefined) {
        return [prefix || '(root)'];
    }
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
        return [];
    }
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
        findUndefinedLeaves(child, prefix ? `${prefix}.${key}` : key),
    );
}

describe('schema ↔ defaults consistency', () => {
    const defaults = createDefaultSettings();

    it('every schema key resolves to a defined value in defaults', () => {
        const missing = settingsSchema
            .filter((item) => getPath(defaults, item.key) === undefined)
            .map((item) => item.key);
        expect(missing).toEqual([]);
    });

    it('every schema default matches the value in defaults', () => {
        const mismatches = settingsSchema
            .filter((item) => !RUNTIME_DEPENDENT.has(item.key))
            .filter((item) => {
                try {
                    expect(getPath(defaults, item.key)).toEqual(item.default);
                    return false;
                } catch {
                    return true;
                }
            })
            .map((item) => ({ key: item.key, schema: item.default, defaults: getPath(defaults, item.key) }));
        expect(mismatches).toEqual([]);
    });

    it('default settings contain no undefined leaves', () => {
        expect(findUndefinedLeaves(defaults)).toEqual([]);
    });

    it('every schema key is unique', () => {
        const keys = settingsSchema.map((item) => item.key);
        expect(keys.length).toBe(new Set(keys).size);
    });
});
