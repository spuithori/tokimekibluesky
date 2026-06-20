import { settingsStore } from '$lib/settings/settings.svelte';
import { appState } from '$lib/classes/appState.svelte';

/**
 * Backward-compatible proxy over the unified settings store. The four settings
 * that used to live here are now part of settingsStore (folded in by the
 * v3 -> v4 migration); pdsRequestReady is a runtime flag owned by appState.
 * Consumers can keep using `settingsState.*` while they migrate to settingsStore
 * / appState directly, after which this module can be removed.
 */
class SettingsState {
    settings = {
        get translationModel(): 'nmt' | 'llm' {
            return settingsStore.general.translationModel;
        },
        set translationModel(value: 'nmt' | 'llm') {
            settingsStore.general.translationModel = value;
        },
        get autoTranslate(): boolean {
            return settingsStore.general.autoTranslate;
        },
        set autoTranslate(value: boolean) {
            settingsStore.general.autoTranslate = value;
        },
        get markedUnread(): boolean {
            return settingsStore.general.markedUnread;
        },
        set markedUnread(value: boolean) {
            settingsStore.general.markedUnread = value;
        },
        get disableEmbedVia(): boolean {
            return settingsStore.embed.disableEmbedVia;
        },
        set disableEmbedVia(value: boolean) {
            settingsStore.embed.disableEmbedVia = value;
        },
    };

    get pdsRequestReady(): boolean {
        return appState.pdsRequestReady;
    }
    set pdsRequestReady(value: boolean) {
        appState.pdsRequestReady = value;
    }

    setPdsRequestReady() {
        appState.setPdsRequestReady();
    }
}

export const settingsState = new SettingsState();
