import { UnicodeString, detectFacets } from '$lib/atproto-richtext';
import { escapeHtml, jsonToText, textToJson } from '$lib/components/editor/richtext';
import { MOCHOTT_ORIGIN } from '$lib/components/mochott/mochottConst';

export const CHOTTO_VIA = 'tech.tokimeki';
export const CHOTTO_CATEGORY = 'chotto';
export const LONG_POST_FIELD = 'site.mochott.longPost';
export const CHOTTO_TEXT_MAX_BYTES = 100_000;
export const CHOTTO_COVER_MAX_BYTES = 1_000_000;
export const CHOTTO_TITLE_INPUT_MAX = 200;

const ARTICLE = 'site.mochott.article';
const PROFILE = 'site.mochott.profile';
const STANDARD_PUBLICATION = 'site.standard.publication';
const STANDARD_DOCUMENT = 'site.standard.document';
const CREATE = 'com.atproto.repo.applyWrites#create';
const COVER_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const THUMB_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const CARD_TITLE_MAX = 500;
const CARD_TITLE_MAX_BYTES = 5000;
const CARD_DESCRIPTION_MAX = 3000;
const CARD_DESCRIPTION_MAX_BYTES = 30000;
const AUTO_TITLE_MAX = 60;
const DESCRIPTION_MAX = 120;
const ANNOUNCE_MAX = 300;
const TAGS_MAX = 8;
const TAG_MAX_GRAPHEMES = 64;
const TAG_MAX_BYTES = 640;
const ELLIPSIS = '…';

export type BlobRef = { $type: 'blob'; ref: { $link: string }; mimeType: string; size: number };

export type ChottoImage = { blob: BlobRef; alt: string; width?: number; height?: number };

export type ChottoCard =
    | { kind: 'link'; url: string; title?: string; description?: string; thumb?: BlobRef }
    | { kind: 'post'; uri: string };

export type MochottPublication = { uri: string; standardPublication?: string };

export type MochottPublicationState =
    | { kind: 'unregistered' }
    | ({ kind: 'registered' } & MochottPublication);

export type ChottoWrite = { $type: typeof CREATE; collection: string; rkey: string; value: Record<string, unknown> };

export type ChottoInput = {
    did: string;
    handle: string;
    publication: MochottPublication;
    articleRkey: string;
    now: string;
    title: string;
    text: string;
    json: unknown;
    images: ChottoImage[];
    cards?: ChottoCard[];
    cover?: BlobRef;
    labels: string[];
};

export type ChottoArticle = {
    write: ChottoWrite;
    document?: (bskyPostRef: { uri: string; cid: string }) => ChottoWrite;
    uri: string;
    record: Record<string, unknown>;
    url: string;
    title: string;
    description: string;
};

const segmenter = new Intl.Segmenter();

function clip(text: string, max: number): { text: string; clipped: boolean } {
    let out = '';
    let count = 0;
    for (const { segment } of segmenter.segment(text)) {
        if (count === max) {
            return { text: out, clipped: true };
        }
        out += segment;
        count++;
    }
    return { text: out, clipped: false };
}

function compact<T extends Record<string, unknown>>(value: T): T {
    for (const key of Object.keys(value)) {
        if (value[key] === undefined) {
            delete value[key];
        }
    }
    return value;
}

function isHttpUrl(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    try {
        const url = new URL(value);
        return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
        return false;
    }
}

function positiveInt(value: unknown): number | undefined {
    if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
    const n = Math.round(value);
    return n > 0 ? n : undefined;
}

export function utf8Length(text: string): number {
    return new UnicodeString(text).length;
}

export function autoTitle(text: string): string {
    const line = text.split(/\r\n?|\n/).map(l => l.trim()).find(l => l.length > 0) ?? '';
    const { text: head, clipped } = clip(line, AUTO_TITLE_MAX);
    return clipped ? head + ELLIPSIS : head;
}

export function resolveTitle(input: string, text: string): string {
    return input.trim() || autoTitle(text);
}

export function buildDescription(text: string): string {
    const flat = text.replace(/\s+/g, ' ').trim();
    const { text: head, clipped } = clip(flat, DESCRIPTION_MAX);
    return clipped ? head + ELLIPSIS : head;
}

