import {accountsDb} from "$lib/db";
import {resumeAccountsSession} from "$lib/resumeAccountsSession";

export async function modifyAgents(ids, proxy?: string) {
    const accounts = await accountsDb.accounts
        .where('id')
        .anyOf(ids)
        .toArray();

    let agentsMap = await resumeAccountsSession(accounts, proxy);
    return agentsMap;
}