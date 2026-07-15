import { accountsDb } from '$lib/db';
import { agents } from '$lib/stores';
import { modifyAgents } from '$lib/modifyAgents';
import { appState } from '$lib/classes/appState.svelte';

export async function addAccountToCurrentWorkspace(accountId: number): Promise<void> {
    const profileId = appState.profile.current;
    const profile = await accountsDb.profiles.get(profileId);
    if (!profile) return;

    const alreadyIn = profile.accounts.includes(accountId);
    const accounts = alreadyIn ? profile.accounts : [...profile.accounts, accountId];

    if (!alreadyIn) {
        await accountsDb.profiles.update(profileId, { accounts });
    }
    if (!profile.primary) {
        await accountsDb.profiles.update(profileId, { primary: accountId });
    }

    agents.set(await modifyAgents(accounts, profile.appViewProxy));
}
