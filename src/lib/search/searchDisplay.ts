import type { ParsedSearch } from '$lib/search/searchParams';

export type Translator = (key: string, params?: Record<string, unknown>) => string;

export function searchLabel(parsed: ParsedSearch, t: Translator): string {
    return parsed.query || t('search_advanced');
}

export function searchColumnName(parsed: ParsedSearch, t: Translator): string {
    return parsed.query ? `${t('search')} "${parsed.query}"` : t('search_advanced');
}

export function filterChips(parsed: ParsedSearch, t: Translator): string[] {
    const f = parsed.filters;
    const chips: string[] = [];
    if (parsed.sort === 'top') chips.push(t('search_sort_top'));
    if (f.authors?.length) chips.push(`${t('search_filter_authors')}·${f.authors.length}`);
    if (f.excludeAuthors?.length) chips.push(`−${t('search_filter_authors')}·${f.excludeAuthors.length}`);
    if (f.mentions?.length) chips.push(`${t('search_filter_mentions')}·${f.mentions.length}`);
    if (f.excludeMentions?.length) chips.push(`−${t('search_filter_mentions')}·${f.excludeMentions.length}`);
    for (const tag of f.hashtags ?? []) chips.push('#' + tag);
    for (const tag of f.excludeHashtags ?? []) chips.push('−#' + tag);
    if (f.languages?.length) chips.push(`${t('search_filter_languages')}·${f.languages.length}`);
    if (f.excludeLanguages?.length) chips.push(`−${t('search_filter_languages')}·${f.excludeLanguages.length}`);
    if (f.hasMedia) chips.push(t('search_filter_media_only'));
    if (f.hasVideo) chips.push(t('search_filter_video_only'));
    if (f.following) chips.push(t('search_filter_following'));
    if (f.excludeReplies) chips.push(t('search_filter_exclude_replies'));
    if (f.repliesOnly) chips.push(t('search_filter_replies_only'));
    if (f.since || f.until) chips.push(`${f.since ?? ''}〜${f.until ?? ''}`);
    if (f.domains?.length) chips.push(`${t('search_filter_domains')}·${f.domains.length}`);
    if (f.excludeDomains?.length) chips.push(`−${t('search_filter_domains')}·${f.excludeDomains.length}`);
    if (f.urls?.length) chips.push(`${t('search_filter_urls')}·${f.urls.length}`);
    if (f.excludeUrls?.length) chips.push(`−${t('search_filter_urls')}·${f.excludeUrls.length}`);
    if (f.embeddedAtUris?.length) chips.push(`${t('search_filter_quote')}·${f.embeddedAtUris.length}`);
    if (f.excludeEmbeddedAtUris?.length) chips.push(`−${t('search_filter_quote')}·${f.excludeEmbeddedAtUris.length}`);
    return chips;
}
