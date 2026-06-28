export const SAVED_FEEDS_CONTEXT = Symbol('searchSavedFeeds');

export interface SavedFeedsContext {
    readonly value: string[];
    ensure: () => void;
}
