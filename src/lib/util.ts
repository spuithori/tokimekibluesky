import {accountsDb} from "$lib/db";

export function getAccountIdByDid(agents, did) {
    let id;

    agents.forEach((value, key, map) => {
        if (value.did() === did) {
            id = key;
        }
    });

    return id;
}

export async function getAccountIdByDidFromDb(did) {
    const account = await accountsDb.accounts
        .where('did')
        .equals(did)
        .first();
    return account.id;
}

export function getAllAgentDids(agents) {
    if (!agents) {
        return [];
    }
    let dids = [];

    agents.forEach((value, key, map) => {
        dids = [...dids, value.did()];
    });

    return dids;
}

export function isDid(name) {
    return !!name.startsWith('did:plc:');
}

export function detectDifferentDomainUrl(url: string, text: string) {
    const urlHostname = new URL(url).hostname;
    let textHostname = '';
    if (urlHostname === window.location.hostname) {
        return true;
    }

    try {
        const textUrl = text.startsWith('http://') || text.startsWith('https://')
            ? new URL(text)
            : new URL('https://' + text);
        textHostname = textUrl.hostname;

        if (textUrl.username) {
            return false;
        }
    } catch (e) {
        return false;
    }

    return textHostname === urlHostname;
}

export function isFeedByUri(uri: string) {
    const type = uri.split('/')[3];
    return type === 'app.bsky.feed.generator';
}