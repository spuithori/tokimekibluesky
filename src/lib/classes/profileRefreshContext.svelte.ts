import { getContext, setContext } from 'svelte';

export type AuthorMode = 'all' | 'filtered' | 'replies' | 'reposts';

export const AUTHOR_MODES: readonly AuthorMode[] = ['all', 'filtered', 'replies', 'reposts'];

export interface ProfileColumnControls {
    readonly authorMode: AuthorMode | undefined;
    readonly canAdd: boolean;
    readonly isAdded: boolean;
    setAuthorMode: (mode: AuthorMode) => void;
    add: () => void;
    refresh: () => void;
}

class ProfileRefreshContext {
    refresh: (() => Promise<void>) | null = null;
    column = $state.raw<ProfileColumnControls | null>(null);
}

const profileRefreshKey = Symbol('profileRefresh');

export function setProfileRefreshContext() {
    return setContext(profileRefreshKey, new ProfileRefreshContext());
}

export function getProfileRefreshContext() {
    return getContext<ProfileRefreshContext | undefined>(profileRefreshKey);
}