export function extractTags(text: string): string[] {
    const facets = detectFacets(new UnicodeString(text)) ?? [];
    const tags: string[] = [];
    for (const facet of facets) {
        const feature = facet.features[0] as { $type?: string; tag?: string };
        if (feature?.$type !== 'app.bsky.richtext.facet#tag' || typeof feature.tag !== 'string') continue;
        const tag = feature.tag;
        if (!tag || tag.startsWith('$') || tags.includes(tag)) continue;
        if (new UnicodeString(tag).graphemeLength > TAG_MAX_GRAPHEMES || utf8Length(tag) > TAG_MAX_BYTES) continue;
        tags.push(tag);
        if (tags.length === TAGS_MAX) break;
    }
    return tags;
}

type Inline = { type: 'text'; text: string; marks?: { type: 'link'; attrs: { href: string } }[] } | { type: 'hardBreak' };

function convertInline(item: any): Inline | null {
    if (item?.type === 'hardBreak') {
        return { type: 'hardBreak' };
    }
    if (item?.type === 'mention' && typeof item.attrs?.id === 'string' && item.attrs.id) {
        const handle = item.attrs.id;
        return { type: 'text', text: '@' + handle, marks: [{ type: 'link', attrs: { href: `https://bsky.app/profile/${handle}` } }] };
    }
    if (item?.type === 'text' && typeof item.text === 'string' && item.text.length > 0) {
        const href = Array.isArray(item.marks) ? item.marks.find((m: any) => m?.type === 'link')?.attrs?.href : undefined;
        return isHttpUrl(href)
            ? { type: 'text', text: item.text, marks: [{ type: 'link', attrs: { href } }] }
            : { type: 'text', text: item.text };
    }
    return null;
}

function clipCardText(value: unknown, max: number, maxBytes: number): string | undefined {
    if (typeof value !== 'string') return undefined;
    let text = clip(value.trim(), max).text;
    while (text && utf8Length(text) > maxBytes) {
        text = clip(text, [...segmenter.segment(text)].length - 1).text;
    }
    return text || undefined;
}

const RECORD_URI = /^at:\/\/(did:[a-z]+:[a-zA-Z0-9._:%-]+)\/([a-zA-Z0-9.]+)\/([a-zA-Z0-9._~:-]{1,512})$/;

export function bskyRecordUrl(uri: unknown): string | undefined {
    const match = typeof uri === 'string' ? uri.match(RECORD_URI) : null;
    if (!match) return undefined;
    const [, did, collection, rkey] = match;
    switch (collection) {
        case 'app.bsky.feed.post': return `https://bsky.app/profile/${did}/post/${rkey}`;
        case 'app.bsky.feed.generator': return `https://bsky.app/profile/${did}/feed/${rkey}`;
        case 'app.bsky.graph.list': return `https://bsky.app/profile/${did}/lists/${rkey}`;
        case 'app.bsky.graph.starterpack': return `https://bsky.app/starter-pack/${did}/${rkey}`;
        default: return undefined;
    }
}

const RECORD_WITH_MEDIA = 'app.bsky.embed.recordWithMedia';

function embedParts(embed: any): { media: any; record: any } {
    if (embed?.$type === RECORD_WITH_MEDIA) {
        return { media: embed.media, record: embed.record?.record };
    }
    if (embed?.$type === 'app.bsky.embed.record') {
        return { media: undefined, record: embed.record };
    }
    return { media: embed, record: undefined };
}

function toChottoImage(item: any): ChottoImage {
    if (!isBlobRef(item?.image)) {
        throw new Error('The post embed has an invalid image blob');
    }
    return {
        blob: item.image,
        alt: typeof item.alt === 'string' ? item.alt : '',
        width: item.aspectRatio?.width,
        height: item.aspectRatio?.height,
    };
}

