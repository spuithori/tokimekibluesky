import {accountsDb} from "$lib/db";
import imageCompression from "browser-image-compression";
import type {ProxyAgent} from "$lib/proxyAgent";

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
    const dids: string[] = [];

    agents.forEach((value) => {
        dids.push(value.did());
    });

    return dids;
}

export function isDid(name) {
    return !!name.startsWith('did:plc:');
}

export function detectDifferentDomainUrl(url: string, text: string) {
    const urlHostname = new URL(url).hostname;
    let textHostname = '';
    if (typeof window !== 'undefined' && urlHostname === window.location.hostname) {
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

    const res = await _agent.xrpcGet('com.atproto.identity.resolveHandle', { handle: handle });
    return res.data.did;
}

export function getDidFromUri(uri: string | undefined) {
    if (!uri) {
        return undefined;
    }
    return uri.split('/')[2];
}

export async function getDisplayNameByDid(did: string, _agent: ProxyAgent) {
    try {
        const { data } = await _agent.xrpcGet('app.bsky.actor.getProfile', { actor: did });
        return data.displayName || `@${data.handle}`;
    } catch (e) {
        console.error(e);
        return did;
    }
}

export async function getImageObjectFromBlob(did: string, blob: { cid: string, mimeType: string, alt: string, width: string, height: string }, _agent: any) {
    const res =  await _agent.xrpcGet('com.atproto.sync.getBlob', {did: did as string, cid: blob.cid});
    const _blob = new Blob([res.data], {type: blob.mimeType});

    return {
        id: crypto.randomUUID(),
        alt: blob.alt,
        file: _blob,
        base64: await imageCompression.getDataUrlFromFile(_blob),
        isGif: blob.mimeType === 'image/gif',
        width: blob.width,
        height: blob.height,
    };
}

export async function getImageBase64FromBlob(did: string, blob: { cid: string, mimeType: string }, _agent: any) {
    const res =  await _agent.xrpcGet('com.atproto.sync.getBlob', {did: did as string, cid: blob.cid});
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
    if (typeof window === 'undefined') return false;
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isSafari = /safari/.test(userAgent) && !/chrome/.test(userAgent);
    const isFirefox = /firefox/.test(userAgent);
    return isSafari || isFirefox;
}

export async function getServiceAuthToken({aud, lxm, exp} : {aud?: string, lxm: string, exp?: number}, _agent: ProxyAgent) {
    const agentHost = new URL(await getService(_agent.did() as string)).hostname;
    const agentAud = 'did:web:' + agentHost;

    const res = await _agent.xrpcGet('com.atproto.server.getServiceAuth', {
        aud: aud || agentAud,
        lxm,
        exp,
    });

    return res.data.token;
}

export async function listRecordsWithBsky(agent: ProxyAgent, collection: string, limit: number, cursor: any, repo: string) {
    return await agent.xrpcGet('com.atproto.repo.listRecords', {
        collection: collection,
        limit: limit,
        reverse: false,
        cursor: cursor,
        repo: repo});
}

export function getScrollableParent( node: Node | null, includeSelf: boolean = false): HTMLElement | null {
    if (!node) {
        return null;
    }

    if (includeSelf && node instanceof HTMLElement) {
        const selfStyle = window.getComputedStyle(node);
        const selfOverflowY = selfStyle.getPropertyValue('overflow-y');
        const isSelfScrollableType = selfOverflowY === 'auto' || selfOverflowY === 'scroll';
        if (isSelfScrollableType && node.scrollHeight > node.clientHeight) {
            return node;
        }
    }

    let parentNode = node.parentElement;

    while (parentNode) {
        if (!(parentNode instanceof HTMLElement)) {
            parentNode = parentNode.parentElement;
            continue;
        }

        const computedStyle = window.getComputedStyle(parentNode);
        const overflowY = computedStyle.getPropertyValue('overflow-y');

        if (overflowY === 'visible' || overflowY === 'hidden') {
            if (parentNode === document.documentElement) {
                return null;
            }
            parentNode = parentNode.parentElement;
            continue;
        }

        if ((overflowY === 'auto' || overflowY === 'scroll') && parentNode.scrollHeight > parentNode.clientHeight) {
            return parentNode;
        }

        if (parentNode === document.documentElement) {
            return null;
        }

        parentNode = parentNode.parentElement;
    }

    return null;
}

export async function getEndpoint(did: string) {
    try {
        const res = await fetch('https://plc.directory/' + did);
        const json = await res.json();
        return json?.service[0]?.serviceEndpoint;
    } catch (e) {
        console.error(e);
    }
}

export function getRkeyFromSplit(uri: string): string {
    const parts = uri.split('/');
    return parts.pop() || '';
}

/**
 * Creates a lightweight object with xrpcGet method for public (unauthenticated) PDS access.
 * Used by getImageObjectFromBlob/getImageBase64FromBlob which expect an agent-like object.
 */
export async function createPublicXrpcFetcher(did: string) {
    const service = await getService(did);
    return {
        async xrpcGet(nsid: string, params?: Record<string, any>) {
            const searchParams = new URLSearchParams();
            if (params) {
                for (const [key, value] of Object.entries(params)) {
                    if (value !== undefined && value !== null) {
                        searchParams.set(key, String(value));
                    }
                }
            }
            const res = await fetch(`${service}/xrpc/${nsid}?${searchParams.toString()}`);
            if (!res.ok) throw new Error(`XRPC ${nsid} failed: ${res.status}`);
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                return { data: await res.json() };
            }
            return { data: await res.arrayBuffer() };
        }
    };
}