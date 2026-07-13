import {accountsDb} from "$lib/db";
import {resumeAccountsSession} from "$lib/resumeAccountsSession";
import {appState} from "$lib/classes/appState.svelte";

export async function modifyAgents(ids, proxy?: string) {
    const accounts = await accountsDb.accounts
        .where('id')
        .anyOf(ids)
        .toArray();

    let agentsMap = await resumeAccountsSession(accounts, proxy, {
        onStatus: (account, phase) => {
            if (phase === 'auth-required') {
                appState.reportAuthRequired(account);
            }
        },
    });
    return agentsMap;
}