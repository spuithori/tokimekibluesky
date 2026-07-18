import { getContext, setContext } from 'svelte';

class ProfileRefreshContext {
    refresh: (() => Promise<void>) | null = null;
}

const profileRefreshKey = Symbol('profileRefresh');

export function setProfileRefreshContext() {
    return setContext(profileRefreshKey, new ProfileRefreshContext());
}

export function getProfileRefreshContext() {
    return getContext<ProfileRefreshContext | undefined>(profileRefreshKey);
}
