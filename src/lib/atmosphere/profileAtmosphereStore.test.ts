import { describe, expect, it } from 'vitest';
import { ProfileAtmosphereStore } from './profileAtmosphereStore';
import type { ProfileAtmosphereState } from './profileAtmosphere.svelte';

const state = (did: string, handle: string, viewerDid = 'did:plc:me', detect = true) =>
    ({ did, handle, viewerDid, detect }) as unknown as ProfileAtmosphereState;

describe('ProfileAtmosphereStore', () => {
    it('hands back the same state for the same profile by DID or handle, so a revisit needs no refetch', () => {
        const store = new ProfileAtmosphereStore();
        const kept = store.retain(state('did:plc:a', 'a.test'));
        expect(store.find('did:plc:me', 'did:plc:a', true)).toBe(kept);
        expect(store.find('did:plc:me', 'a.test', true)).toBe(kept);
    });

    it('does not share a state across viewers or when Atmosphere detection was switched', () => {
        const store = new ProfileAtmosphereStore();
        store.retain(state('did:plc:a', 'a.test'));
        expect(store.find('did:plc:other', 'a.test', true)).toBeUndefined();
        expect(store.find('did:plc:me', 'a.test', false)).toBeUndefined();
    });

    it('keeps only the most recently used profiles up to the limit', () => {
        const store = new ProfileAtmosphereStore(2);
        const a = store.retain(state('did:plc:a', 'a.test'));
        store.retain(state('did:plc:b', 'b.test'));
        store.retain(a);
        store.retain(state('did:plc:c', 'c.test'));
        expect(store.find('did:plc:me', 'a.test', true)).toBe(a);
        expect(store.find('did:plc:me', 'b.test', true)).toBeUndefined();
        expect(store.find('did:plc:me', 'c.test', true)).toBeDefined();
    });

    it('replaces an older state of the same profile instead of keeping two', () => {
        const store = new ProfileAtmosphereStore(2);
        store.retain(state('did:plc:a', 'a.test'));
        const fresh = store.retain(state('did:plc:a', 'a.test'));
        store.retain(state('did:plc:b', 'b.test'));
        expect(store.find('did:plc:me', 'a.test', true)).toBe(fresh);
    });
});
