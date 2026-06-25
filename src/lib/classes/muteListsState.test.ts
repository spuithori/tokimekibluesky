import { describe, it, expect, beforeEach } from 'vitest';
import { flushSync } from 'svelte';
import { muteListsState } from '$lib/classes/muteListsState.svelte';

beforeEach(() => {
    localStorage.clear();
    muteListsState.importLists({ postMutes: [], repostMutes: [] });
    flushSync();
});

describe('muteListsState — post mutes', () => {
    it('adds a muted post uri', () => {
        muteListsState.mutePost('at://a');
        expect(muteListsState.postMutes).toEqual(['at://a']);
    });

    it('is idempotent on re-mute', () => {
        muteListsState.mutePost('at://a');
        muteListsState.mutePost('at://a');
        expect(muteListsState.postMutes).toEqual(['at://a']);
    });

    it('removes a muted post uri', () => {
        muteListsState.mutePost('at://a');
        muteListsState.mutePost('at://b');
        muteListsState.unmutePost('at://a');
        expect(muteListsState.postMutes).toEqual(['at://b']);
    });

    it('clears all post mutes', () => {
        muteListsState.mutePost('at://a');
        muteListsState.clearPostMutes();
        expect(muteListsState.postMutes).toEqual([]);
    });

    it('exposes an O(1) membership set that tracks changes', () => {
        muteListsState.mutePost('at://a');
        expect(muteListsState.postMuteSet.has('at://a')).toBe(true);
        expect(muteListsState.postMuteSet.has('at://b')).toBe(false);
        muteListsState.unmutePost('at://a');
        expect(muteListsState.postMuteSet.has('at://a')).toBe(false);
    });
});

describe('muteListsState — repost mutes', () => {
    it('adds and removes a muted repost did', () => {
        muteListsState.muteRepost('did:plc:a');
        expect(muteListsState.repostMuteSet.has('did:plc:a')).toBe(true);
        muteListsState.unmuteRepost('did:plc:a');
        expect(muteListsState.repostMuteSet.has('did:plc:a')).toBe(false);
    });

    it('is idempotent on re-mute', () => {
        muteListsState.muteRepost('did:plc:a');
        muteListsState.muteRepost('did:plc:a');
        expect(muteListsState.repostMutes).toEqual(['did:plc:a']);
    });
});

describe('muteListsState — persistence', () => {
    it('persists post mutes to the dedicated "postMutes" key', () => {
        muteListsState.mutePost('at://a');
        flushSync();
        expect(JSON.parse(localStorage.getItem('postMutes') ?? '[]')).toEqual(['at://a']);
    });

    it('persists repost mutes to the dedicated "repostMutes" key', () => {
        muteListsState.muteRepost('did:plc:a');
        flushSync();
        expect(JSON.parse(localStorage.getItem('repostMutes') ?? '[]')).toEqual(['did:plc:a']);
    });

    it('never writes to the unified "settings" blob', () => {
        muteListsState.mutePost('at://a');
        muteListsState.muteRepost('did:plc:a');
        flushSync();
        expect(localStorage.getItem('settings')).toBeNull();
    });
});

describe('muteListsState — importLists', () => {
    it('replaces both lists and drops non-string values', () => {
        muteListsState.mutePost('at://old');
        muteListsState.importLists({ postMutes: ['at://a', 123, null, 'at://b'], repostMutes: ['did:plc:x'] });
        expect(muteListsState.postMutes).toEqual(['at://a', 'at://b']);
        expect(muteListsState.repostMutes).toEqual(['did:plc:x']);
    });

    it('empties a list when given an empty array', () => {
        muteListsState.mutePost('at://a');
        muteListsState.importLists({ postMutes: [] });
        expect(muteListsState.postMutes).toEqual([]);
    });

    it('leaves a list untouched when its field is absent', () => {
        muteListsState.muteRepost('did:plc:keep');
        muteListsState.importLists({ postMutes: ['at://a'] });
        expect(muteListsState.repostMutes).toEqual(['did:plc:keep']);
    });
});
