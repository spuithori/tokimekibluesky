<script lang="ts">
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import {agent} from '$lib/stores';
    import {_} from "svelte-i18n";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import { PUBLIC_SUICIDE_WORDS } from '$env/static/public';
    import SuicideSafety from "$lib/components/safety/SuicideSafety.svelte";
    import DeckRow from "../DeckRow.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {parseSearchParams, buildSearchQuery, searchColumnId, isEmptySearch} from "$lib/search/searchParams";

    const junkColumnState = getColumnState(true);

    const parsed = parseSearchParams($page.url.searchParams);
    const columnId = searchColumnId(parsed);
    const hasSearch = !isEmptySearch(parsed);
    const isSafety = PUBLIC_SUICIDE_WORDS.split(',').includes($page.url.searchParams.get('q') ?? '');

    if (hasSearch && !junkColumnState.hasColumn(columnId)) {
        junkColumnState.add({
            id: columnId,
            algorithm: {
                algorithm: parsed.query,
                type: 'search',
                name: $_('search') + (parsed.query ? ' "' + parsed.query + '"' : ''),
                sort: parsed.sort,
                searchFilters: parsed.filters,
            },
            style: 'default',
            settings: defaultDeckSettings,
            did: $agent.did(),
            handle: $agent.handle(),
            data: {
                feed: [],
                cursor: '',
            }
        });
    }

    function setSort(sort: 'top' | 'latest') {
        if (sort === parsed.sort) {
            return;
        }
        goto('/search?' + buildSearchQuery({ ...parsed, sort }));
    }
</script>

<div class="sort-toggle-nav">
    <button class="sort-toggle-nav__item" class:sort-toggle-nav__item--active={parsed.sort === 'latest'} onclick={() => setSort('latest')}>{$_('search_sort_latest')}</button>
    <button class="sort-toggle-nav__item" class:sort-toggle-nav__item--active={parsed.sort === 'top'} onclick={() => setSort('top')}>{$_('search_sort_top')}</button>
</div>

{#if isSafety}
    <div class="timeline">
        <SuicideSafety></SuicideSafety>
    </div>
{/if}

{#if hasSearch && junkColumnState.hasColumn(columnId)}
    <DeckRow index={junkColumnState.getColumnIndex(columnId)} isJunk={true}></DeckRow>
{:else}
    <div class="search-empty">
        <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="var(--border-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rainbow"><path d="M22 17a10 10 0 0 0-20 0"/><path d="M6 17a6 6 0 0 1 12 0"/><path d="M10 17a2 2 0 0 1 4 0"/></svg>
    </div>
{/if}

<style lang="postcss">
    .search-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 32px 0;
    }

    .sort-toggle-nav {
        position: absolute;
        right: 16px;
        top: 10px;
        border: 1px solid var(--border-color-1);
        background-color: var(--bg-color-2);
        height: 32px;
        border-radius: var(--border-radius-3);
        overflow: hidden;

        &__item {
            height: 100%;
            width: 60px;
            font-size: 14px;
            color: var(--text-color-1);

            &--active {
                background-color: var(--primary-color);
                color: #fff;
            }
        }
    }
</style>
