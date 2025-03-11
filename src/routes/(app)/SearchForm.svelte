<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { onMount } from "svelte";
    import { PersistedState, onClickOutside } from "runed";
    import {X} from "lucide-svelte";

    let { search = $bindable(), path = location.pathname } = $props();

    let el = $state();
    let searchArea = $state();
    const searchHistory = new PersistedState('searchHistory', []);
    let allowHistoryOpen = $state(false);
    let isHistoryOpen = $derived(allowHistoryOpen && search === '' && path === '/search');

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
</script>

<div class="search" bind:this={el}>
  <form action={path} method="get" onsubmit={handleSubmit} data-sveltekit-replacestate>
    <input type="text" name="q" required bind:value={search} bind:this={searchArea} onclick={() => {allowHistoryOpen = true}} placeholder="{$_(path + '_search')}" autocomplete="off">
    <button type="submit" class="search-submit" aria-label="Search">
      <svg xmlns="http://www.w3.org/2000/svg" width="17.67" height="17.661" viewBox="0 0 17.67 17.661">
        <path id="search" d="M11.589,12.866A7.187,7.187,0,1,1,12.856,11.6l4.807,4.789-1.276,1.276-4.789-4.8Zm-4.4-.287A5.391,5.391,0,1,0,1.8,7.188a5.391,5.391,0,0,0,5.391,5.391Z" transform="translate(0.008 -0.002)" fill="var(--primary-color)"/>
      </svg>
    </button>
  </form>

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
</style>