export function chottoAttachments(embed: unknown, quote: { title?: string; description?: string } = {}): { images: ChottoImage[]; cards: ChottoCard[] } {
    const { media, record } = embedParts(embed);
    const images: ChottoImage[] = [];
    const cards: ChottoCard[] = [];

    if (media?.$type === 'app.bsky.embed.images' && Array.isArray(media.images)) {
        images.push(...media.images.map(toChottoImage));
    } else if (media?.$type === 'app.bsky.embed.gallery' && Array.isArray(media.items)) {
        images.push(...media.items.filter((item: any) => item?.$type === 'app.bsky.embed.gallery#image').map(toChottoImage));
    } else if (media?.$type === 'app.bsky.embed.external' && isHttpUrl(media.external?.uri)) {
        cards.push(compact({
            kind: 'link' as const,
            url: media.external.uri,
            title: clipCardText(media.external.title, CARD_TITLE_MAX, CARD_TITLE_MAX_BYTES),
            description: clipCardText(media.external.description, CARD_DESCRIPTION_MAX, CARD_DESCRIPTION_MAX_BYTES),
            thumb: isBlobRef(media.external.thumb) ? media.external.thumb : undefined,
        }));
    }

    const recordUrl = bskyRecordUrl(record?.uri);
    if (recordUrl && record.uri.split('/')[3] === 'app.bsky.feed.post') {
        cards.push({ kind: 'post', uri: record.uri });
    } else if (recordUrl) {
        cards.push(compact({
            kind: 'link' as const,
            url: recordUrl,
            title: clipCardText(quote.title, CARD_TITLE_MAX, CARD_TITLE_MAX_BYTES),
            description: clipCardText(quote.description, CARD_DESCRIPTION_MAX, CARD_DESCRIPTION_MAX_BYTES),
        }));
    }

    return { images, cards };
}

export function convertContent(json: unknown, text: string, did: string, images: ChottoImage[], cards: ChottoCard[] = []) {
    const doc: any = (json as any)?.type === 'doc' && Array.isArray((json as any).content) ? json : textToJson(text);
    const content: Record<string, unknown>[] = [];

    for (const block of doc.content) {
        if (block?.type !== 'paragraph') continue;
        const inlines = (Array.isArray(block.content) ? block.content : []).map(convertInline).filter(Boolean) as Inline[];
        content.push(inlines.length ? { type: 'paragraph', content: inlines } : { type: 'paragraph' });
    }

    const blobs: { blobref: BlobRef }[] = [];
    const listed = new Set<string>();
    const list = (blob: BlobRef) => {
        const cid = blob.ref.$link;
        if (!listed.has(cid)) {
            listed.add(cid);
            blobs.push({ blobref: blob });
        }
        return `/api/image/${did}/${cid}`;
    };

    for (const image of images) {
        content.push({
            type: 'image',
            attrs: compact({
                src: list(image.blob),
                alt: image.alt || undefined,
                width: positiveInt(image.width),
                height: positiveInt(image.height),
            }),
        });
    }

    for (const card of cards) {
        if (card.kind === 'post') {
            const [, , author, , rkey] = card.uri.split('/');
            content.push({
                type: 'embed',
                attrs: {
                    src: bskyRecordUrl(card.uri),
                    service: 'bluesky',
                    embedUrl: `https://embed.bsky.app/embed/${author}/app.bsky.feed.post/${rkey}`,
                },
            });
            continue;
        }
        const thumb = card.thumb && THUMB_TYPES.has(card.thumb.mimeType) ? card.thumb : undefined;
        content.push({
            type: 'linkCard',
            attrs: compact({
                url: card.url,
                title: card.title,
                description: card.description,
                image: thumb ? list(thumb) : undefined,
            }),
        });
    }

    return { content: { type: 'doc', content }, blobs };
}

export function isBlobRef(value: unknown): value is BlobRef {
    const blob = value as BlobRef | undefined;
    return !!blob && blob.$type === 'blob' && typeof blob.ref?.$link === 'string'
        && typeof blob.mimeType === 'string' && typeof blob.size === 'number';
}

export function isCoverCandidate(blob: unknown): blob is BlobRef {
    return isBlobRef(blob) && COVER_TYPES.has(blob.mimeType) && blob.size > 0 && blob.size <= CHOTTO_COVER_MAX_BYTES;
}

