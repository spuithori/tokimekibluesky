import {accountsDb} from "$lib/db";
import {ProxyAgent} from "$lib/proxyAgent";

export async function modifyAgents(ids) {
    const accounts = await accountsDb.accounts
        .where('id')
        .anyOf(ids)
        .toArray();

    const agentsMap = new Map<number, ProxyAgent>();
    for (const account of accounts) {
        agentsMap.set(account.id!, new ProxyAgent(account.did, account.handle));
    }
    return agentsMap;
}
