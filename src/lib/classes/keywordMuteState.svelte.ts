import {type keyword, keywordStringToArray} from "$lib/timelineFilter";

class KeywordMuteState {
    keywords = $state<keyword[]>();
    formattedKeywords = $derived.by(() => {
        const initialMutes = structuredClone($state.snapshot(this.keywords));
        if (!initialMutes || !initialMutes.length) {
            return [];
        }

        return initialMutes.map(mute => {
            mute.word = keywordStringToArray(mute.word);
            return mute;
        });
    })

    constructor() {
        const storageKeywordMutes = localStorage.getItem('keywordMutes') || JSON.stringify([]);
        this.keywords = JSON.parse(storageKeywordMutes);
    }
}

export const keywordMuteState = new KeywordMuteState();