export function articleUrl(handle: string, rkey: string): string {
    return `${MOCHOTT_ORIGIN}/${handle}/${rkey}`;
}

export function buildChottoArticle(input: ChottoInput): ChottoArticle {
    const { did, handle, now, articleRkey } = input;
    if (!isOwnMochottPublication(input.publication.uri, did)) {
        throw new Error('mochott publication does not belong to this account');
    }
    const title = resolveTitle(input.title, input.text);
    const description = buildDescription(input.text);
    const tags = extractTags(input.text);
    const { content, blobs } = convertContent(input.json, input.text, did, input.images, input.cards);
    const cover = isCoverCandidate(input.cover) ? input.cover : undefined;
    const path = `/${articleRkey}`;

    const record = compact({
        $type: ARTICLE,
        profile: input.publication.uri,
        title,
        createdAt: now,
        path,
        textContent: input.text,
        description: description || undefined,
        tags: tags.length ? tags : undefined,
        category: CHOTTO_CATEGORY,
        content,
        blobs: blobs.length ? blobs : undefined,
        coverImage: cover,
        updatedAt: now,
        labels: input.labels.length ? {
            $type: 'com.atproto.label.defs#selfLabels',
            values: input.labels.map(val => ({ val })),
        } : undefined,
        via: CHOTTO_VIA,
    });

    const site = isOwnStandardPublication(input.publication.standardPublication, did) ? input.publication.standardPublication : undefined;
    const document = site ? (bskyPostRef: { uri: string; cid: string }): ChottoWrite => ({
        $type: CREATE,
        collection: STANDARD_DOCUMENT,
        rkey: articleRkey,
        value: compact({
            $type: STANDARD_DOCUMENT,
            site,
            title,
            publishedAt: now,
            path,
            description: description || undefined,
            coverImage: cover,
            textContent: input.text,
            bskyPostRef: { uri: bskyPostRef.uri, cid: bskyPostRef.cid },
            tags: tags.length ? tags : undefined,
            updatedAt: now,
        }),
    }) : undefined;

    return {
        write: { $type: CREATE, collection: ARTICLE, rkey: articleRkey, value: record },
        document,
        uri: `at://${did}/${ARTICLE}/${articleRkey}`,
        record,
        url: articleUrl(handle, articleRkey),
        title,
        description,
    };
}

