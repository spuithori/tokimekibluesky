import {db} from "$lib/db";
import {resumeAccountsSession} from "$lib/resumeAccountsSession";

export async function modifyAgents(dids) {
    const accounts = await db.accounts
        .where('did')
        .anyOf(dids)
        .toArray();

    let agentsMap = await resumeAccountsSession(accounts);
    return agentsMap;
}