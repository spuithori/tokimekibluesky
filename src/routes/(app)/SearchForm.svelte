<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { onMount, tick } from "svelte";
    import { PersistedState, onClickOutside } from "runed";
    import {X, Funnel, Languages, Search} from "lucide-svelte";
    import Menu from "$lib/components/ui/Menu.svelte";
    import {languageMap} from "$lib/langs/languageMap";
    import {settings} from '$lib/stores';

    let { search = $bindable(), path = location.pathname } = $props();

    let el = $state();
    let searchArea = $state();
    const searchHistory = new PersistedState('searchHistory', []);
    let allowHistoryOpen = $state(false);
    let isHistoryOpen = $derived(allowHistoryOpen && search === '' && path === '/search');
    let isMenuOpen = $state(false);
    let formEl = $state();

    const clickOutside = onClickOutside(
      () => el,
      () => {
        allowHistoryOpen = false;
      },
    );

    onMount(() => {
        if (!search) {
            searchArea.focus();
            allowHistoryOpen = true;
        }
    })

    function handleSubmit() {
      if (!search) {
        return false;
      }

      if (!searchHistory.current.includes(search)) {
        searchHistory.current = [search, ...searchHistory.current];

        if (searchHistory.current.length > 10) {
          searchHistory.current = searchHistory.current.slice(0, 10);
        }
      }
    }

    function handleDeleteHistory(value) {
      searchHistory.current = searchHistory.current.filter(x => x !== value);
    }

    async function handleLanguageFilter() {
        const langFilter = `lang:${$settings.general.userLanguage}`;
        const langPattern = /\blang:\S+/g;

        if (langPattern.test(search)) {
            search = search.replace(langPattern, langFilter);
        } else {
            search = `${search} ${langFilter}`.trim();
        }

        await tick();
        formEl.requestSubmit();
        isMenuOpen = false;
    }
</script>

<div class="search" bind:this={el}>
  <form bind:this={formEl} action={path} method="get" onsubmit={handleSubmit} data-sveltekit-replacestate>
    <input type="text" name="q" required bind:value={search} bind:this={searchArea} onclick={() => {allowHistoryOpen = true}} placeholder="{$_(path + '_search')}" autocomplete="off">
    <button type="submit" class="search-submit" aria-label="Search">
      <Search color="var(--primary-color)" size="20"></Search>
    </button>
  </form>

  <div class="search-filter-menu">
    <Menu bind:isMenuOpen={isMenuOpen} buttonClassName="search-filter-menu__item">
      {#snippet ref()}
          <span class="timeline-reaction__icon">
            <Funnel size="20"></Funnel>
          </span>
      {/snippet}

      {#snippet content()}
        <ul  class="timeline-menu-list">
          {#if $settings?.general?.userLanguage}
            {@const formattedLang = $_(languageMap.get($settings.general.userLanguage).name)}
            <li class="timeline-menu-list__item">
              <button class="timeline-menu-list__button timeline-menu-list__button--bookmark" onclick={handleLanguageFilter}>
                <Languages></Languages>
                {$_('search_filter_language', {values: {lang: formattedLang}})}
              </button>
            </li>
          {/if}
        </ul>
      {/snippet}
    </Menu>
  </div>

  {#if (isHistoryOpen && searchHistory.current.length)}
    <div class="search-history">
      {#each searchHistory.current as value}
        <div class="search-history__item">
          <a href={`/search?q=${encodeURIComponent(value)}`} class="search-history__submit" tabindex="0"><span>{value}</span></a>
          <button type="button" class="search-history__delete" onclick={() => {handleDeleteHistory(value)}}><X size="20" color="var(--text-color-1)"></X></button>
        </div>
      {/each}
    </div>
  {/if}
</div>

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
        padding: 16px 0;
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background-color: var(--bg-color-1);
        border-radius: var(--border-radius-4);
        box-shadow: 0 3px 6px var(--box-shadow-color-1);

        &__item {
            height: 40px;
            padding: 0 40px 0 16px;
            position: relative;

            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &__delete {
            width: 40px;
            height: 40px;
            display: grid;
            place-content: center;
            position: absolute;
            right: 4px;
            top: 0;
            bottom: 0;
            margin: auto;
            z-index: 1;
        }

        &__submit {
            display: flex;
            align-items: center;
            white-space: nowrap;
            font-weight: bold;
            color: var(--text-color-1);
            width: 100%;
            height: 100%;

            span {
                overflow: hidden;
                text-overflow: ellipsis;
            }
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
    }
</style>