const TOKEN_HEAD = /(^|\s)(https?:\/\/\S*|[@#＃]\S*)$/u;

type AnnouncementPiece =
    | { kind: 'paragraph' }
    | { kind: 'break' }
    | { kind: 'text'; text: string }
    | { kind: 'atom'; text: string; node: Record<string, unknown> };

export type AnnouncementDoc = { type: 'doc'; content: Record<string, unknown>[] };

export type Announcement = { text: string; json: AnnouncementDoc };

function graphemeCount(text: string): number {
    let count = 0;
    for (const _ of segmenter.segment(text)) count++;
    return count;
}

function announcementPieces(json: unknown, text: string, linked: boolean): AnnouncementPiece[] {
    const doc: any = (json as any)?.type === 'doc' && Array.isArray((json as any).content) ? json : textToJson(text);
    const pieces: AnnouncementPiece[] = [];
    doc.content.forEach((block: any, index: number) => {
        if (index > 0) pieces.push({ kind: 'paragraph' });
        for (const item of Array.isArray(block?.content) ? block.content : []) {
            if (item?.type === 'hardBreak') {
                pieces.push({ kind: 'break' });
            } else if (item?.type === 'mention' && typeof item.attrs?.id === 'string' && item.attrs.id) {
                pieces.push({ kind: 'atom', text: '@' + item.attrs.id, node: { type: 'mention', attrs: { id: item.attrs.id } } });
            } else if (item?.type === 'text' && typeof item.text === 'string' && item.text) {
                const href = Array.isArray(item.marks) ? item.marks.find((m: any) => m?.type === 'link')?.attrs?.href : undefined;
                if (linked && typeof href === 'string' && href) {
                    pieces.push({ kind: 'atom', text: item.text, node: { type: 'text', text: item.text, marks: [{ type: 'link', attrs: { href } }] } });
                } else {
                    pieces.push({ kind: 'text', text: item.text });
                }
            }
        }
    });
    return pieces;
}

function trimPieces(pieces: AnnouncementPiece[]): AnnouncementPiece[] {
    const out = [...pieces];
    while (out.length) {
        const first = out[0];
        if (first.kind === 'paragraph' || first.kind === 'break') {
            out.shift();
        } else if (first.kind === 'text' && !first.text.trimStart()) {
            out.shift();
        } else {
            if (first.kind === 'text') out[0] = { kind: 'text', text: first.text.trimStart() };
            break;
        }
    }
    while (out.length) {
        const last = out[out.length - 1];
        if (last.kind === 'paragraph' || last.kind === 'break') {
            out.pop();
        } else if (last.kind === 'text' && !last.text.trimEnd()) {
            out.pop();
        } else {
            if (last.kind === 'text') out[out.length - 1] = { kind: 'text', text: last.text.trimEnd() };
            break;
        }
    }
    return out;
}

function pieceLength(piece: AnnouncementPiece): number {
    return piece.kind === 'paragraph' || piece.kind === 'break' ? 1 : graphemeCount(piece.text);
}

function clipPieces(pieces: AnnouncementPiece[], budget: number, wholeTokens: boolean): { pieces: AnnouncementPiece[]; clipped: boolean } {
    const out: AnnouncementPiece[] = [];
    let remaining = budget;
    for (const piece of pieces) {
        const length = pieceLength(piece);
        if (length <= remaining) {
            out.push(piece);
            remaining -= length;
            continue;
        }
        if (piece.kind === 'text' && remaining > 0) {
            let head = clip(piece.text, remaining).text;
            const rest = piece.text.slice(head.length);
            if (wholeTokens && !/^\s/u.test(rest)) {
                const match = head.match(TOKEN_HEAD);
                if (match) head = head.slice(0, match.index! + match[1].length);
            }
            if (head) out.push({ kind: 'text', text: head });
        }
        return { pieces: out, clipped: true };
    }
    return { pieces: out, clipped: false };
}

function piecesToDoc(pieces: AnnouncementPiece[], tail: string): AnnouncementDoc {
    const paragraphs: Record<string, unknown>[][] = [[]];
    for (const piece of pieces) {
        if (piece.kind === 'paragraph') {
            paragraphs.push([]);
        } else if (piece.kind === 'break') {
            paragraphs[paragraphs.length - 1].push({ type: 'hardBreak' });
        } else if (piece.kind === 'text') {
            paragraphs[paragraphs.length - 1].push({ type: 'text', text: piece.text });
        } else {
            paragraphs[paragraphs.length - 1].push(piece.node);
        }
    }
    if (tail) paragraphs[paragraphs.length - 1].push({ type: 'text', text: tail });
    return { type: 'doc', content: paragraphs.map(content => content.length ? { type: 'paragraph', content } : { type: 'paragraph' }) };
}

export function buildAnnouncement(json: unknown, text: string, reserve = 0): Announcement {
    const budget = ANNOUNCE_MAX - 1 - reserve;
    let pieces = trimPieces(announcementPieces(json, text, true));
    let result = clipPieces(pieces, budget, true);
    if (result.clipped && !trimPieces(result.pieces).length) {
        pieces = trimPieces(announcementPieces(json, text, false));
        result = clipPieces(pieces, budget, false);
    }
    const doc = piecesToDoc(trimPieces(result.pieces), result.clipped || reserve ? ELLIPSIS : '');
    return { text: jsonToText(doc), json: doc };
}

export function announcementText(text: string, reserve = 0): string {
    return buildAnnouncement(undefined, text, reserve).text;
}

export type ChottoPreview = { title: string; chars: number; images: number; excerpt: string; more: string };

export function chottoMoreLabel(langs: readonly string[]): string {
    return /^ja(?:-|$)/i.test(langs[0] ?? '') ? 'もっと見る' : 'Show more';
}

export type ChottoRef = { uri: string; cid: string };

const ARTICLE_URI = /^at:\/\/(did:[a-z]+:[a-zA-Z0-9._:%-]+)\/site\.mochott\.article\/([a-zA-Z0-9._~:-]{1,512})$/;

export function readChottoRef(record: unknown, authorDid: string | undefined): ChottoRef | null {
    const raw = (record as Record<string, unknown> | undefined)?.[LONG_POST_FIELD] as Record<string, unknown> | undefined;
    if (!raw || typeof raw !== 'object' || !authorDid) return null;
    if (typeof raw.uri !== 'string' || typeof raw.cid !== 'string') return null;
    const match = raw.uri.match(ARTICLE_URI);
    if (!match || match[1] !== authorDid) return null;
    return { uri: raw.uri, cid: raw.cid };
}

export function chottoRefRkey(ref: ChottoRef): string {
    return ref.uri.slice(ref.uri.lastIndexOf('/') + 1);
}

export type ChottoBodyInline = { kind: 'text'; text: string; href?: string } | { kind: 'break' };

export type ChottoBodyBlock =
    | { kind: 'paragraph'; inlines: ChottoBodyInline[] }
    | { kind: 'image'; src: string; alt: string; width?: number; height?: number }
    | { kind: 'card'; url: string; title?: string };

export function parseChottoBody(contentJSON: unknown, did: string): ChottoBodyBlock[] | null {
    const doc = contentJSON as any;
    if (doc?.type !== 'doc' || !Array.isArray(doc.content)) return null;
    const imagePrefix = `/api/image/${did}/`;
    const blocks: ChottoBodyBlock[] = [];

    for (const block of doc.content) {
        if (block?.type === 'paragraph') {
            const inlines: ChottoBodyInline[] = [];
            for (const item of Array.isArray(block.content) ? block.content : []) {
                if (item?.type === 'hardBreak') {
                    inlines.push({ kind: 'break' });
                } else if (item?.type === 'text' && typeof item.text === 'string') {
                    const marks = Array.isArray(item.marks) ? item.marks : [];
                    if (marks.some((m: any) => m?.type !== 'link')) return null;
                    const href = marks.find((m: any) => m?.type === 'link')?.attrs?.href;
                    if (marks.length && !isHttpUrl(href)) return null;
                    inlines.push(href ? { kind: 'text', text: item.text, href } : { kind: 'text', text: item.text });
                } else {
                    return null;
                }
            }
            blocks.push({ kind: 'paragraph', inlines });
        } else if (block?.type === 'image') {
            const src = block.attrs?.src;
            if (typeof src !== 'string' || !src.startsWith(imagePrefix) || src.slice(imagePrefix.length).includes('/')) return null;
            blocks.push({
                kind: 'image',
                src: MOCHOTT_ORIGIN + src,
                alt: typeof block.attrs.alt === 'string' ? block.attrs.alt : '',
                width: positiveInt(block.attrs.width),
                height: positiveInt(block.attrs.height),
            });
        } else if (block?.type === 'linkCard') {
            if (!isHttpUrl(block.attrs?.url)) return null;
            const title = typeof block.attrs.title === 'string' && block.attrs.title ? block.attrs.title : undefined;
            blocks.push(title ? { kind: 'card', url: block.attrs.url, title } : { kind: 'card', url: block.attrs.url });
        } else if (block?.type === 'embed') {
            if (block.attrs?.service !== 'bluesky' || typeof block.attrs.src !== 'string' || !block.attrs.src.startsWith('https://bsky.app/')) return null;
            blocks.push({ kind: 'card', url: block.attrs.src });
        } else {
            return null;
        }
    }

    return blocks;
}

export type ChottoRun =
    | { kind: 'text'; segments: { text: string; href?: string }[] }
    | { kind: 'image'; src: string; alt: string; width?: number; height?: number }
    | { kind: 'card'; url: string; title?: string };

export function groupChottoBody(blocks: ChottoBodyBlock[]): ChottoRun[] {
    const runs: ChottoRun[] = [];
    let current: { text: string; href?: string }[] | null = null;

    for (const block of blocks) {
        if (block.kind !== 'paragraph') {
            current = null;
            runs.push(block);
            continue;
        }
        if (current) {
            current.push({ text: '\n' });
        } else {
            current = [];
            runs.push({ kind: 'text', segments: current });
        }
        for (const inline of block.inlines) {
            current.push(inline.kind === 'break' ? { text: '\n' } : inline.href ? { text: inline.text, href: inline.href } : { text: inline.text });
        }
    }

    for (const run of runs) {
        if (run.kind !== 'text') continue;
        while (run.segments.length && !run.segments[run.segments.length - 1].href && run.segments[run.segments.length - 1].text === '\n') {
            run.segments.pop();
        }
    }

    return runs.filter(run => run.kind !== 'text' || run.segments.length > 0);
}

export type ChottoFacet = { index: { byteStart: number; byteEnd: number }; features: { $type?: string; uri?: string }[] };

type ChottoSegment = { text: string; href?: string };
type ChottoTextRecord = { text: string; facets?: ChottoFacet[] };

export function chottoSegmentsToRecord(segments: ChottoSegment[]): ChottoTextRecord {
    let text = '';
    let bytes = 0;
    const facets: ChottoFacet[] = [];
    for (const segment of segments) {
        const length = utf8Length(segment.text);
        if (segment.href) {
            facets.push({ index: { byteStart: bytes, byteEnd: bytes + length }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: segment.href }] });
        }
        text += segment.text;
        bytes += length;
    }
    return facets.length ? { text, facets } : { text };
}

