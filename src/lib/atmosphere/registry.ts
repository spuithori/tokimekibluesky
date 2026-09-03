import { resolveDidDocument, getPdsEndpoint } from '$lib/oauth/resolver';

export const ATMOSPHERE_API_URL = 'https://api.tokimeki.tech';
export const ATMOSPHERE_SERVICE_COLLECTION = 'tech.tokimeki.atmosphere.service';
export const ATMOSPHERE_DNS_TXT_PREFIX = '_tokimeki';
export const ATMOSPHERE_CATEGORIES = [
    'social', 'messaging', 'blog', 'art', 'photo', 'video', 'music', 'feeds',
    'bookmarks', 'polls', 'tools', 'developer', 'games', 'community', 'other',
] as const;
export const ATMOSPHERE_MAX_SCREENSHOTS = 10;

export interface AtmosphereLocalizedText {
    lang: string;
    name?: string;
    tagline?: string;
    description?: string;
}

export interface AtmosphereBlobRef {
    $type?: 'blob';
    ref?: { $link: string };
    cid?: string;
    mimeType?: string;
    size?: number;
}

export interface AtmosphereScreenshot {
    image: AtmosphereBlobRef;
    alt?: string;
    aspectRatio?: { width: number; height: number };
}

export interface AtmosphereServiceRecord {
    $type?: string;
    name: string;
    tagline?: string;
    description: string;
    localized?: AtmosphereLocalizedText[];
    url: string;
    icon?: AtmosphereBlobRef;
    screenshots?: AtmosphereScreenshot[];
    category?: string;
    createdAt?: string;
}

export interface AtmosphereServiceEntry {
    uri: string;
    did: string;
    rkey: string;
    pds: string;
    handle: string | null;
    record: AtmosphereServiceRecord;
}

export interface AtmosphereListedService {
    uri: string;
    did: string;
    rkey: string;
    host: string;
    pds: string;
    handle: string | null;
    verifiedBy: string;
    visible: boolean;
    createdAt: string;
}

export interface AtmosphereScreenshotView {
    url: string;
    alt: string;
    width: number | null;
    height: number | null;
}

export interface AtmosphereService {
    uri: string;
    did: string;
    rkey: string;
    handle: string | null;
    name: string;
    tagline: string;
    description: string;
    url: string;
    category: string | null;
    iconUrl: string | null;
    screenshots: AtmosphereScreenshotView[];
}

export interface DetailView {
    name: string;
    tagline: string;
    description: string;
    url: string;
    iconUrl: string | null;
    developerLabel: string | null;
    developerHref: string | null;
    category: string | null;
    screenshots: AtmosphereScreenshotView[];
    recordHref: string | null;
}

export function toDetailView(service: AtmosphereService): DetailView {
    return {
        name: service.name,
        tagline: service.tagline,
        description: service.description,
        url: service.url,
        iconUrl: service.iconUrl,
        developerLabel: service.handle ? `@${service.handle}` : service.did,
        developerHref: `/profile/${service.did}`,
        category: service.category,
        screenshots: service.screenshots,
        recordHref: `/atproto-viewer/${service.did}/${ATMOSPHERE_SERVICE_COLLECTION}/${service.rkey}`,
    };
}

export function parseAtUri(uri: unknown): { did: string; collection: string; rkey: string } | null {
    if (typeof uri !== 'string') return null;
    const match = /^at:\/\/(did:[a-z]+:[A-Za-z0-9._:%-]+)\/([A-Za-z0-9.-]+)\/([A-Za-z0-9._:~-]+)$/.exec(uri);
    if (!match) return null;
    return { did: match[1], collection: match[2], rkey: match[3] };
}

export function serviceUri(did: string, rkey: string): string {
    return `at://${did}/${ATMOSPHERE_SERVICE_COLLECTION}/${rkey}`;
}

export function servicePath(did: string, rkey: string): string {
    return `/atmosphere/${did}/${encodeURIComponent(rkey)}`;
}

