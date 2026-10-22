import type {BlobRef, ProfileLinkView} from '$lib/types/atproto';

export const PROFILE_LINK_COLLECTION = 'app.bsky.actor.link';
export const MAX_PROFILE_LINKS = 10;
export const MAX_TITLE_LENGTH = 30;

export type ProfileLink = {
    url: string;
    title?: string;
    icon?: BlobRef;
    iconUrl?: string;
    uri?: string;
    cid?: string;
};

export type StrongRef = { uri: string; cid: string };

export const BLOCKED_DOMAINS = [
    'aceimg.in',
    'fansly.com',
    'onlyfans.com',
    'onlylinks.cc',
    'slicedrve.in',
    'vdey.in',
    'videy.at',
    'videy.lt',
    'videy.my',
];

export const SHORTENER_DOMAINS = [
    'acel.me',
    'adf.ly',
    'bit.ly',
    'bitly.com',
    'bl.ink',
    'buff.ly',
    'clck.ru',
    'cutt.ly',
    'fc-lc.xyz',
    'goo.gl',
    'goto.now',
    'is.gd',
    'link2.fm',
    'ln.run',
    'lnk.ua',
    'lnkd.in',
    'n9.cl',
    'ow.ly',
    'psee.io',
    'rb.gy',
    'rebrand.ly',
    'rg.by',
    's.id',
    'short.do',
    'short.gy',
    'shorten.as',
    'shorten.ee',
    'shorten.is',
    'shorten.so',
    'shorten.tv',
    'shorten.world',
    'shorter.me',
    'shortn.icu',
    'shorturl.at',
    'shorturl.lt',
    'shorturl.ly',
    'slnt.to',
    'smarturl.lt',
    'smarturl.my',
    'sprl.me',
    'sw.run',
    't.co',
    't.ly',
    'tiny.cc',
    'tinyurl.com',
    'urlr.me',
    'v.gd',
    'x.gd',
    'zig.ht',
];

export type LinkInputError = 'invalid' | 'insecure' | 'shortener' | 'blocked' | 'duplicate';

function parseWebUrl(url: string): URL | undefined {
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
            return parsed;
        }
    } catch {}
    return undefined;
}

function hostMatches(url: string, domains: string[]): boolean {
    const host = parseWebUrl(url)?.hostname.toLowerCase();
    if (!host) return false;
    return domains.some(domain => host === domain || host.endsWith(`.${domain}`));
}

export function normalizeProfileLinkUrl(input: string): string | null {
    let value = input.trim();
    if (!value || value.endsWith('.')) return null;
    if (!/^https?:\/\//i.test(value)) {
        value = 'https://' + value;
    }
    const parsed = parseWebUrl(value);
    if (!parsed) return null;
    const labels = parsed.hostname.split('.');
    if (labels.length < 2 || !/^[a-z]{2,}$/i.test(labels[labels.length - 1])) return null;
    return parsed.toString();
}

export function isShortenerLink(url: string): boolean {
    return hostMatches(url, SHORTENER_DOMAINS);
}

export function isBlockedProfileLink(url: string): boolean {
    return hostMatches(url, BLOCKED_DOMAINS);
}

export function isInsecureLink(url: string): boolean {
    return parseWebUrl(url)?.protocol === 'http:';
}

export function validateLinkInput(input: string, otherUrls: string[]): { url: string | null; error?: LinkInputError } {
    if (/^http:/i.test(input.trim())) return { url: null, error: 'insecure' };
    const url = normalizeProfileLinkUrl(input);
    if (!url) return { url: null, error: 'invalid' };
    if (isBlockedProfileLink(url)) return { url, error: 'blocked' };
    if (isShortenerLink(url)) return { url, error: 'shortener' };
    if (otherUrls.some(other => normalizeProfileLinkUrl(other) === url)) return { url, error: 'duplicate' };
    return { url };
}

export function getLinkHost(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
}

export function formatLinkUrl(url: string): string {
    return url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
}

const segmenter = new Intl.Segmenter();

export function truncateTitle(title: string): string {
    const graphemes = Array.from(segmenter.segment(title), s => s.segment);
    if (graphemes.length <= MAX_TITLE_LENGTH) return title;
    return graphemes.slice(0, MAX_TITLE_LENGTH).join('').trim();
}

export function suggestTitle(pageTitle: string | undefined): string {
    const first = (pageTitle ?? '').split(/\s+[|\-–—·]\s+|:\s+/)[0] ?? '';
    const trimmed = first.trim();
    if (trimmed.length <= MAX_TITLE_LENGTH) return trimmed;
    const cut = trimmed.slice(0, MAX_TITLE_LENGTH);
    const lastSpace = cut.lastIndexOf(' ');
    return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}

function acceptShowable(url: unknown, seen: Set<string>): url is string {
    if (typeof url !== 'string') return false;
    const normalized = normalizeProfileLinkUrl(url);
    if (!normalized || seen.has(normalized) || isInsecureLink(normalized) || isShortenerLink(normalized) || isBlockedProfileLink(normalized)) {
        return false;
    }
    seen.add(normalized);
    return true;
}

function withTitle(link: ProfileLink, title: unknown): ProfileLink {
    const trimmed = typeof title === 'string' ? truncateTitle(title.trim()) : '';
    if (trimmed) link.title = trimmed;
    return link;
}

export function linksFromProfileView(views: ProfileLinkView[] | undefined, isHidden: (view: ProfileLinkView) => boolean = () => false): ProfileLink[] {
    const links: ProfileLink[] = [];
    const seen = new Set<string>();
    for (const view of views ?? []) {
        if (links.length >= MAX_PROFILE_LINKS) break;
        if (isHidden(view) || !acceptShowable(view.url, seen)) continue;
        const link = withTitle({ url: view.url, uri: view.uri, cid: view.cid }, view.title);
        if (view.icon) link.iconUrl = view.icon;
        links.push(link);
    }
    return links;
}

export function linksFromRecords(refs: StrongRef[] | undefined, records: { uri: string; cid?: string; value: Record<string, unknown> }[]): ProfileLink[] {
    const byUri = new Map(records.map(record => [record.uri, record]));
    const links: ProfileLink[] = [];
    const seen = new Set<string>();
    for (const ref of refs ?? []) {
        if (links.length >= MAX_PROFILE_LINKS) break;
        const record = byUri.get(ref?.uri);
        if (!record || !acceptShowable(record.value.url, seen)) continue;
        const link = withTitle({ url: record.value.url as string, uri: record.uri, cid: record.cid ?? ref.cid }, record.value.title);
        if (record.value.icon) link.icon = record.value.icon as BlobRef;
        links.push(link);
    }
    return links;
}

export function blobCidOf(blob: BlobRef | undefined): string | undefined {
    const cid = (blob?.ref as { $link?: unknown } | undefined)?.$link;
    return typeof cid === 'string' ? cid : undefined;
}

export function linkIconSrc(link: ProfileLink, did: string): string | undefined {
    if (link.iconUrl) return link.iconUrl;
    const cid = blobCidOf(link.icon);
    return cid ? `https://cdn.bsky.app/img/avatar_thumbnail/plain/${did}/${cid}@png` : undefined;
}

export function rkeyOf(uri: string): string {
    return uri.split('/').pop() ?? '';
}
