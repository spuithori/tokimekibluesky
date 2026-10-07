<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import Folder from '@lucide/svelte/icons/folder';
    import Ticket from '@lucide/svelte/icons/ticket';
  import {_} from "tokimeki-i18n";
  import { SvelteSet } from "svelte/reactivity";
  import { toast } from "svelte-sonner";
  import { agent } from "$lib/stores";
  import ThemeItem from "./ThemeItem.svelte";
  import SearchResultList from "$lib/components/search/SearchResultList.svelte";
  import { fetchStoreThemes, setThemeLike, type StoreSort, type StoreTheme } from "$lib/theme/store";

  const SORTS: StoreSort[] = ['new', 'likes', 'installs'];

  let sort: StoreSort = $state('new');
  const pendingLikes = new SvelteSet<string>();

  async function loadPage(cursor: string | undefined, signal: AbortSignal) {
      const page = await fetchStoreThemes({ agent: $agent, sort, cursor, signal });
      return { items: page.themes, cursor: page.cursor };
  }

  async function toggleLike(item: StoreTheme) {
      if (!$agent || pendingLikes.has(item.theme.uri)) return;
      const previous = item.viewerLike;
      pendingLikes.add(item.theme.uri);
      item.likeCount += previous ? -1 : 1;
      try {
          item.viewerLike = await setThemeLike($agent, item.theme, previous);
      } catch (e) {
          console.error(e);
          item.likeCount += previous ? 1 : -1;
          toast.error($_('theme_like_error'));
      } finally {
          pendingLikes.delete(item.theme.uri);
      }
  }
</script>

<svelte:head>
  <title>{$_('theme_store')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <ArrowLeft color="var(--text-color-1)" />
      </button>
    </div>

    <h1 class="column-heading__title">{$_('theme_store')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <X color="var(--text-color-1)" />
      </a>
    </div>
  </div>

  <div class="theme-store-wrap">
    <div class="theme-store-section only-mobile">
      <ul class="p-menu-nav p-menu-nav--2columns">
        <li class="p-menu-nav__item p-menu-nav__item--border">
          <div class="p-menu-nav__icon">
            <Folder color="var(--text-color-1)" />
          </div>
          <p class="p-menu-nav__title"><a href="/theme-store/mytheme">{$_('theme_store_my_theme')}</a></p>
        </li>

        <li class="p-menu-nav__item p-menu-nav__item--border">
          <div class="p-menu-nav__icon">
            <Ticket color="var(--text-color-1)" />
          </div>
          <p class="p-menu-nav__title"><a href="/theme-store/code">{$_('theme_store_code')}</a></p>
        </li>
      </ul>
    </div>

    <section class="theme-store-section">
      <div class="theme-store-sort" role="group" aria-label={$_('theme_sort')}>
        {#each SORTS as value (value)}
          <button
            class="theme-store-sort__button"
            class:theme-store-sort__button--active={sort === value}
            aria-pressed={sort === value}
            onclick={() => (sort = value)}
          >{$_(`theme_sort_${value}`)}</button>
        {/each}
      </div>

      {#key sort}
        <SearchResultList load={loadPage} key={(item: StoreTheme) => item.theme.uri}>
          {#snippet item(item: StoreTheme)}
            <ThemeItem
              remote={item.theme}
              likeCount={item.likeCount}
              liked={pendingLikes.has(item.theme.uri) ? !item.viewerLike : !!item.viewerLike}
              onlike={$agent ? () => toggleLike(item) : undefined}
            ></ThemeItem>
          {/snippet}
          {#snippet error()}
            <p class="settings-description">{$_('theme_store_load_error')}</p>
          {/snippet}
        </SearchResultList>
      {/key}
    </section>
  </div>
</div>

<style lang="postcss">
  .theme-store-supporter-recommend {
    margin-bottom: 16px;
  }

  .theme-store-sort {
      display: flex;
      gap: 4px;
      margin-bottom: 16px;

      &__button {
          display: flex;
          align-items: center;
          padding: 0 12px;
          border: 1px solid var(--primary-color);
          height: 28px;
          border-radius: 14px;
          font-size: 13px;
          color: var(--primary-color);
          white-space: nowrap;

          &--active {
              background-color: var(--primary-color);
              color: var(--on-accent, var(--bg-color-1));
          }
      }
  }
</style>
