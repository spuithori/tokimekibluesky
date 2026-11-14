import { MOCHOTT_ORIGIN } from '$lib/components/mochott/mochottConst';
import { mochottArticleUrl } from '$lib/components/mochott/mochottUrls';

export type CardShape = 'articles' | 'poll' | 'thumbs' | 'list' | 'status' | 'repos';

export const CARD_GAP = 8;
export const CARD_ARTICLE_ROWS = 2;
export const CARD_LIST_ROWS = 3;
export const CARD_THUMBS = 4;
export const CARD_POLL_OPTIONS = 4;
export const CARD_REPO_ROWS = 2;

const CARD_ESTIMATE: Record<CardShape, number> = {
    articles: 190,
    poll: 220,
    thumbs: 140,
    list: 140,
    status: 120,
    repos: 260,
};

export function estimatedCardHeight(shape: CardShape): number {
    return CARD_ESTIMATE[shape];
}

export interface CardLink {
    href: string;
    external: boolean;
}

export interface CardFeatured extends CardLink {
    title: string;
    image?: string;
    description?: string;
    date?: string;
    likes?: number;
    comments?: number;
}

export interface CardItem extends CardLink {
    title: string;
    description?: string;
    date?: string;
}

export interface CardThumb {
    src: string;
    href: string;
}

export interface CardStat {
    value: string;
    labelKey: string;
}

export interface CardPollOption {
    text: string;
    percent?: number;
}

export interface CardPoll extends CardLink {
    uri: string;
    question?: string;
    options: CardPollOption[];
    total?: number;
    viewer?: string;
    result?: unknown;
}

export interface CardRepo extends CardLink {
    title: string;
    description?: string;
    date?: string;
    stars?: number;
}

export interface CardActivityMonth {
    start: string;
    commits: number;
}

export interface CardRepos {
    items: CardRepo[];
    total?: number;
    activity: CardActivityMonth[];
}

export interface CardData {
    title?: string;
    updatedAt?: string;
    badgeKey?: string;
    featured?: CardFeatured;
    items?: CardItem[];
    thumbs?: CardThumb[];
    stats?: CardStat[];
    poll?: CardPoll;
    repos?: CardRepos;
}

export interface CardContext {
    did: string;
    handle: string;
    pds: string;
    collections: readonly string[];
    fetcher: typeof fetch;
    now: number;
    viewerDid?: string;
    getPostText?: (uri: string) => Promise<string | undefined>;
}

export type CardGlyph = 'study' | 'code' | 'article';

export interface ProfileCardDef {
    id: string;
    name: string;
    icon: string | { glyph: CardGlyph };
    shape: CardShape;
    collections: readonly string[];
    href: (ctx: Pick<CardContext, 'did' | 'handle'>) => CardLink;
    load: (ctx: CardContext) => Promise<CardData | null>;
}

const KAKU_ORIGIN = 'https://kaku.tokimeki.tech';
const POLL_ORIGIN = 'https://poll.tokimeki.tech';
const TANGLED_ORIGIN = 'https://tangled.org';
const TANGLED_API = 'https://api.tangled.org';
const TANGLED_SCAN = 30;
const DAY_MS = 86_400_000;
const STUDYING_FRESH_MS = 6 * 3_600_000;
const STANDARD_SCAN = 10;
const STANDARD_PUBLICATIONS = 3;

async function getJson(fetcher: typeof fetch, url: string): Promise<any | null> {
    const res = await fetcher(url);
    if (!res.ok) {
        await res.body?.cancel().catch(() => {});
        return null;
    }
    return res.json();
}

function rkeyOf(uri: unknown): string {
    return typeof uri === 'string' ? uri.split('/').pop() ?? '' : '';
}

