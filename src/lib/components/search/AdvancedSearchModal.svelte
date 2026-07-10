<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { onMount, onDestroy } from 'svelte';
    import { goto } from '$app/navigation';
    import { watch } from 'runed';
    import UserPlus from '@lucide/svelte/icons/user-plus';
    import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import ActorMultiSelect from '$lib/components/chat/ActorMultiSelect.svelte';
    import TokenInput from '$lib/components/search/TokenInput.svelte';
    import LanguageMultiSelect from '$lib/components/search/LanguageMultiSelect.svelte';
    import PostUriInput from '$lib/components/search/PostUriInput.svelte';
    import { buildSearchQuery, type ParsedSearch } from '$lib/search/searchParams';
    import { searchHistory } from '$lib/classes/searchHistory.svelte';
    import { RANGE_PRESETS, presetSince, toDateInputValue, type RangePreset } from '$lib/search/dateRange';
    import { getDidByHandle } from '$lib/util';
    import type { searchFilters } from '$lib/types/column';

    let { _agent, initial, onclose, onapply = undefined }: { _agent: any, initial: ParsedSearch, onclose: () => void, onapply?: (parsed: ParsedSearch) => void } = $props();

    const f = initial.filters;

    let query = $state(initial.query);
    let sort = $state<'top' | 'latest'>(initial.sort);
    let authors = $state<any[]>([]);
    let mentions = $state<any[]>([]);
    let excludeAuthors = $state<any[]>([]);
    let excludeMentions = $state<any[]>([]);
    let hashtags = $state<string[]>(f.hashtags ? [...f.hashtags] : []);
    let excludeHashtags = $state<string[]>(f.excludeHashtags ? [...f.excludeHashtags] : []);
    let domains = $state<string[]>(f.domains ? [...f.domains] : []);
    let excludeDomains = $state<string[]>(f.excludeDomains ? [...f.excludeDomains] : []);
    let urls = $state<string[]>(f.urls ? [...f.urls] : []);
    let excludeUrls = $state<string[]>(f.excludeUrls ? [...f.excludeUrls] : []);
    let languages = $state<string[]>(f.languages ? [...f.languages] : []);
    let excludeLanguages = $state<string[]>(f.excludeLanguages ? [...f.excludeLanguages] : []);
    let embeddedAtUris = $state<string[]>(f.embeddedAtUris ? [...f.embeddedAtUris] : []);
    let excludeEmbeddedAtUris = $state<string[]>(f.excludeEmbeddedAtUris ? [...f.excludeEmbeddedAtUris] : []);
    let hasMedia = $state(!!f.hasMedia);
    let hasVideo = $state(!!f.hasVideo);
    let following = $state(!!f.following);
    let replyMode = $state<'all' | 'exclude' | 'only'>(f.repliesOnly ? 'only' : (f.excludeReplies ? 'exclude' : 'all'));
    let since = $state(f.since || '');
    let until = $state(f.until || '');
    let allTime = $state(f.allTime ?? true);

    function fallbackActor(id: string) {
        return { did: id, handle: id };
    }

    onMount(async () => {
        try {
            const wanted = [...(f.authors || []), ...(f.mentions || []), ...(f.excludeAuthors || []), ...(f.excludeMentions || [])];
            if (!wanted.length) return;
            const chunks: string[][] = [];
            for (let i = 0; i < wanted.length; i += 25) {
                chunks.push(wanted.slice(i, i + 25));
            }
            const results = await Promise.all(chunks.map(actors => _agent.xrpc.get('app.bsky.actor.getProfiles', { actors })));
            const byId = new Map<string, any>();
            for (const res of results) {
                for (const p of res.profiles || []) {
                    byId.set(p.handle, p);
                    byId.set(p.did, p);
                }
            }
            authors = (f.authors || []).map(a => byId.get(a) ?? fallbackActor(a));
            mentions = (f.mentions || []).map(a => byId.get(a) ?? fallbackActor(a));
            excludeAuthors = (f.excludeAuthors || []).map(a => byId.get(a) ?? fallbackActor(a));
            excludeMentions = (f.excludeMentions || []).map(a => byId.get(a) ?? fallbackActor(a));
        } catch (e) {
            console.error(e);
        }
    });

    async function addMe() {
        const did = _agent.did();
        if (authors.some(a => a.did === did)) return;
        let me = { did, handle: _agent.handle() };
        try {
            me = await _agent.getProfile(did);
        } catch (e) {
            console.error(e);
        }
        if (authors.some(a => a.did === did)) return;
        authors = [...authors, me];
    }

    function handleReset() {
        query = '';
        sort = 'latest';
        authors = [];
        mentions = [];
        excludeAuthors = [];
        excludeMentions = [];
        hashtags = [];
        excludeHashtags = [];
        domains = [];
        excludeDomains = [];
        urls = [];
        excludeUrls = [];
        languages = [];
        excludeLanguages = [];
        embeddedAtUris = [];
        excludeEmbeddedAtUris = [];
        hasMedia = false;
        hasVideo = false;
        following = false;
        replyMode = 'all';
        since = '';
        until = '';
        allTime = true;
    }

    function actorIds(actors: any[]): string[] {
        return actors.map(a => a.handle || a.did).filter(Boolean);
    }

    function buildFilters(): searchFilters {
        const filters: searchFilters = {};
        const authorIds = actorIds(authors);
        const mentionIds = actorIds(mentions);
        const excludeAuthorIds = actorIds(excludeAuthors);
        const excludeMentionIds = actorIds(excludeMentions);

        if (authorIds.length) filters.authors = authorIds;
        if (mentionIds.length) filters.mentions = mentionIds;
        if (excludeAuthorIds.length) filters.excludeAuthors = excludeAuthorIds;
        if (excludeMentionIds.length) filters.excludeMentions = excludeMentionIds;
        if (hashtags.length) filters.hashtags = hashtags;
        if (excludeHashtags.length) filters.excludeHashtags = excludeHashtags;
        if (domains.length) filters.domains = domains;
        if (excludeDomains.length) filters.excludeDomains = excludeDomains;
        if (urls.length) filters.urls = urls;
        if (excludeUrls.length) filters.excludeUrls = excludeUrls;
        if (languages.length) filters.languages = languages;
        if (excludeLanguages.length) filters.excludeLanguages = excludeLanguages;
        if (embeddedAtUris.length) filters.embeddedAtUris = embeddedAtUris;
        if (excludeEmbeddedAtUris.length) filters.excludeEmbeddedAtUris = excludeEmbeddedAtUris;
        if (hasMedia) filters.hasMedia = true;
        if (hasVideo) filters.hasVideo = true;
        if (following) filters.following = true;
        if (replyMode === 'exclude') filters.excludeReplies = true;
        if (replyMode === 'only') filters.repliesOnly = true;
        if (since) filters.since = since;
        if (until) filters.until = until;
        if (!allTime) filters.allTime = false;

        return filters;
    }

    function handleApply() {
        const parsed: ParsedSearch = { query: query.trim(), sort, filters: buildFilters() };
        if (onapply) {
            onapply(parsed);
            onclose();
            return;
        }
        const canonical = buildSearchQuery(parsed);
        searchHistory.add('posts', canonical);
        onclose();
        goto('/search?' + canonical);
    }

    function stripHash(value: string): string {
        return value.replace(/^#/, '');
    }

    const today = toDateInputValue(new Date());

    function applyRangePreset(preset: RangePreset) {
        since = presetSince(preset);
        until = '';
    }

    function isPresetActive(preset: RangePreset): boolean {
        return !until && since === presetSince(preset);
    }

    let previewCount = $state<number | undefined>(undefined);
    let previewStatus = $state<'idle' | 'loading' | 'done' | 'error'>('idle');
    let previewTimer: ReturnType<typeof setTimeout>;
    let previewController: AbortController | undefined;

    const previewKey = $derived(buildSearchQuery({ query: query.trim(), sort: 'latest', filters: buildFilters() }));

    watch(() => previewKey, (key) => {
        clearTimeout(previewTimer);
        previewController?.abort();

        if (!key) {
            previewStatus = 'idle';
            previewCount = undefined;
            return;
        }

        previewStatus = 'loading';
        previewTimer = setTimeout(async () => {
            previewController = new AbortController();
            const signal = previewController.signal;

            try {
                const { allTime: previewAllTime, ...filters } = buildFilters();
                const res = await _agent.xrpc.get('app.bsky.feed.searchPostsV2', {
                    query: query.trim() || undefined,
                    limit: 1,
                    sort: 'recent',
                    allTime: previewAllTime ?? true,
                    ...filters,
                }, { signal });
                previewCount = res.hitsTotal;
                previewStatus = 'done';
            } catch (e: any) {
                if (e?.name === 'AbortError' || signal.aborted) {
                    return;
                }
                previewCount = undefined;
                previewStatus = 'error';
                if (e?.error !== 'BadQueryString') {
                    console.error(e);
                }
            }
        }, 400);
    });

    onDestroy(() => {
        clearTimeout(previewTimer);
        previewController?.abort();
    });
</script>

<Modal title={$_('search_advanced')} size="normal" {onclose}>
    <div class="advanced-search">
        <div class="advanced-search__field">
            <label class="advanced-search__label" for="advanced-search-query">{$_('search_keywords')}</label>
            <input id="advanced-search-query" type="text" class="advanced-search__text" bind:value={query} placeholder={$_('search_keywords')} autocomplete="off">
        </div>

        <section class="advanced-search__section" aria-label={$_('search_section_accounts')}>
            <h3 class="advanced-search__heading">{$_('search_section_accounts')}</h3>

            <div class="advanced-search__field">
                <p class="advanced-search__label">
                    <span>{$_('search_filter_authors')}</span>
                    <button type="button" class="advanced-search__chip-action" onclick={addMe}>
                        <UserPlus size="15"></UserPlus>
                        {$_('search_filter_own_posts')}
                    </button>
                </p>
                <ActorMultiSelect {_agent} bind:selected={authors} bind:excluded={excludeAuthors} negatable allowSelf ariaLabel={$_('search_filter_authors')}></ActorMultiSelect>
            </div>

            <div class="advanced-search__field">
                <p class="advanced-search__label">{$_('search_filter_mentions')}</p>
                <ActorMultiSelect {_agent} bind:selected={mentions} bind:excluded={excludeMentions} negatable allowSelf ariaLabel={$_('search_filter_mentions')}></ActorMultiSelect>
            </div>

            <label class="advanced-search__toggle">
                <span>{$_('search_filter_following')}</span>
                <span class="input-toggle">
                    <input class="input-toggle__input" type="checkbox" bind:checked={following}>
                    <span class="input-toggle__label"></span>
                </span>
            </label>
        </section>

        <section class="advanced-search__section" aria-label={$_('search_section_content')}>
            <h3 class="advanced-search__heading">{$_('search_section_content')}</h3>

            <div class="advanced-search__field">
                <p class="advanced-search__label">{$_('search_filter_hashtags')}</p>
                <TokenInput bind:tokens={hashtags} bind:excludedTokens={excludeHashtags} negatable placeholder="bluesky" transform={stripHash} ariaLabel={$_('search_filter_hashtags')}></TokenInput>
            </div>

            <div class="advanced-search__field">
                <p class="advanced-search__label">{$_('search_filter_domains')}</p>
                <TokenInput bind:tokens={domains} bind:excludedTokens={excludeDomains} negatable placeholder="example.com" ariaLabel={$_('search_filter_domains')}></TokenInput>
            </div>

            <div class="advanced-search__field">
                <p class="advanced-search__label">{$_('search_filter_urls')}</p>
                <TokenInput bind:tokens={urls} bind:excludedTokens={excludeUrls} negatable placeholder="https://example.com/..." ariaLabel={$_('search_filter_urls')}></TokenInput>
            </div>

            <div class="advanced-search__field">
                <p class="advanced-search__label">{$_('search_filter_quote')}</p>
                <PostUriInput bind:uris={embeddedAtUris} bind:excludedUris={excludeEmbeddedAtUris} negatable resolveDid={(h) => getDidByHandle(h, _agent)} placeholder={$_('search_filter_quote_placeholder')} ariaLabel={$_('search_filter_quote')}></PostUriInput>
            </div>

            <div class="advanced-search__field">
                <p class="advanced-search__label">{$_('search_filter_languages')}</p>
                <LanguageMultiSelect bind:selected={languages} bind:excluded={excludeLanguages} negatable placeholder={$_('search_language_search_placeholder')} ariaLabel={$_('search_filter_languages')}></LanguageMultiSelect>
            </div>

            <div class="advanced-search__field">
                <p class="advanced-search__label" id="advanced-search-replies-label">{$_('search_filter_replies')}</p>
                <div class="segment" role="group" aria-labelledby="advanced-search-replies-label">
                    <button type="button" class={['segment__item', replyMode === 'all' && 'segment__item--on']} aria-pressed={replyMode === 'all'} onclick={() => replyMode = 'all'}>{$_('search_filter_replies_all')}</button>
                    <button type="button" class={['segment__item', replyMode === 'exclude' && 'segment__item--on']} aria-pressed={replyMode === 'exclude'} onclick={() => replyMode = 'exclude'}>{$_('search_filter_exclude_replies')}</button>
                    <button type="button" class={['segment__item', replyMode === 'only' && 'segment__item--on']} aria-pressed={replyMode === 'only'} onclick={() => replyMode = 'only'}>{$_('search_filter_replies_only')}</button>
                </div>
            </div>

            <div class="advanced-search__toggles">
                <label class="advanced-search__toggle">
                    <span>{$_('search_filter_media_only')}</span>
                    <span class="input-toggle">
                        <input class="input-toggle__input" type="checkbox" bind:checked={hasMedia}>
                        <span class="input-toggle__label"></span>
                    </span>
                </label>

                <label class="advanced-search__toggle">
                    <span>{$_('search_filter_video_only')}</span>
                    <span class="input-toggle">
                        <input class="input-toggle__input" type="checkbox" bind:checked={hasVideo}>
                        <span class="input-toggle__label"></span>
                    </span>
                </label>
            </div>
        </section>

        <section class="advanced-search__section" aria-label={$_('search_section_period')}>
            <h3 class="advanced-search__heading">{$_('search_section_period')}</h3>

            <div class="advanced-search__presets" role="group" aria-label={$_('search_filter_range')}>
                {#each RANGE_PRESETS as preset (preset)}
                    <button type="button" class={['advanced-search__preset', isPresetActive(preset) && 'advanced-search__preset--on']} aria-pressed={isPresetActive(preset)} onclick={() => applyRangePreset(preset)}>{$_('search_range_' + preset)}</button>
                {/each}
            </div>

            <div class="advanced-search__field advanced-search__dates">
                <div>
                    <label class="advanced-search__label" for="advanced-search-since">{$_('search_filter_since')}</label>
                    <input id="advanced-search-since" type="date" class="advanced-search__text" bind:value={since} max={until || today}>
                </div>
                <div>
                    <label class="advanced-search__label" for="advanced-search-until">{$_('search_filter_until')}</label>
                    <input id="advanced-search-until" type="date" class="advanced-search__text" bind:value={until} min={since || undefined} max={today}>
                </div>
            </div>

            <div class="advanced-search__field">
                <p class="advanced-search__label" id="advanced-search-range-label">{$_('search_filter_range')}</p>
                <div class="segment" role="group" aria-labelledby="advanced-search-range-label">
                    <button type="button" class={['segment__item', allTime && 'segment__item--on']} aria-pressed={allTime} onclick={() => allTime = true}>{$_('search_filter_all_time')}</button>
                    <button type="button" class={['segment__item', !allTime && 'segment__item--on']} aria-pressed={!allTime} onclick={() => allTime = false}>{$_('search_filter_recent_only')}</button>
                </div>
            </div>
        </section>
    </div>

    {#snippet footer()}
        <div class="advanced-search-footer">
            <div class="segment" role="group" aria-label={$_('search_sort')}>
                <button type="button" class={['segment__item', sort === 'latest' && 'segment__item--on']} aria-pressed={sort === 'latest'} onclick={() => sort = 'latest'}>{$_('search_sort_latest')}</button>
                <button type="button" class={['segment__item', sort === 'top' && 'segment__item--on']} aria-pressed={sort === 'top'} onclick={() => sort = 'top'}>{$_('search_sort_top')}</button>
            </div>

            <span class="advanced-search-footer__preview" aria-live="polite">
                {#if previewStatus === 'loading'}
                    <LoadingSpinner size={16} padding={0}></LoadingSpinner>
                {:else if previewStatus === 'error'}
                    <span class="advanced-search-footer__preview-error">{$_('search_preview_error')}</span>
                {:else if previewStatus === 'done' && previewCount != null}
                    {$_('search_hits_preview', {count: previewCount.toLocaleString()})}
                {/if}
            </span>

            <div class="advanced-search-footer__buttons">
                <button type="button" class="button button--sm button--border" onclick={handleReset}>{$_('search_reset')}</button>
                <button type="button" class="button button--sm" onclick={handleApply}>{$_('search')}</button>
            </div>
        </div>
    {/snippet}
</Modal>

<style lang="postcss">
    .advanced-search {
        display: flex;
        flex-direction: column;
        gap: 20px;

        &__field {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        &__label {
            font-size: 14px;
            font-weight: bold;
            letter-spacing: .025em;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin: 0;
        }

        &__chip-action {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 13px;
            font-weight: normal;
            color: var(--primary-color);

            &:hover {
                text-decoration: underline;
            }
        }

        &__text {
            height: 40px;
            padding: 0 16px;
            border: 1px solid var(--border-color-1);
            background-color: var(--bg-color-2);
            color: var(--text-color-1);
            border-radius: var(--border-radius-3);
            width: 100%;
            outline: none;

            &:focus-visible {
                border-color: var(--primary-color);
            }
        }

        &__dates {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;

            div {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            @media (max-width: 767px) {
                grid-template-columns: 1fr;
            }
        }

        &__section {
            display: flex;
            flex-direction: column;
            gap: 16px;
            padding-top: 20px;
            border-top: 1px solid var(--border-color-1);
        }

        &__presets {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }

        &__preset {
            height: 32px;
            padding: 0 14px;
            border: 1px solid var(--border-color-1);
            background-color: var(--bg-color-2);
            border-radius: 16px;
            font-size: 13px;
            color: var(--text-color-1);

            &:hover {
                border-color: var(--primary-color);
            }

            &--on {
                background-color: var(--primary-color);
                border-color: var(--primary-color);
                color: #fff;
            }
        }

        &__heading {
            font-size: 15px;
            font-weight: bold;
            letter-spacing: .05em;
            margin: 0;
        }

        &__toggles {
            display: flex;
            flex-direction: column;
        }

        &__toggle {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            font-size: 14px;
            cursor: pointer;
            padding: 8px 0;
        }

        .segment {
            @media (max-width: 767px) {
                flex-wrap: wrap;
            }
        }
    }

    .advanced-search-footer {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;

        &__preview {
            font-size: 13px;
            color: var(--text-color-3);
        }

        &__preview-error {
            color: var(--danger-color);
        }

        &__buttons {
            display: flex;
            gap: 12px;
            margin-left: auto;
        }

        .segment {
            @media (max-width: 767px) {
                flex-wrap: wrap;
            }
        }
    }

</style>
