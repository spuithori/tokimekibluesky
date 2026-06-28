<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { onMount } from "svelte";
    import { watch, onClickOutside } from "runed";
    import { X, Search, SlidersHorizontal, Trash2 } from "lucide-svelte";
    import { page } from "$app/stores";
    import { agent } from '$lib/stores';
    import { parseSearchParams, buildSearchQuery, type ParsedSearch } from '$lib/search/searchParams';
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

    function historyHref(entry: string): string {
        return isPostsScope ? `/search?${entry}` : `/search/${scope}?q=${encodeURIComponent(entry)}`;
    }

    function historyLabel(parsed: ParsedSearch): string {
        return parsed.query || $_('search_advanced');
    }

    function historyChips(parsed: ParsedSearch): string[] {
        const f = parsed.filters;
        const chips: string[] = [];
        if (parsed.sort === 'top') chips.push($_('search_sort_top'));
        if (f.authors?.length) chips.push(`${$_('search_filter_authors')}·${f.authors.length}`);
        if (f.mentions?.length) chips.push(`${$_('search_filter_mentions')}·${f.mentions.length}`);
        for (const tag of f.hashtags ?? []) chips.push('#' + tag);
        if (f.languages?.length) chips.push(`${$_('search_filter_languages')}·${f.languages.length}`);
        if (f.hasMedia) chips.push($_('search_filter_media_only'));
        if (f.hasVideo) chips.push($_('search_filter_video_only'));
        if (f.following) chips.push($_('search_filter_following'));
        if (f.excludeReplies) chips.push($_('search_filter_exclude_replies'));
        if (f.repliesOnly) chips.push($_('search_filter_replies_only'));
        if (f.since || f.until) chips.push(`${f.since ?? ''}〜${f.until ?? ''}`);
        if (f.domains?.length) chips.push(`${$_('search_filter_domains')}·${f.domains.length}`);
        if (f.urls?.length) chips.push(`${$_('search_filter_urls')}·${f.urls.length}`);
        return chips;
    }
</script>

<div class="search" bind:this={el}>
  <form action={path} method="get" onsubmit={handleSubmit} data-sveltekit-replacestate>
    <input type="text" name="q" required bind:value bind:this={searchArea} onclick={() => {allowHistoryOpen = true}} placeholder="{$_(path + '_search')}" autocomplete="off">
    <button type="submit" class="search-submit" aria-label="Search">
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
                <span class="search-history__query">{historyLabel(parsed)}</span>
                {#each historyChips(parsed) as chip, i (i)}
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
  <AdvancedSearchModal _agent={$agent} initial={parseSearchParams($page.url.searchParams)} onclose={() => {isAdvancedOpen = false}}></AdvancedSearchModal>
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
