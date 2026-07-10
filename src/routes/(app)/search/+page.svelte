<script lang="ts">
    import Rainbow from '@lucide/svelte/icons/rainbow';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import {agent} from '$lib/stores';
    import {_} from "tokimeki-i18n";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import { PUBLIC_SUICIDE_WORDS } from '$env/static/public';
    import SuicideSafety from "$lib/components/safety/SuicideSafety.svelte";
    import DeckRow from "../DeckRow.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {parseSearchParams, buildSearchQuery, searchColumnId, isEmptySearch} from "$lib/search/searchParams";
    import {searchColumnName} from "$lib/search/searchDisplay";

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
                name: searchColumnName(parsed, $_),
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

    let hitsTotal = $derived(junkColumnState.columns.find(c => c.id === columnId)?.data?.hitsTotal);
</script>

{#if hasSearch}
    <div class="search-results-header">
        {#if hitsTotal != null}
            <p class="search-results-header__count">{$_('search_hits_total', {count: hitsTotal.toLocaleString()})}</p>
        {/if}

        <div class="segment" role="group" aria-label={$_('search_sort')}>
            <button type="button" class={['segment__item', parsed.sort === 'latest' && 'segment__item--on']} aria-pressed={parsed.sort === 'latest'} onclick={() => setSort('latest')}>{$_('search_sort_latest')}</button>
            <button type="button" class={['segment__item', parsed.sort === 'top' && 'segment__item--on']} aria-pressed={parsed.sort === 'top'} onclick={() => setSort('top')}>{$_('search_sort_top')}</button>
        </div>
    </div>
{/if}

{#if isSafety}
    <div class="timeline">
        <SuicideSafety></SuicideSafety>
    </div>
{/if}

{#if hasSearch && junkColumnState.hasColumn(columnId)}
    <DeckRow index={junkColumnState.getColumnIndex(columnId)} isJunk={true}></DeckRow>
{:else}
    <div class="search-empty">
        <Rainbow size={128} color="var(--border-color-1)" />
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

    .search-results-header {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 12px;
        padding: 8px 16px;

        &__count {
            margin-right: auto;
            font-size: 13px;
            color: var(--text-color-3);
        }
    }
</style>
