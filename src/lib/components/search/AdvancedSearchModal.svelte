<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { ChevronDown, UserPlus } from 'lucide-svelte';
    import Modal from '$lib/components/ui/Modal.svelte';
    import ActorMultiSelect from '$lib/components/chat/ActorMultiSelect.svelte';
    import TokenInput from '$lib/components/search/TokenInput.svelte';
    import LanguageMultiSelect from '$lib/components/search/LanguageMultiSelect.svelte';
    import { buildSearchQuery, type ParsedSearch } from '$lib/search/searchParams';
    import { searchHistory } from '$lib/classes/searchHistory.svelte';
    import type { searchFilters } from '$lib/types/column';

    let { _agent, initial, onclose }: { _agent: any, initial: ParsedSearch, onclose: () => void } = $props();

    const f = initial.filters;

    let query = $state(initial.query);
    let sort = $state<'top' | 'latest'>(initial.sort);
    let authors = $state<any[]>([]);
    let mentions = $state<any[]>([]);
    let hashtags = $state<string[]>(f.hashtags ? [...f.hashtags] : []);
    let domains = $state<string[]>(f.domains ? [...f.domains] : []);
    let urls = $state<string[]>(f.urls ? [...f.urls] : []);
    let languages = $state<string[]>(f.languages ? [...f.languages] : []);
    let hasMedia = $state(!!f.hasMedia);
    let hasVideo = $state(!!f.hasVideo);
    let following = $state(!!f.following);
    let replyMode = $state<'all' | 'exclude' | 'only'>(f.repliesOnly ? 'only' : (f.excludeReplies ? 'exclude' : 'all'));
    let since = $state(f.since || '');
    let until = $state(f.until || '');
    let allTime = $state(f.allTime ?? true);

    onMount(async () => {
        try {
            const wanted = [...(f.authors || []), ...(f.mentions || [])];
            if (!wanted.length) return;
            const res = await _agent.xrpc.get('app.bsky.actor.getProfiles', { actors: wanted.slice(0, 25) });
            const byId = new Map<string, any>();
            for (const p of res.profiles || []) {
                byId.set(p.handle, p);
                byId.set(p.did, p);
            }
            authors = (f.authors || []).map(a => byId.get(a)).filter(Boolean);
            mentions = (f.mentions || []).map(a => byId.get(a)).filter(Boolean);
        } catch (e) {
            console.error(e);
        }
    });

    function addMe() {
        const did = _agent.did();
        if (authors.some(a => a.did === did)) return;
        authors = [...authors, { did, handle: _agent.handle() }];
    }

    function handleReset() {
        query = '';
        sort = 'latest';
        authors = [];
        mentions = [];
        hashtags = [];
        domains = [];
        urls = [];
        languages = [];
        hasMedia = false;
        hasVideo = false;
        following = false;
        replyMode = 'all';
        since = '';
        until = '';
        allTime = true;
    }

    function handleApply() {
        const filters: searchFilters = {};
        const authorIds = authors.map(a => a.handle || a.did).filter(Boolean);
        const mentionIds = mentions.map(a => a.handle || a.did).filter(Boolean);

        if (authorIds.length) filters.authors = authorIds;
        if (mentionIds.length) filters.mentions = mentionIds;
        if (hashtags.length) filters.hashtags = hashtags;
        if (domains.length) filters.domains = domains;
        if (urls.length) filters.urls = urls;
        if (languages.length) filters.languages = languages;
        if (hasMedia) filters.hasMedia = true;
        if (hasVideo) filters.hasVideo = true;
        if (following) filters.following = true;
        if (replyMode === 'exclude') filters.excludeReplies = true;
        if (replyMode === 'only') filters.repliesOnly = true;
        if (since) filters.since = since;
        if (until) filters.until = until;
        if (!allTime) filters.allTime = false;

        const canonical = buildSearchQuery({ query: query.trim(), sort, filters });
        searchHistory.add('posts', canonical);
        onclose();
        goto('/search?' + canonical);
    }

    function stripHash(value: string): string {
        return value.replace(/^#/, '');
    }
</script>

<Modal title={$_('search_advanced')} size="normal" {onclose}>
    <div class="advanced-search">
        <div class="advanced-search__field">
            <p class="advanced-search__label">{$_('search_keywords')}</p>
            <input type="text" class="advanced-search__text" bind:value={query} placeholder={$_('search_keywords')} autocomplete="off">
        </div>

        <div class="advanced-search__field">
            <p class="advanced-search__label">
                <span>{$_('search_filter_authors')}</span>
                <button type="button" class="advanced-search__chip-action" onclick={addMe}>
                    <UserPlus size="15"></UserPlus>
                    {$_('search_filter_own_posts')}
                </button>
            </p>
            <ActorMultiSelect {_agent} bind:selected={authors}></ActorMultiSelect>
        </div>

        <div class="advanced-search__field advanced-search__dates">
            <div>
                <p class="advanced-search__label">{$_('search_filter_since')}</p>
                <input type="date" class="advanced-search__text" bind:value={since}>
            </div>
            <div>
                <p class="advanced-search__label">{$_('search_filter_until')}</p>
                <input type="date" class="advanced-search__text" bind:value={until}>
            </div>
        </div>

        <div class="advanced-search__field">
            <p class="advanced-search__label">{$_('search_sort')}</p>
            <div class="segment">
                <button type="button" class="segment__item" class:segment__item--on={sort === 'latest'} onclick={() => sort = 'latest'}>{$_('search_sort_latest')}</button>
                <button type="button" class="segment__item" class:segment__item--on={sort === 'top'} onclick={() => sort = 'top'}>{$_('search_sort_top')}</button>
            </div>
        </div>

        <details class="advanced-search__details">
            <summary class="advanced-search__summary">
                <ChevronDown size="18" class="advanced-search__chevron"></ChevronDown>
                {$_('search_advanced_details')}
            </summary>

            <div class="advanced-search__details-body">
                <div class="advanced-search__field">
                    <p class="advanced-search__label">{$_('search_filter_mentions')}</p>
                    <ActorMultiSelect {_agent} bind:selected={mentions}></ActorMultiSelect>
                </div>

                <div class="advanced-search__field">
                    <p class="advanced-search__label">{$_('search_filter_hashtags')}</p>
                    <TokenInput bind:tokens={hashtags} placeholder="bluesky" transform={stripHash}></TokenInput>
                </div>

                <div class="advanced-search__field">
                    <p class="advanced-search__label">{$_('search_filter_domains')}</p>
                    <TokenInput bind:tokens={domains} placeholder="example.com"></TokenInput>
                </div>

                <div class="advanced-search__field">
                    <p class="advanced-search__label">{$_('search_filter_urls')}</p>
                    <TokenInput bind:tokens={urls} placeholder="https://example.com/..."></TokenInput>
                </div>

                <div class="advanced-search__field">
                    <p class="advanced-search__label">{$_('search_filter_languages')}</p>
                    <LanguageMultiSelect bind:selected={languages} placeholder={$_('search_language_search_placeholder')}></LanguageMultiSelect>
                </div>

                <div class="advanced-search__field">
                    <p class="advanced-search__label">{$_('search_filter_replies')}</p>
                    <div class="segment">
                        <button type="button" class="segment__item" class:segment__item--on={replyMode === 'all'} onclick={() => replyMode = 'all'}>{$_('search_filter_replies_all')}</button>
                        <button type="button" class="segment__item" class:segment__item--on={replyMode === 'exclude'} onclick={() => replyMode = 'exclude'}>{$_('search_filter_exclude_replies')}</button>
                        <button type="button" class="segment__item" class:segment__item--on={replyMode === 'only'} onclick={() => replyMode = 'only'}>{$_('search_filter_replies_only')}</button>
                    </div>
                </div>

                <div class="advanced-search__field">
                    <p class="advanced-search__label">{$_('search_filter_range')}</p>
                    <div class="segment">
                        <button type="button" class="segment__item" class:segment__item--on={allTime} onclick={() => allTime = true}>{$_('search_filter_all_time')}</button>
                        <button type="button" class="segment__item" class:segment__item--on={!allTime} onclick={() => allTime = false}>{$_('search_filter_recent_only')}</button>
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

                    <label class="advanced-search__toggle">
                        <span>{$_('search_filter_following')}</span>
                        <span class="input-toggle">
                            <input class="input-toggle__input" type="checkbox" bind:checked={following}>
                            <span class="input-toggle__label"></span>
                        </span>
                    </label>
                </div>
            </div>
        </details>

        <div class="advanced-search__actions">
            <button type="button" class="button button--sm button--border" onclick={handleReset}>{$_('search_reset')}</button>
            <button type="button" class="button button--sm" onclick={handleApply}>{$_('search')}</button>
        </div>
    </div>
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
        }

        &__details {
            border: 1px solid var(--border-color-1);
            border-radius: var(--border-radius-3);
            overflow: hidden;
        }

        &__summary {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 14px 16px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            list-style: none;
            user-select: none;

            &::-webkit-details-marker {
                display: none;
            }

            :global(.advanced-search__chevron) {
                transition: transform .2s ease-in-out;
            }
        }

        &__details[open] &__summary :global(.advanced-search__chevron) {
            transform: rotate(180deg);
        }

        &__details-body {
            display: flex;
            flex-direction: column;
            gap: 20px;
            padding: 4px 16px 16px;
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
            border-top: 1px solid var(--border-color-1);

            &:first-child {
                border-top: none;
            }
        }

        &__actions {
            position: sticky;
            bottom: 0;
            display: flex;
            justify-content: flex-end;
            gap: 12px;
            margin: 8px -36px -24px;
            padding: 16px 36px;
            background-color: var(--bg-color-1);
            border-top: 1px solid var(--border-color-1);

            @media (max-width: 767px) {
                margin: 8px -16px -24px;
                padding: 16px;
            }
        }
    }

    .segment {
        display: inline-flex;
        border: 1px solid var(--border-color-1);
        background-color: var(--bg-color-2);
        border-radius: var(--border-radius-3);
        overflow: hidden;
        align-self: flex-start;

        &__item {
            min-width: 72px;
            height: 36px;
            padding: 0 14px;
            font-size: 14px;
            color: var(--text-color-1);

            &--on {
                background-color: var(--primary-color);
                color: #fff;
            }
        }
    }
</style>
