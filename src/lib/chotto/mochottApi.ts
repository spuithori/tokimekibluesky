import { MOCHOTT_ORIGIN, MOCHOTT_PROXY } from '$lib/components/mochott/mochottConst';
import type { MochottPublicationState } from '$lib/chotto/chotto';

const XRPC = `${MOCHOTT_ORIGIN}/xrpc`;

async function readError(res: Response): Promise<string> {
    try {
        const body = await res.json();
        return typeof body?.message === 'string' ? body.message : '';
    } catch {
        return '';
    }
}

export async function fetchPublicationState(did: string, fetcher: typeof fetch = fetch): Promise<MochottPublicationState> {
    const res = await fetcher(`${XRPC}/site.mochott.publication.getPublication?did=${encodeURIComponent(did)}`);
    if (!res.ok) {
        const message = await readError(res);
        if (res.status === 400 && message === 'Publication not found') {
            return { kind: 'unregistered' };
        }
        throw new Error(`mochott getPublication ${res.status}${message ? ': ' + message : ''}`);
    }
    const body = await res.json();
    const publication = body?.publication;
    if (typeof publication?.uri !== 'string') {
        throw new Error('mochott getPublication: invalid response');
    }
    return {
        kind: 'registered',
        uri: publication.uri,
        standardPublication: typeof publication.standardPublication === 'string' ? publication.standardPublication : undefined,
    };
}

export type ChottoArticleView = { title: string; cid?: string; contentJSON: unknown };

export async function fetchChottoArticle(uri: string, fetcher: typeof fetch = fetch): Promise<ChottoArticleView | null> {
    const res = await fetcher(`${XRPC}/site.mochott.article.getArticle?uri=${encodeURIComponent(uri)}`);
    if (!res.ok) {
        await res.body?.cancel().catch(() => {});
        return null;
    }
    const body = await res.json();
    const article = body?.article;
    if (!article || article.uri !== uri) {
        return null;
    }
    return {
        title: typeof article.title === 'string' ? article.title : '',
        cid: typeof article.cid === 'string' ? article.cid : undefined,
        contentJSON: article.contentJSON,
    };
}

export type MochottAuthorization = { authorized: true } | { authorized: false; authorizeUrl: string };

type ProxyAgent = { xrpc: { get: (nsid: string, params: Record<string, unknown>, options: { headers: Record<string, string> }) => Promise<any> } };

function isMochottUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    try {
        return new URL(value).origin === MOCHOTT_ORIGIN;
    } catch {
        return false;
    }
}

export async function fetchMochottAuthorization(agent: ProxyAgent): Promise<MochottAuthorization> {
    const res = await agent.xrpc.get('site.mochott.account.getAuthorization', { display: 'popup' }, { headers: { 'atproto-proxy': MOCHOTT_PROXY } });
    if (res?.authorized === true) {
        return { authorized: true };
    }
    if (res?.authorized === false && isMochottUrl(res.authorizeUrl)) {
        return { authorized: false, authorizeUrl: res.authorizeUrl };
    }
    throw new Error('mochott getAuthorization: invalid response');
}