export function isSafeHttpUrl(url: unknown): url is string {
    if (typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' || parsed.protocol === 'http:';
    } catch {
        return false;
    }
}

export function blobCid(blob: AtmosphereBlobRef | undefined): string | null {
    if (!blob || typeof blob !== 'object') return null;
    const cid = blob.ref?.$link ?? blob.cid;
    return typeof cid === 'string' && cid.length > 0 ? cid : null;
}

export function blobUrl(pds: string, did: string, cid: string): string {
    return `${pds}/xrpc/com.atproto.sync.getBlob?did=${encodeURIComponent(did)}&cid=${encodeURIComponent(cid)}`;
}

export function isServiceRecord(value: unknown): value is AtmosphereServiceRecord {
    if (!value || typeof value !== 'object') return false;
    const record = value as Record<string, unknown>;
    return typeof record.name === 'string' && record.name.trim().length > 0
        && typeof record.description === 'string'
        && isSafeHttpUrl(record.url);
}

function nonBlank(value: unknown): value is string {
    return typeof value === 'string' && value.trim().length > 0;
}

export function pickLocalized(record: AtmosphereServiceRecord, locale: string | undefined | null): { name: string; tagline: string; description: string } {
    const base = {
        name: record.name,
        tagline: nonBlank(record.tagline) ? record.tagline : '',
        description: record.description,
    };
    const list = Array.isArray(record.localized) ? record.localized : [];
    if (!locale || list.length === 0) return base;

    const wanted = locale.toLowerCase();
    const language = wanted.split('-')[0];
    const langOf = (item: AtmosphereLocalizedText) => typeof item?.lang === 'string' ? item.lang.toLowerCase() : '';
    const match = list.find((item) => langOf(item) === wanted)
        ?? list.find((item) => langOf(item).split('-')[0] === language);
    if (!match) return base;

    return {
        name: nonBlank(match.name) ? match.name : base.name,
        tagline: nonBlank(match.tagline) ? match.tagline : base.tagline,
        description: nonBlank(match.description) ? match.description : base.description,
    };
}

export function screenshotViews(entry: Pick<AtmosphereServiceEntry, 'did' | 'pds' | 'record'>): AtmosphereScreenshotView[] {
    const list = Array.isArray(entry.record.screenshots) ? entry.record.screenshots : [];
    const views: AtmosphereScreenshotView[] = [];
    for (const shot of list.slice(0, ATMOSPHERE_MAX_SCREENSHOTS)) {
        const cid = blobCid(shot?.image);
        if (!cid) continue;
        const ratio = shot.aspectRatio;
        const valid = ratio && Number.isInteger(ratio.width) && Number.isInteger(ratio.height) && ratio.width > 0 && ratio.height > 0;
        views.push({
            url: blobUrl(entry.pds, entry.did, cid),
            alt: typeof shot.alt === 'string' ? shot.alt : '',
            width: valid ? ratio.width : null,
            height: valid ? ratio.height : null,
        });
    }
    return views;
}

export function localizeService(entry: AtmosphereServiceEntry, locale: string | undefined | null): AtmosphereService {
    const { name, tagline, description } = pickLocalized(entry.record, locale);
    const cid = blobCid(entry.record.icon);
    return {
        uri: entry.uri,
        did: entry.did,
        rkey: entry.rkey,
        handle: entry.handle,
        name,
        tagline,
        description,
        url: entry.record.url,
        category: nonBlank(entry.record.category) ? entry.record.category : null,
        iconUrl: cid ? blobUrl(entry.pds, entry.did, cid) : null,
        screenshots: screenshotViews(entry),
    };
}

interface RepoInfo {
    pds: string;
    handle: string | null;
}

export function handleFromDidDocument(doc: { alsoKnownAs?: unknown }): string | null {
    const aka = Array.isArray(doc.alsoKnownAs) ? doc.alsoKnownAs : [];
    for (const item of aka) {
        if (typeof item === 'string' && item.startsWith('at://')) return item.slice(5);
    }
    return null;
}

