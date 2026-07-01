<script lang="ts">
    import Rainbow from '@lucide/svelte/icons/rainbow';
    import { page } from '$app/stores';
    import {agent} from '$lib/stores';
    import {_} from "svelte-i18n";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import { PUBLIC_SUICIDE_WORDS } from '$env/static/public';
    import SuicideSafety from "$lib/components/safety/SuicideSafety.svelte";
    import DeckSlot from "../DeckSlot.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    const junkColumnState = getColumnState(true);

    let isLoaded = false;
    let isColumnAdded = false;
    let isSafety = $state(false);
    let sort: 'top' | 'latest' = $state('latest');

    if ($page.url.searchParams.get('q') && !junkColumnState.hasColumn('search_' + $page.url.searchParams.get('q'))) {
        junkColumnState.add({
            id: $page.url.searchParams.get('q') ? 'search_' + $page.url.searchParams.get('q') : 'search_empty',
            algorithm: {
                algorithm: $page.url.searchParams.get('q') || '',
                type: 'search',
                name: $_('search') + ' "' + $page.url.searchParams.get('q') + '"',
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

    const words = PUBLIC_SUICIDE_WORDS.split(',');
    if (words.includes($page.url.searchParams.get('q'))) {
        isSafety = true;
    }

    function toggleSort(_sort) {
        if (_sort === sort) {
            return false;
        }

        sort = _sort;

        if ($page.url.searchParams.get('q') && junkColumnState.hasColumn('search_' + $page.url.searchParams.get('q'))) {
            const index = junkColumnState.getColumnIndex('search_' + $page.url.searchParams.get('q'));

            junkColumnState.columns[index].algorithm.sort = _sort;
            junkColumnState.clearFeed(junkColumnState.columns[index].id);
            junkColumnState.columns[index].data.cursor = 0;
        }
    }
</script>

<div class="sort-toggle-nav">
    <button class="sort-toggle-nav__item" class:sort-toggle-nav__item--active={sort === 'latest'} onclick={() => {toggleSort('latest')}}>{$_('search_sort_latest')}</button>
    <button class="sort-toggle-nav__item" class:sort-toggle-nav__item--active={sort === 'top'} onclick={() => {toggleSort('top')}}>{$_('search_sort_top')}</button>
</div>

{#if isSafety}
    <div class="timeline">
        <SuicideSafety></SuicideSafety>
    </div>
{/if}

{#key sort}
    {#if ($page.url.searchParams.get('q') && junkColumnState.hasColumn('search_' + $page.url.searchParams.get('q')))}
        <DeckSlot index={junkColumnState.getColumnIndex('search_' + $page.url.searchParams.get('q'))} isJunk={true}></DeckSlot>
    {:else}
        <div class="search-empty">
            <Rainbow size={128} color="var(--border-color-1)" />
        </div>
    {/if}
{/key}

{#if (isLoaded)}
    <div class="search-column-adder">
        <button class="button button--shadow button--sm" disabled={isColumnAdded} onclick={addColumn}>{$_('feed_quick_add')}</button>
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

    .search-column-adder {
        position: sticky;
        bottom: 24px;
        display: flex;
        justify-content: flex-end;
        padding: 0 24px;
        pointer-events: none;

        @media (max-width: 767px) {
            bottom: 80px;
            padding: 0 20px;
        }

        .button {
            pointer-events: auto;
        }
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