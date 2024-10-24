<script lang="ts">
    import { page } from '$app/stores';
    import {agent, isAfterReload, settings} from '$lib/stores';
    import {_} from "svelte-i18n";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import { PUBLIC_SUICIDE_WORDS } from '$env/static/public';
    import SuicideSafety from "$lib/components/safety/SuicideSafety.svelte";
    import type { Snapshot } from './$types';
    import DeckRow from "../DeckRow.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    const junkColumnState = getColumnState(true);

    let feeds = [];
    let cursor = 0;
    let isLoaded = false;
    let isColumnAdded = false;
    let isSafety = $state(false);
    let sort: 'top' | 'latest' = $state('latest');

    export const snapshot: Snapshot = {
        capture: () => [$settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector(':root').scrollTop],
        restore: (value) => {
            if(!$isAfterReload) {
                [scrollY] = value;

                setTimeout(() => {
                    if ($settings.design.layout === 'decks') {
                        document.querySelector('.modal-page-content').scroll(0, scrollY);
                    } else {
                        document.querySelector(':root').scroll(0, scrollY);
                    }
                }, 0)
            }

            isAfterReload.set(false);
        }
    };

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
            junkColumnState.columns[index].data.feed = [];
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
        <DeckRow index={junkColumnState.getColumnIndex('search_' + $page.url.searchParams.get('q'))} isJunk={true}></DeckRow>
    {:else}
        <div class="search-empty">
            <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 24 24" fill="none" stroke="var(--border-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rainbow"><path d="M22 17a10 10 0 0 0-20 0"/><path d="M6 17a6 6 0 0 1 12 0"/><path d="M10 17a2 2 0 0 1 4 0"/></svg>
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