export function chottoRecordToSegments(record: ChottoTextRecord): ChottoSegment[] {
    const unicode = new UnicodeString(record.text);
    const links = (record.facets ?? [])
        .map(facet => ({ index: facet.index, uri: facet.features?.find(f => f?.$type === 'app.bsky.richtext.facet#link')?.uri }))
        .filter((link): link is { index: ChottoFacet['index']; uri: string } => typeof link.uri === 'string')
        .sort((a, b) => a.index.byteStart - b.index.byteStart);
    const segments: ChottoSegment[] = [];
    let cursor = 0;
    for (const link of links) {
        if (link.index.byteStart < cursor) continue;
        if (link.index.byteStart > cursor) segments.push({ text: unicode.slice(cursor, link.index.byteStart) });
        segments.push({ text: unicode.slice(link.index.byteStart, link.index.byteEnd), href: link.uri });
        cursor = link.index.byteEnd;
    }
    if (cursor < unicode.length) segments.push({ text: unicode.slice(cursor) });
    return segments;
}

export async function translateChottoRuns(
    runs: ChottoRun[],
    translate: (record: ChottoTextRecord) => Promise<ChottoTextRecord | null | undefined>,
): Promise<ChottoRun[] | null> {
    const texts = runs.filter((run): run is Extract<ChottoRun, { kind: 'text' }> => run.kind === 'text');
    const results = await Promise.all(texts.map(run => translate(chottoSegmentsToRecord(run.segments))));
    if (!results.length || results.some(result => !result)) return null;
    return results.map(result => ({ kind: 'text', segments: chottoRecordToSegments(result!) }));
}