function text(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function count(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function isWithin(value: unknown, now: number, span: number): boolean {
    const time = typeof value === 'string' ? Date.parse(value) : NaN;
    return Number.isFinite(time) && now - time < span;
}

function listRecordsUrl(ctx: CardContext, collection: string, limit: number): string {
    return `${ctx.pds}/xrpc/com.atproto.repo.listRecords?repo=${encodeURIComponent(ctx.did)}&collection=${encodeURIComponent(collection)}&limit=${limit}`;
}

function getRecordUrl(ctx: CardContext, collection: string, rkey: string): string {
    return `${ctx.pds}/xrpc/com.atproto.repo.getRecord?repo=${encodeURIComponent(ctx.did)}&collection=${encodeURIComponent(collection)}&rkey=${encodeURIComponent(rkey)}`;
}

export function blobThumbnail(did: string, blob: unknown): string | undefined {
    let ref: any = blob;
    if (typeof blob === 'string') {
        try {
            ref = JSON.parse(blob);
        } catch {
            return undefined;
        }
    }
    const cid = ref?.ref?.$link ?? ref?.cid;
    return typeof cid === 'string' && cid ? `https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${cid}@jpeg` : undefined;
}

export function formatMinutes(minutes: number): string {
    return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`;
}

async function loadMochott(ctx: CardContext): Promise<CardData | null> {
    const did = encodeURIComponent(ctx.did);
    const [publication, feed] = await Promise.all([
        getJson(ctx.fetcher, `${MOCHOTT_ORIGIN}/xrpc/site.mochott.publication.getPublication?did=${did}`),
        getJson(ctx.fetcher, `${MOCHOTT_ORIGIN}/xrpc/site.mochott.article.getAuthorArticles?author=${did}&limit=${CARD_ARTICLE_ROWS + 1}`),
    ]);
    const articles: any[] = Array.isArray(feed?.articles) ? feed.articles.filter((article: any) => text(article?.title)) : [];
    if (!articles.length) {
        return null;
    }
    const link = (article: any): CardLink => ({
        href: mochottArticleUrl({ uri: article.uri, slug: article.slug, author: { did: ctx.did, handle: article.author?.handle ?? ctx.handle }, minisite: article.minisite }),
        external: true,
    });
    const [first, ...rest] = articles;
    return {
        title: text(publication?.publication?.name),
        updatedAt: first.publishedAt ?? undefined,
        featured: {
            ...link(first),
            title: first.title,
            image: blobThumbnail(ctx.did, first.coverImage),
            description: text(first.description),
            date: first.publishedAt ?? undefined,
            likes: count(first.likeCount),
            comments: count(first.commentCount),
        },
        items: rest.slice(0, CARD_ARTICLE_ROWS).map((article) => ({ ...link(article), title: article.title, date: article.publishedAt ?? undefined })),
    };
}

function withoutPollLink(value: string | undefined): string | undefined {
    return text(value?.replace(/https?:\/\/poll\.tokimeki\.(tech|blue)\/\S*/g, ''));
}

async function loadPoll(ctx: CardContext): Promise<CardData | null> {
    const page = await getJson(ctx.fetcher, listRecordsUrl(ctx, 'tech.tokimeki.poll.poll', 1));
    const record = Array.isArray(page?.records) ? page.records[0] : undefined;
    const options: string[] = Array.isArray(record?.value?.options) ? record.value.options.filter((option: unknown) => typeof option === 'string') : [];
    const postUri = text(record?.value?.subject?.uri);
    if (!record?.uri || !options.length || !postUri) {
        return null;
    }
    const [result, question] = await Promise.all([
        getJson(ctx.fetcher, `${POLL_ORIGIN}/xrpc/tech.tokimeki.poll.getPoll?uri=${encodeURIComponent(record.uri)}${ctx.viewerDid ? `&viewer=${encodeURIComponent(ctx.viewerDid)}` : ''}`).catch(() => null),
        ctx.getPostText ? ctx.getPostText(postUri).catch(() => undefined) : undefined,
    ]);
    const endsAt = Date.parse(record.value.endsAt);
    const isEnded = result ? result.isEnded === true : !(Number.isFinite(endsAt) && endsAt > ctx.now);
    const total = result ? count(result.totalVotes) : undefined;
    const counts = new Map<number, number>(Array.isArray(result?.options) ? result.options.map((option: any) => [option.index, count(option.count)]) : []);
    return {
        updatedAt: text(record.value.createdAt),
        badgeKey: isEnded ? 'atmosphere_card_poll_closed' : 'atmosphere_card_poll_open',
        poll: {
            href: `/profile/${ctx.did}/post/${rkeyOf(postUri)}`,
            external: false,
            uri: record.uri,
            question: withoutPollLink(question),
            total,
            viewer: ctx.viewerDid,
            result: Array.isArray(result?.options) && result.poll?.cid ? result : undefined,
            options: options.slice(0, CARD_POLL_OPTIONS).map((option, index) => ({
                text: option,
                percent: isEnded && total ? Math.round(((counts.get(index) ?? 0) / total) * 100) : undefined,
            })),
        },
    };
}

async function loadKaku(ctx: CardContext): Promise<CardData | null> {
    const feed = await getJson(ctx.fetcher, `${KAKU_ORIGIN}/xrpc/tech.tokimeki.kaku.getPostsByAuthor?actor=${encodeURIComponent(ctx.did)}&limit=${CARD_THUMBS}`);
    const posts: any[] = Array.isArray(feed?.posts) ? feed.posts : [];
    const thumbs: CardThumb[] = [];
    for (const post of posts.slice(0, CARD_THUMBS)) {
        const rkey = rkeyOf(post?.uri);
        if (typeof post?.image !== 'string' || !rkey) continue;
        thumbs.push({ src: post.image, href: `${KAKU_ORIGIN}/post/${ctx.did}/${rkey}` });
    }
    if (!thumbs.length) {
        return null;
    }
    return { updatedAt: posts[0]?.createdAt, thumbs };
}

async function loadStudyNext(ctx: CardContext): Promise<CardData | null> {
    const [social, status] = await Promise.all([
        getJson(ctx.fetcher, getRecordUrl(ctx, 'app.studynext.socialProfile', 'self')),
        ctx.collections.includes('app.studynext.status') ? getJson(ctx.fetcher, getRecordUrl(ctx, 'app.studynext.status', 'self')) : null,
    ]);
    const profile = social?.value;
    const activity = profile?.activity;
    if (!profile || profile.rankingOptIn !== true || !activity) {
        return null;
    }
    const streak = isWithin(activity.date, ctx.now, 3 * DAY_MS) ? count(activity.streak) : 0;
    const weekMinutes = isWithin(activity.weekStart, ctx.now, 8 * DAY_MS) ? count(activity.weekMinutes) : 0;
    const monthMinutes = isWithin(activity.monthStart, ctx.now, 32 * DAY_MS) ? count(activity.monthMinutes) : 0;
    const live = status?.value;
    const studying = live?.studying === true && live?.shareStudying === true && isWithin(live?.updatedAt, ctx.now, STUDYING_FRESH_MS);
    return {
        updatedAt: text(profile.updatedAt),
        badgeKey: studying ? 'atmosphere_card_studying' : undefined,
        stats: [
            { value: String(streak), labelKey: 'atmosphere_card_streak' },
            { value: formatMinutes(weekMinutes), labelKey: 'atmosphere_card_week' },
            { value: formatMinutes(monthMinutes), labelKey: 'atmosphere_card_month' },
        ],
    };
}

function didOf(value: unknown): string | undefined {
    return typeof value === 'string' ? value.match(/did:[a-z]+:[A-Za-z0-9._:%-]+/)?.[0] : undefined;
}

async function loadTangledRepos(ctx: CardContext): Promise<CardData | null> {
    const api = (method: string, query: string) => getJson(ctx.fetcher, `${TANGLED_API}/xrpc/${method}?${query}`);
    const actor = encodeURIComponent(ctx.did);
    const [list, profile, activity] = await Promise.all([
        api('org.tangled.repo.listRepos', `subject=${actor}&limit=${TANGLED_SCAN}`),
        ctx.collections.includes('org.tangled.actor.profile') ? getJson(ctx.fetcher, getRecordUrl(ctx, 'org.tangled.actor.profile', 'self')).catch(() => null) : null,
        api('org.tangled.actor.getProfileActivity', `actor=${actor}`).catch(() => null),
    ]);
    const repos: { did: string; name: string; description?: string; createdAt?: string }[] = [];
    for (const item of Array.isArray(list?.items) ? list.items : []) {
        const did = didOf(item?.uri);
        const name = text(item?.value?.declaration?.name);
        if (did && name) {
            repos.push({ did, name, description: text(item.value.description), createdAt: text(item.value.createdAt) });
        }
    }
    if (!repos.length) {
        return null;
    }
    const pins: string[] = Array.isArray(profile?.value?.pinnedRepositories) ? profile.value.pinnedRepositories.map(didOf).filter(Boolean) : [];
    const pinned = pins.map((did) => repos.find((repo) => repo.did === did)).filter((repo) => repo !== undefined);
    const shown = [...pinned, ...repos.filter((repo) => !pinned.includes(repo))].slice(0, CARD_REPO_ROWS);
    const stars = await Promise.all(shown.map((repo) => api('org.tangled.feed.countStars', `subject=${encodeURIComponent(repo.did)}`).then((res) => (res ? count(res.count) : undefined)).catch(() => undefined)));
    const months: CardActivityMonth[] = [];
    for (const month of Array.isArray(activity?.months) ? activity.months : []) {
        const start = text(month?.start);
        if (start) {
            months.push({ start, commits: count(month.commits) });
        }
    }
    months.sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
    return {
        updatedAt: repos.reduce<string | undefined>((latest, repo) => (repo.createdAt && (!latest || Date.parse(repo.createdAt) > Date.parse(latest)) ? repo.createdAt : latest), undefined),
        repos: {
            items: shown.map((repo, index) => ({
                title: repo.name,
                description: repo.description,
                date: repo.createdAt,
                stars: stars[index],
                href: `${TANGLED_ORIGIN}/${ctx.handle}/${encodeURIComponent(repo.name)}`,
                external: true,
            })),
            total: typeof list.total === 'number' ? count(list.total) : undefined,
            activity: months.some((month) => month.commits > 0) ? months : [],
        },
    };
}

async function loadTangled(ctx: CardContext): Promise<CardData | null> {
    return (await loadTangledRepos(ctx).catch(() => null)) ?? loadTangledRecords(ctx);
}

async function loadTangledRecords(ctx: CardContext): Promise<CardData | null> {
    const collection = ctx.collections.includes('org.tangled.repo.declaration') ? 'org.tangled.repo.declaration' : 'sh.tangled.repo';
    const page = await getJson(ctx.fetcher, listRecordsUrl(ctx, collection, CARD_LIST_ROWS));
    const records: any[] = Array.isArray(page?.records) ? page.records : [];
    const items: CardItem[] = [];
    let updatedAt: string | undefined;
    for (const record of records) {
        const name = text(record?.value?.name) ?? rkeyOf(record?.uri);
        if (!name) continue;
        const createdAt = text(record?.value?.createdAt);
        items.push({
            title: name,
            description: text(record?.value?.description),
            date: createdAt,
            href: `${TANGLED_ORIGIN}/${ctx.handle}/${encodeURIComponent(name)}`,
            external: true,
        });
        if (createdAt && (!updatedAt || Date.parse(createdAt) > Date.parse(updatedAt))) {
            updatedAt = createdAt;
        }
    }
    if (!items.length) {
        return null;
    }
    return { updatedAt, items };
}

function isMochottUrl(url: string): boolean {
    return url === MOCHOTT_ORIGIN || url.startsWith(`${MOCHOTT_ORIGIN}/`);
}

function httpUrl(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:' ? value.replace(/\/+$/, '') : null;
    } catch {
        return null;
    }
}

async function loadStandard(ctx: CardContext): Promise<CardData | null> {
    const page = await getJson(ctx.fetcher, listRecordsUrl(ctx, 'site.standard.document', STANDARD_SCAN));
    const documents: any[] = Array.isArray(page?.records) ? page.records.map((record: any) => record?.value).filter(Boolean) : [];
    const ownPrefix = `at://${ctx.did}/site.standard.publication/`;
    const wanted = [...new Set(documents.map((doc) => doc.site).filter((site): site is string => typeof site === 'string' && site.startsWith(ownPrefix)))].slice(0, STANDARD_PUBLICATIONS);
    const resolved = await Promise.all(wanted.map((site) => getJson(ctx.fetcher, getRecordUrl(ctx, 'site.standard.publication', rkeyOf(site)))));
    const publications = new Map<string, { url: string; name?: string }>();
    wanted.forEach((site, index) => {
        const url = httpUrl(resolved[index]?.value?.url);
        if (url) {
            publications.set(site, { url, name: text(resolved[index].value.name) });
        }
    });

    const entries: { doc: any; href: string }[] = [];
    const names = new Set<string>();
    for (const doc of documents) {
        if (entries.length > CARD_ARTICLE_ROWS) break;
        if (!text(doc.title)) continue;
        const publication = publications.get(doc.site);
        const base = publication?.url ?? httpUrl(doc.site);
        if (!base || isMochottUrl(base)) continue;
        const path = typeof doc.path === 'string' ? doc.path : '';
        entries.push({ doc, href: `${base}${path.startsWith('/') || !path ? path : `/${path}`}` });
        if (publication?.name) names.add(publication.name);
    }
    if (!entries.length) {
        return null;
    }
    const [first, ...rest] = entries;
    return {
        title: names.size === 1 ? [...names][0] : undefined,
        updatedAt: text(first.doc.publishedAt),
        featured: {
            href: first.href,
            external: true,
            title: first.doc.title,
            image: blobThumbnail(ctx.did, first.doc.coverImage),
            description: text(first.doc.description),
            date: text(first.doc.publishedAt),
        },
        items: rest.map(({ doc, href }) => ({ title: doc.title, href, external: true, date: text(doc.publishedAt) })),
    };
}

export const PROFILE_CARD_DEFS: readonly ProfileCardDef[] = [
    {
        id: 'mochott',
        name: 'mochott',
        icon: '/atmosphere/mochott.webp',
        shape: 'articles',
        collections: ['site.mochott.article'],
        href: ({ handle }) => ({ href: `/profile/${handle}/blog`, external: false }),
        load: loadMochott,
    },
    {
        id: 'poll',
        name: 'TOKIMEKI Poll',
        icon: '/atmosphere/poll.webp',
        shape: 'poll',
        collections: ['tech.tokimeki.poll.poll'],
        href: () => ({ href: `${POLL_ORIGIN}/`, external: true }),
        load: loadPoll,
    },
    {
        id: 'kaku',
        name: 'KAKU',
        icon: '/atmosphere/kaku.webp',
        shape: 'thumbs',
        collections: ['tech.tokimeki.kaku.post'],
        href: ({ handle }) => ({ href: `${KAKU_ORIGIN}/user/${handle}`, external: true }),
        load: loadKaku,
    },
    {
        id: 'studynext',
        name: 'StudyNext',
        icon: { glyph: 'study' },
        shape: 'status',
        collections: ['app.studynext.socialProfile'],
        href: () => ({ href: 'https://studynext.app/', external: true }),
        load: loadStudyNext,
    },
    {
        id: 'tangled',
        name: 'Tangled',
        icon: { glyph: 'code' },
        shape: 'repos',
        collections: ['org.tangled.repo.declaration', 'sh.tangled.repo'],
        href: ({ handle }) => ({ href: `${TANGLED_ORIGIN}/${handle}`, external: true }),
        load: loadTangled,
    },
    {
        id: 'standard',
        name: 'standard.site',
        icon: { glyph: 'article' },
        shape: 'articles',
        collections: ['site.standard.document'],
        href: () => ({ href: 'https://standard.site/', external: true }),
        load: loadStandard,
    },
];

export function detectProfileCards(collections: readonly string[], defs: readonly ProfileCardDef[] = PROFILE_CARD_DEFS): ProfileCardDef[] {
    const owned = new Set(collections);
    return defs.filter((def) => def.collections.some((collection) => owned.has(collection)));
}

export function packPages(heights: readonly number[], available: number, gap: number = CARD_GAP): number[][] {
    const pages: number[][] = [];
    const placed = new Set<number>();
    for (let anchor = 0; anchor < heights.length; anchor++) {
        if (placed.has(anchor)) continue;
        const page = [anchor];
        placed.add(anchor);
        let used = heights[anchor];
        for (let next = anchor + 1; next < heights.length; next++) {
            if (placed.has(next) || used + gap + heights[next] > available) continue;
            page.push(next);
            placed.add(next);
            used += gap + heights[next];
        }
        pages.push(page);
    }
    return pages;
}