async function resolveRepo(did: string, signal?: AbortSignal): Promise<RepoInfo> {
    const doc = await resolveDidDocument(did, signal);
    return { pds: getPdsEndpoint(doc), handle: handleFromDidDocument(doc as { alsoKnownAs?: unknown }) };
}

async function getRecord(pds: string, repo: string, collection: string, rkey: string, signal?: AbortSignal): Promise<unknown> {
    const params = new URLSearchParams({ repo, collection, rkey });
    const res = await fetch(`${pds}/xrpc/com.atproto.repo.getRecord?${params}`, { signal });
    if (res.status === 400) {
        const body = await res.json().catch(() => null);
        if (body?.error === 'RecordNotFound') return null;
    }
    if (!res.ok) throw new Error(`getRecord failed: ${res.status}`);
    const json = await res.json();
    return json?.value ?? null;
}

export function parseListedServices(value: unknown): AtmosphereListedService[] {
    const services = (value as { services?: unknown } | null)?.services;
    if (!Array.isArray(services)) return [];
    const listed: AtmosphereListedService[] = [];
    const seen = new Set<string>();
    for (const item of services) {
        const row = item as Partial<AtmosphereListedService> | null;
        if (!row || typeof row.uri !== 'string' || seen.has(row.uri)) continue;
        const parsed = parseAtUri(row.uri);
        if (!parsed || parsed.collection !== ATMOSPHERE_SERVICE_COLLECTION) continue;
        if (typeof row.pds !== 'string' || !isSafeHttpUrl(row.pds)) continue;
        seen.add(row.uri);
        listed.push({
            uri: row.uri,
            did: parsed.did,
            rkey: parsed.rkey,
            host: typeof row.host === 'string' ? row.host : '',
            pds: row.pds.replace(/\/$/, ''),
            handle: typeof row.handle === 'string' && row.handle ? row.handle : null,
            verifiedBy: typeof row.verifiedBy === 'string' ? row.verifiedBy : '',
            visible: row.visible !== false,
            createdAt: typeof row.createdAt === 'string' ? row.createdAt : '',
        });
    }
    return listed;
}

export async function fetchListedServices(options?: { did?: string; signal?: AbortSignal }): Promise<AtmosphereListedService[]> {
    const params = new URLSearchParams({ limit: '100' });
    if (options?.did) params.set('did', options.did);
    const res = await fetch(`${ATMOSPHERE_API_URL}/xrpc/tech.tokimeki.atmosphere.getServices?${params}`, { signal: options?.signal });
    if (!res.ok) throw new Error(`getServices failed: ${res.status}`);
    return parseListedServices(await res.json());
}

async function loadEntry(uri: string, repoPromise: Promise<RepoInfo>, signal?: AbortSignal): Promise<AtmosphereServiceEntry | null> {
    const parsed = parseAtUri(uri);
    if (!parsed || parsed.collection !== ATMOSPHERE_SERVICE_COLLECTION) return null;
    const { pds, handle } = await repoPromise;
    const value = await getRecord(pds, parsed.did, parsed.collection, parsed.rkey, signal);
    if (!isServiceRecord(value)) return null;
    return { uri, did: parsed.did, rkey: parsed.rkey, pds, handle, record: value };
}

export async function fetchAtmosphereService(did: string, rkey: string, signal?: AbortSignal): Promise<AtmosphereServiceEntry | null> {
    return loadEntry(serviceUri(did, rkey), resolveRepo(did, signal), signal);
}

export async function fetchAtmosphereServices(signal?: AbortSignal): Promise<AtmosphereServiceEntry[]> {
    const listed = await fetchListedServices({ signal });

    const results = await Promise.allSettled(listed.map((item) =>
        loadEntry(item.uri, Promise.resolve({ pds: item.pds, handle: item.handle }), signal),
    ));

    const entries: AtmosphereServiceEntry[] = [];
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value) entries.push(result.value);
    }
    return entries;
}
