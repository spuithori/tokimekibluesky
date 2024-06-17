import {accountsDb} from "$lib/db";
import type {BskyAgent} from "@atproto/api";
import imageCompression from "browser-image-compression";

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

export async function getDidByHandle(handle, _agent) {
    if (isDid(handle)) {
        return handle;
    }

    const res = await _agent.agent.api.com.atproto.identity.resolveHandle({ handle: handle });
    return res.data.did;
}

export async function getImageObjectFromBlob(did: string, blob: { cid: string, mimeType: string, alt: string, width: string, height: string }, _agent: BskyAgent) {
    const res =  await _agent.api.com.atproto.sync.getBlob({did: did as string, cid: blob.cid});
    const _blob = new Blob([res.data], {type: blob.mimeType});

    return {
        id: self.crypto.randomUUID(),
        alt: blob.alt,
        file: _blob,
        base64: await imageCompression.getDataUrlFromFile(_blob),
        isGif: blob.mimeType === 'image/gif',
        width: blob.width,
        height: blob.height,
    };
}

export async function getImageBase64FromBlob(did: string, blob: { cid: string, mimeType: string }, _agent: BskyAgent) {
    const res =  await _agent.api.com.atproto.sync.getBlob({did: did as string, cid: blob.cid});
    const _blob = new Blob([res.data], {type: blob.mimeType});
    return await imageCompression.getDataUrlFromFile(_blob);
}

export async function getService(did: string) {
    const res = await fetch('https://plc.directory/' + did);
    const json = await res.json();
    return json?.service[0]?.serviceEndpoint;
}

export function isEmojiSequenceOrCombination(str: string) {
    const emojiRegexPattern = /^(?:(\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|\p{Extended_Pictographic})(?:\u200d(\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|\p{Extended_Pictographic}))*)$/u;
    return emojiRegexPattern.test(str) && [...str].length === 1;
}

export function isSafariOrFirefox() {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    const isFirefox = /firefox/.test(userAgent);
    return isSafari || isFirefox;
}
