<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { onMount } from "svelte";
    import { watch, onClickOutside } from "runed";
    import X from '@lucide/svelte/icons/x';
    import Search from '@lucide/svelte/icons/search';
    import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import { page } from "$app/stores";
    import { agent } from '$lib/stores';
    import { parseSearchParams, buildSearchQuery, type ParsedSearch } from '$lib/search/searchParams';
    import { searchLabel, filterChips } from '$lib/search/searchDisplay';
    import { searchHistory, type SearchScope } from '$lib/classes/searchHistory.svelte';
    import AdvancedSearchModal from '$lib/components/search/AdvancedSearchModal.svelte';

    let { path = location.pathname } = $props();

    let el = $state<HTMLElement>();
    let searchArea = $state<HTMLInputElement>();
    let value = $state($page.url.searchParams.get('q') ?? '');
    let allowHistoryOpen = $state(false);
    let isAdvancedOpen = $state(false);

    let scope = $derived<SearchScope>(toScope(path));
    let isPostsScope = $derived(scope === 'posts');
    let historyItems = $derived(searchHistory.items(scope));
    let isHistoryOpen = $derived(allowHistoryOpen && value === '' && historyItems.length > 0);

    function toScope(p: string): SearchScope {
        const seg = p.split('/')[2];
        return seg === 'user' || seg === 'feeds' || seg === 'articles' ? seg : 'posts';
    }

    watch(() => $page.url.searchParams.get('q'), (q) => {
        value = q ?? '';
    });

    onClickOutside(() => el, () => {
        allowHistoryOpen = false;
    });

    onMount(() => {
        if (!value) {
            searchArea?.focus();
            allowHistoryOpen = true;
        }
    });

    function handleSubmit() {
        const q = value.trim();
        if (!q) {
            return false;
        }
        if (isPostsScope) {
            searchHistory.add('posts', buildSearchQuery({ query: q, sort: 'latest', filters: {} }));
        } else {
            searchHistory.add(scope, q);
        }
    }

    function modalInitial(): ParsedSearch {
        const params = new URLSearchParams($page.url.search);
        const q = value.trim();
        if (q) {
            params.set('q', q);
        } else {
            params.delete('q');
        }
        return parseSearchParams(params);
    }

    function historyHref(entry: string): string {
        return isPostsScope ? `/search?${entry}` : `/search/${scope}?q=${encodeURIComponent(entry)}`;
    }

</script>

<div class={['search', isPostsScope && 'search--with-filter']} bind:this={el}>
  <form action={path} method="get" onsubmit={handleSubmit} data-sveltekit-replacestate>
    <input type="text" name="q" required bind:value bind:this={searchArea} onclick={() => {allowHistoryOpen = true}} placeholder="{$_(path + '_search')}" autocomplete="off">
    <button type="submit" class="search-submit" aria-label={$_('search_button')}>
      <Search color="var(--primary-color)" size="20"></Search>
    </button>
  </form>

  {#if path === '/search'}
    <div class="search-filter-menu">
      <button type="button" class="search-filter-menu__button" onclick={() => {isAdvancedOpen = true}} aria-label={$_('search_advanced')}>
        <SlidersHorizontal size="20"></SlidersHorizontal>
      </button>
    </div>
  {/if}

  {#if isHistoryOpen}
    <div class="search-history">
      <ul class="search-history__list">
        {#each historyItems as entry (entry)}
          <li class="search-history__item">
            <a class="search-history__link" href={historyHref(entry)} data-sveltekit-replacestate onclick={() => {allowHistoryOpen = false}}>
              {#if isPostsScope}
                {@const parsed = parseSearchParams(new URLSearchParams(entry))}
                <span class="search-history__query">{searchLabel(parsed, $_)}</span>
                {#each filterChips(parsed, $_) as chip, i (i)}
                  <span class="search-history__chip">{chip}</span>
                {/each}
              {:else}
                <span class="search-history__query">{entry}</span>
              {/if}
            </a>
            <button type="button" class="search-history__delete" onclick={() => searchHistory.remove(scope, entry)} aria-label={$_('delete')}>
              <X size="18" color="var(--text-color-3)"></X>
            </button>
          </li>
        {/each}
      </ul>

      <button type="button" class="search-history__clear" onclick={() => searchHistory.clear(scope)}>
        <Trash2 size="15"></Trash2>
        {$_('search_history_clear')}
      </button>
    </div>
  {/if}
</div>

{#if isAdvancedOpen}
  <AdvancedSearchModal _agent={$agent} initial={modalInitial()} onclose={() => {isAdvancedOpen = false}}></AdvancedSearchModal>
{/if}

<style lang="postcss">
    .search {
        position: relative;
        width: 100%;

        form {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
        }

        input {
            color: var(--text-color-1);
            background-color: var(--bg-color-2);
            border: 1px solid var(--border-color-1);
            height: 40px;
            padding: 0 45px 0 16px;
            border-radius: 20px;
            flex: 1;
            width: 100%;
            outline: none;

            &::placeholder {
                color: var(--text-color-3);
            }
        }
    }

    .search--with-filter input {
        padding-right: 80px;
    }

    .search-submit {
        position: absolute;
        width: 30px;
        height: 30px;
        right: 10px;
        top: 0;
        bottom: 0;
        margin: auto;
        display: grid;
        place-content: center;
    }

    .search-history {
        padding: 8px 0;
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        background-color: var(--bg-color-1);
        border: 1px solid var(--border-color-1);
        border-radius: var(--border-radius-4);
        box-shadow: 0 8px 24px var(--box-shadow-color-1);
        z-index: 10;
        max-height: 60vh;
        overflow-y: auto;

        &__list {
            list-style: none;
        }

        &__item {
            display: flex;
            align-items: center;
            gap: 4px;
            padding: 0 6px 0 16px;

            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &__link {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 6px;
            flex: 1;
            min-width: 0;
            min-height: 40px;
            padding: 6px 0;
            color: var(--text-color-1);
        }

        &__query {
            font-weight: bold;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
        }

        &__chip {
            font-size: 12px;
            color: var(--text-color-3);
            background-color: var(--bg-color-2);
            border: 1px solid var(--border-color-2);
            border-radius: var(--border-radius-2);
            padding: 1px 6px;
            white-space: nowrap;
        }

        &__delete {
            flex-shrink: 0;
            width: 36px;
            height: 36px;
            display: grid;
            place-content: center;
            border-radius: 50%;

            &:hover {
                background-color: var(--bg-color-3);
            }
        }

        &__clear {
            display: flex;
            align-items: center;
            gap: 6px;
            width: 100%;
            padding: 10px 16px;
            margin-top: 4px;
            border-top: 1px solid var(--border-color-1);
            color: var(--text-color-3);
            font-size: 13px;
        }
    }

    .search-filter-menu {
        position: absolute;
        right: 42px;
        top: 0;
        bottom: 0;
        width: 30px;
        height: 30px;
        margin: auto;
        display: grid;
        place-content: center;

        &__button {
            display: grid;
            place-content: center;
            color: var(--text-color-3);
        }
    }
</style>
