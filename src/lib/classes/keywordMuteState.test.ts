import { describe, it, expect, beforeEach } from 'vitest';
import { flushSync } from 'svelte';
import { settingsStore } from '$lib/settings/settings.svelte';
import { migrate } from '$lib/settings/migrations';
import { keywordMuteState } from '$lib/classes/keywordMuteState.svelte';
import { resetSettings } from '$lib/test-fixtures/settingsTestUtils';
import { makeKeywordMute } from '$lib/test-fixtures/fixtures';

function persistedSettings() {
    return JSON.parse(localStorage.getItem('settings') ?? '{}');
}

describe('keywordMuteState (SoT proxy)', () => {
    beforeEach(() => {
        resetSettings();
    });

    it('add() writes through to settingsStore.moderation.keywordMutes', () => {
        keywordMuteState.add('hello');
        expect(settingsStore.moderation.keywordMutes).toHaveLength(1);
        expect(settingsStore.moderation.keywordMutes[0].word).toBe('hello');
    });

    it('persists to the unified "settings" key', () => {
        keywordMuteState.add('hello');
        flushSync();
        expect(persistedSettings().moderation.keywordMutes[0].word).toBe('hello');
    });

    it('never writes to the legacy "keywordMutes" key', () => {
        keywordMuteState.add('hello');
        flushSync();
        expect(localStorage.getItem('keywordMutes')).toBeNull();
    });

    it('add() deep-clones defaults so rows do not share a period object', () => {
        keywordMuteState.add('a');
        keywordMuteState.add('b');
        keywordMuteState.keywords[0].period.start = '05:00';
        expect(keywordMuteState.keywords[1].period.start).toBe('00:00');
    });

    it('formattedKeywords derives the split word array from the stored string', () => {
        keywordMuteState.add('foo, bar');
        expect(keywordMuteState.formattedKeywords[0].word).toEqual(['foo', 'bar']);
    });
});

describe('settings backup data contract (SettingsBackup)', () => {
    beforeEach(() => {
        resetSettings();
    });

    it('includes keyword mutes in the exportable snapshot', () => {
        keywordMuteState.add('keepme');
        const exported = JSON.parse(JSON.stringify(settingsStore.snapshot));
        expect(exported.moderation.keywordMutes[0].word).toBe('keepme');
    });

    it('restores keyword mutes when importing a v5 backup', () => {
        const backup = { version: 5, moderation: { keywordMutes: [makeKeywordMute({ word: 'restored' })] } };
        settingsStore.raw = migrate(JSON.parse(JSON.stringify(backup)));
        expect(settingsStore.moderation.keywordMutes[0].word).toBe('restored');
    });

    it('empties keyword mutes when importing a pre-v5 backup (documented full-replace)', () => {
        keywordMuteState.add('existing');
        const oldBackup = { version: 4, general: { language: 'en' } };
        settingsStore.raw = migrate(JSON.parse(JSON.stringify(oldBackup)));
        expect(settingsStore.moderation.keywordMutes).toEqual([]);
    });

    it('preserves sibling moderation fields through a v4 -> v5 import', () => {
        const backup = { version: 4, moderation: { contentLabels: { porn: 'hide' }, keywordMutes: [makeKeywordMute({ word: 'kept' })] } };
        settingsStore.raw = migrate(JSON.parse(JSON.stringify(backup)));
        expect(settingsStore.moderation.contentLabels.porn).toBe('hide');
        expect(settingsStore.moderation.keywordMutes[0].word).toBe('kept');
    });
});
