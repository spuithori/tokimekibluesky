import {defaultKeywordMute, type FormattedKeywordMute, keywordStringToArray} from "$lib/timelineFilter";
import type {KeywordMute} from "$lib/settings/types";
import {settingsStore} from "$lib/settings/settings.svelte";

class KeywordMuteState {
    get keywords(): KeywordMute[] {
        return settingsStore.moderation.keywordMutes;
    }
    set keywords(value: KeywordMute[]) {
        settingsStore.moderation.keywordMutes = value;
    }

    formattedKeywords = $derived.by<FormattedKeywordMute[]>(() => {
        const initialMutes = structuredClone($state.snapshot(this.keywords));
        if (!initialMutes || !initialMutes.length) {
            return [];
        }

        return initialMutes.map(mute => ({
            ...mute,
            word: keywordStringToArray(mute.word),
        }));
    })

    add(word: string) {
        this.keywords.push({
            ...structuredClone(defaultKeywordMute),
            word,
        });
    }
}

export const keywordMuteState = new KeywordMuteState();
