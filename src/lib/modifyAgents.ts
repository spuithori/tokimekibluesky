import {accountsDb} from "$lib/db";
import {resumeAccountsSession} from "$lib/resumeAccountsSession";
import {appState} from "$lib/classes/appState.svelte";

export async function modifyAgents(ids, proxy?: string) {
    const accounts = await accountsDb.accounts
        .where('id')
        .anyOf(ids)
        .toArray();

    appState.setResumeAccounts(accounts);

    let agentsMap = await resumeAccountsSession(accounts, proxy, {
        onStatus: (account, phase, meta) => {
            appState.applyExternalResumeStatus(account, phase, meta);
        },
    });
    return agentsMap;
}
