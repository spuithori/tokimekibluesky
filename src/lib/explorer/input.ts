import { isHandle } from './identity';
import { explorerPath, isDid, isNsid, parseAtUri } from './values';

export type InputKind = 'repo' | 'collection' | 'record' | 'pds' | 'lexicon';

export interface InputTarget {
    kind: InputKind;
    path: string;
    ambiguous?: boolean;
}

const BSKY_HOSTS = new Set(['bsky.app', 'main.bsky.dev', 'tokimeki.blue', 'blacksky.community', 'deer.social', 'witchsky.app', 'catsky.social', 'reddwarf.app']);
const BSKY_COLLECTIONS: Record<string, string> = {
    post: 'app.bsky.feed.post',
    lists: 'app.bsky.graph.list',
    feed: 'app.bsky.feed.generator',
    follows: 'app.bsky.graph.follow',
};
const EXPLORER_HOSTS = new Set(['pds.ls', 'pdsls.dev', 'atproto-browser.vercel.app', 'atproto.at', 'atp.tools']);

export function pdsPath(host: string): string {
    return '/atproto-viewer/pds/' + host;
}

export function lexiconPath(nsid: string): string {
    return '/atproto-viewer/lexicon/' + nsid;
}

function fromAtUri(value: string): InputTarget | null {
    const uri = parseAtUri(value);
    if (!uri || !(isDid(uri.repo) || isHandle(uri.repo))) return null;
    return { kind: uri.rkey ? 'record' : uri.collection ? 'collection' : 'repo', path: explorerPath(uri) };
}

function fromUrl(url: URL): InputTarget | null {
    const segments = url.pathname.split('/').filter(Boolean).map((segment) => {
        try {
            return decodeURIComponent(segment);
        } catch {
            return segment;
        }
    });

    const embedded = (url.pathname + url.hash).match(/at:\/\/?[^\s?#]+/);
    if (embedded) {
        const target = fromAtUri(embedded[0].replace(/^at:\/(?!\/)/, 'at://'));
        if (target) return target;
    }

    if (EXPLORER_HOSTS.has(url.hostname) && segments[0] && (isDid(segments[0]) || isHandle(segments[0]))) {
        return fromAtUri('at://' + segments.slice(0, 3).join('/'));
    }

    if (BSKY_HOSTS.has(url.hostname)) {
        if (segments[0] === 'profile' && segments[1]) {
            const collection = BSKY_COLLECTIONS[segments[2]];
            if (collection && segments[3]) return fromAtUri(`at://${segments[1]}/${collection}/${segments[3]}`);
            return fromAtUri(`at://${segments[1]}`);
        }
        if (segments[0] === 'starter-pack' && segments[1] && segments[2]) {
            return fromAtUri(`at://${segments[1]}/app.bsky.graph.starterpack/${segments[2]}`);
        }
        return null;
    }

    if (url.hostname === 'tangled.org' || url.hostname === 'tangled.sh') {
        const actor = segments[0]?.replace(/^@/, '');
        if (actor && (isDid(actor) || isHandle(actor))) return fromAtUri(`at://${actor}`);
        return null;
    }

    if (segments.length === 0 || segments[0] === 'xrpc') return { kind: 'pds', path: pdsPath(url.host) };
    return null;
}

export function parseInput(raw: string): InputTarget | null {
    let value = raw.trim();
    if (!value) return null;
    if (value.includes('%')) {
        try {
            value = decodeURIComponent(value);
        } catch {
            return null;
        }
    }

    if (value.startsWith('at://')) return fromAtUri(value);
    if (value.startsWith('lex:') || value.startsWith('nsid:')) {
        const nsid = value.slice(value.indexOf(':') + 1).trim();
        return isNsid(nsid) ? { kind: 'lexicon', path: lexiconPath(nsid) } : null;
    }
    if (value.startsWith('pds:')) {
        const host = value.slice(4).trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
        return host ? { kind: 'pds', path: pdsPath(host) } : null;
    }
    if (value.startsWith('https://') || value.startsWith('http://')) {
        try {
            return fromUrl(new URL(value));
        } catch {
            return null;
        }
    }
    if (isDid(value)) return { kind: 'repo', path: explorerPath({ repo: value }) };

    const bare = value.replace(/^@/, '');
    const [head, collection, rkey] = bare.split('/');
    if (isDid(head) || isHandle(head)) {
        if (collection) return fromAtUri(`at://${head}/${collection}${rkey ? '/' + rkey : ''}`);
        const last = head.split('.').pop() ?? '';
        if (!value.startsWith('@') && /[A-Z]/.test(last) && isNsid(head)) return { kind: 'lexicon', path: lexiconPath(head) };
        return { kind: 'repo', path: explorerPath({ repo: head.toLowerCase() }), ambiguous: isNsid(head) && head.split('.').length >= 3 };
    }
    return null;
}
