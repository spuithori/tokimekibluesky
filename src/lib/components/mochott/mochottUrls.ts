import { MOCHOTT_ORIGIN } from './mochottConst';

export interface MochottMinisiteRef {
    slug: string;
    globalSlug?: string | null;
    customDomain?: string | null;
}

export interface MochottArticleRef {
    uri: string;
    slug?: string | null;
    author: { did: string; handle: string };
    minisite?: MochottMinisiteRef | null;
}

export function mochottArticleUrl(article: MochottArticleRef): string {
    const id = article.slug || article.uri.split('/').pop() || '';
    const minisite = article.minisite;
    if (minisite?.customDomain) return `https://${minisite.customDomain}/${id}`;
    if (minisite?.globalSlug) return `${MOCHOTT_ORIGIN}/${minisite.globalSlug}/${id}`;
    if (minisite) return `${MOCHOTT_ORIGIN}/${article.author.handle}/s/${minisite.slug}/${id}`;
    return `${MOCHOTT_ORIGIN}/${article.author.handle}/${id}`;
}

export function mochottMinisiteUrl(handle: string, minisite: MochottMinisiteRef): string {
    if (minisite.customDomain) return `https://${minisite.customDomain}`;
    if (minisite.globalSlug) return `${MOCHOTT_ORIGIN}/${minisite.globalSlug}`;
    return `${MOCHOTT_ORIGIN}/${handle}/s/${minisite.slug}`;
}

export function mochottImageUrl(image: string | null | undefined, did: string): string | null {
    if (!image) return null;
    if (/^https:\/\//.test(image)) return image;
    try {
        const cid = JSON.parse(image)?.ref?.$link;
        return typeof cid === 'string' && cid ? `${MOCHOTT_ORIGIN}/api/image/${did}/${cid}` : null;
    } catch {
        return null;
    }
}
