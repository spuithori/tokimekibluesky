import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PersistedValue } from './persistedValue.svelte';

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('PersistedValue', () => {
    it('parses the stored value once no matter how often it is read', () => {
        localStorage.setItem('defs', JSON.stringify({ 'did:plc:labeler': [{ identifier: 'spam' }] }));
        const getItem = vi.spyOn(Storage.prototype, 'getItem');
        const parse = vi.spyOn(JSON, 'parse');

        const value = new PersistedValue<Record<string, any[]>>('defs', {});
        const first = value.current;
        for (let i = 0; i < 200; i++) {
            value.current;
        }

        expect(first).toEqual({ 'did:plc:labeler': [{ identifier: 'spam' }] });
        expect(value.current).toBe(first);
        expect(getItem).toHaveBeenCalledTimes(1);
        expect(parse).toHaveBeenCalledTimes(1);
    });

    it('falls back to the initial value when nothing usable is stored', () => {
        expect(new PersistedValue('missing', { a: 1 }).current).toEqual({ a: 1 });

        localStorage.setItem('broken', '{not json');
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(new PersistedValue('broken', ['fallback']).current).toEqual(['fallback']);
    });

    it('writes assignments through to storage', () => {
        const value = new PersistedValue<string[]>('labelers', []);
        value.current = ['did:plc:one'];

        expect(value.current).toEqual(['did:plc:one']);
        expect(JSON.parse(localStorage.getItem('labelers')!)).toEqual(['did:plc:one']);
        expect(new PersistedValue<string[]>('labelers', []).current).toEqual(['did:plc:one']);
    });

    it('follows a change made by another tab and ignores other keys', () => {
        const value = new PersistedValue<string[]>('labelers', ['did:plc:one']);

        window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated', newValue: JSON.stringify(['x']) }));
        expect(value.current).toEqual(['did:plc:one']);

        window.dispatchEvent(new StorageEvent('storage', { key: 'labelers', newValue: JSON.stringify(['did:plc:two']) }));
        expect(value.current).toEqual(['did:plc:two']);
    });
});