export function appendChottoLink<F>(text: string, facets: F[] | undefined, label: string, uri: string): { text: string; facets: (F | ChottoFacet)[] } {
    const byteStart = utf8Length(text);
    return {
        text: text + label,
        facets: [
            ...(facets ?? []),
            {
                index: { byteStart, byteEnd: byteStart + utf8Length(label) },
                features: [{ $type: 'app.bsky.richtext.facet#link', uri }],
            },
        ],
    };
}

export function stripChottoLink<T extends { text?: string; facets?: ChottoFacet[] }>(record: T, rkey: string): { record: T; url: string } | null {
    const text = typeof record?.text === 'string' ? record.text : '';
    if (!text || !Array.isArray(record.facets)) return null;
    const unicode = new UnicodeString(text);
    const end = unicode.length;
    let url = '';
    const tail = record.facets.find(facet => {
        if (facet?.index?.byteEnd !== end) return false;
        const link = facet.features?.find(f => f?.$type === 'app.bsky.richtext.facet#link');
        if (typeof link?.uri !== 'string' || !link.uri.startsWith(MOCHOTT_ORIGIN + '/') || !link.uri.endsWith('/' + rkey)) return false;
        url = link.uri;
        return true;
    });
    if (!tail) return null;
    return {
        record: { ...record, text: unicode.slice(0, tail.index.byteStart), facets: record.facets.filter(facet => facet !== tail) },
        url,
    };
}

