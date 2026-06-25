import type { KeywordMute } from '$lib/settings/types';

export interface SamplePost {
    record: { text: string };
    indexedAt: string;
}

export function makePost(opts: { text?: string; indexedAt?: string } = {}): SamplePost {
    return {
        record: { text: opts.text ?? '' },
        indexedAt: opts.indexedAt ?? '2024-01-01T12:00:00',
    };
}

export function makeKeywordMute(opts: Partial<KeywordMute> = {}): KeywordMute {
    return {
        enabled: opts.enabled ?? true,
        word: opts.word ?? '',
        period: opts.period ?? { start: '00:00', end: '23:59' },
        ignoreCaseSensitive: opts.ignoreCaseSensitive ?? false,
        regExp: opts.regExp ?? false,
    };
}

export function makeMutedWordsPref(words: string[]) {
    return {
        $type: 'app.bsky.actor.defs#mutedWordsPref',
        items: words.map((value) => ({ id: value, value, targets: ['content'] })),
    };
}

export function makePreferencesResponse(prefs: unknown[] = []) {
    return { preferences: prefs };
}
