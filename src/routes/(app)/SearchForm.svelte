<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { page } from '$app/stores';
    import { onMount } from "svelte";
    let searchArea = $state();
    let { search = $bindable($page.url.searchParams.get('q') || ''), path = location.pathname } = $props();

    onMount(() => {
        if (!search) {
            searchArea.focus();
        }
    })
</script>

<div class="search">
  <form action={path} method="get" data-sveltekit-replacestate data-sveltekit-keepfocus>
    <input type="text" name="q" required bind:value={search} bind:this={searchArea} placeholder="{$_(path + '_search')}">
    <button type="submit" class="search-submit" aria-label="Search">
      <svg xmlns="http://www.w3.org/2000/svg" width="17.67" height="17.661" viewBox="0 0 17.67 17.661">
        <path id="search" d="M11.589,12.866A7.187,7.187,0,1,1,12.856,11.6l4.807,4.789-1.276,1.276-4.789-4.8Zm-4.4-.287A5.391,5.391,0,1,0,1.8,7.188a5.391,5.391,0,0,0,5.391,5.391Z" transform="translate(0.008 -0.002)" fill="var(--primary-color)"/>
      </svg>
    </button>
  </form>
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
</style>