function collectBlobCids(value: unknown, out: Set<string>) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        for (const item of value) collectBlobCids(item, out);
        return;
    }
    const obj = value as Record<string, any>;
    if (obj.$type === 'blob' && typeof obj.ref?.$link === 'string') {
        out.add(obj.ref.$link);
        return;
    }
    for (const key of Object.keys(obj)) collectBlobCids(obj[key], out);
}

function embedUrls(embed: unknown): Set<string> {
    const { media, record } = embedParts(embed);
    const urls = new Set<string>();
    if (media?.$type === 'app.bsky.embed.external' && typeof media.external?.uri === 'string') urls.add(media.external.uri);
    const recordUrl = bskyRecordUrl(record?.uri);
    if (recordUrl) urls.add(recordUrl);
    return urls;
}

export function withoutPostEmbeds(runs: ChottoRun[], embed: unknown): ChottoRun[] {
    const cids = new Set<string>();
    collectBlobCids(embed, cids);
    const urls = embedUrls(embed);
    if (!cids.size && !urls.size) return runs;
    return runs.filter(run => {
        if (run.kind === 'image') return !cids.has(run.src.slice(run.src.lastIndexOf('/') + 1));
        if (run.kind === 'card') return !urls.has(run.url);
        return true;
    });
}

export function findCidMismatches(results: unknown, expected: { uri: string; cid: string }[]): string[] {
    if (!Array.isArray(results)) return [];
    const written = new Map<string, unknown>();
    for (const result of results) {
        if (result && typeof result.uri === 'string') written.set(result.uri, result.cid);
    }
    return expected.filter(ref => written.has(ref.uri) && written.get(ref.uri) !== ref.cid).map(ref => ref.uri);
}

function isOwnMochottPublication(uri: string, did: string): boolean {
    return uri === `at://${did}/${PROFILE}/self` || uri === `at://${did}/${STANDARD_PUBLICATION}/self`;
}

export function isOwnStandardPublication(uri: unknown, did: string): uri is string {
    const prefix = `at://${did}/${STANDARD_PUBLICATION}/`;
    return typeof uri === 'string' && uri.startsWith(prefix) && /^[A-Za-z0-9._~:-]{1,512}$/.test(uri.slice(prefix.length));
}

export function longPostDeleteTargets(record: unknown, authorDid: string): { collection: string; rkey: string }[] {
    const ref = readChottoRef(record, authorDid);
    if (!ref) return [];
    const rkey = chottoRefRkey(ref);
    return [
        { collection: ARTICLE, rkey },
        { collection: STANDARD_DOCUMENT, rkey },
    ];
}

const PROFILE_LINK = /^https:\/\/bsky\.app\/profile\/([^/?#]+)$/;

export function chottoBodyToEditorHtml(blocks: ChottoBodyBlock[]): string {
    const paragraphs = blocks.filter(block => block.kind === 'paragraph') as Extract<ChottoBodyBlock, { kind: 'paragraph' }>[];
    return paragraphs.map(paragraph => paragraph.inlines.map(inline => {
        if (inline.kind === 'break') return '<br>';
        const mention = inline.href?.match(PROFILE_LINK);
        if (mention && inline.text === '@' + mention[1]) {
            return `<span class="editor-mention" data-type="mention" data-id="${escapeHtml(mention[1])}">${escapeHtml(inline.text)}</span>`;
        }
        if (inline.href) {
            return `<a href="${escapeHtml(inline.href)}">${escapeHtml(inline.text)}</a>`;
        }
        return escapeHtml(inline.text);
    }).join('')).join('<br>');
}

export function chottoBodyToPlainText(blocks: ChottoBodyBlock[]): string {
    return blocks
        .filter(block => block.kind === 'paragraph')
        .map(block => (block as Extract<ChottoBodyBlock, { kind: 'paragraph' }>).inlines.map(inline => inline.kind === 'break' ? '\n' : inline.text).join(''))
        .join('\n');
}
