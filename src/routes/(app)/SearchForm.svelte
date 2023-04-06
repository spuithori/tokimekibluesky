<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { page } from '$app/stores';
    let search = $page.url.searchParams.get('q') || '';
</script>

<div class="search">
  <form action="/search" method="get">
    <input type="text" name="q" required bind:value={search} placeholder="{$_('keywords_search_experimental')}">
    <button type="submit" class="button button--sm">{$_('search_button')}</button>
  </form>
</div>

<style lang="postcss">
    .search {
        width: 100%;
        margin-bottom: 20px;

        form {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 20px;
        }

        input {
            color: var(--text-color-1);
            background-color: var(--bg-color-1);
            border: 1px solid var(--border-color-1);
            height: 40px;
            padding: 0 10px;
            border-radius: 6px;
            flex: 1;
            width: 100%;
        }
    }
</style>