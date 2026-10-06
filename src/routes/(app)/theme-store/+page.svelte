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
  import { fetchStoreThemes, listLikedThemeUris, setThemeLike, type StoreSort, type StoreTheme } from "$lib/theme/store";

  const SORTS: StoreSort[] = ['new', 'likes', 'installs'];

  let sort: StoreSort = $state('new');
  let themes: StoreTheme[] = $state([]);
  let cursor: string | undefined = $state();
  let loading = $state(false);
  let failed = $state(false);
  const liked = new SvelteSet<string>();
  let request = 0;

  async function load(append = false) {
      const id = ++request;
      loading = true;
      failed = false;
      try {
          const page = await fetchStoreThemes({ sort, cursor: append ? cursor : undefined });
          if (id !== request) return;
          themes = append ? [...themes, ...page.themes] : page.themes;
          cursor = page.cursor;
      } catch (e) {
          console.error(e);
          if (id === request) failed = true;
      } finally {
          if (id === request) loading = false;
      }
  }

  function changeSort(next: StoreSort) {
      if (next === sort) return;
      sort = next;
      cursor = undefined;
      load();
  }

  async function toggleLike(item: StoreTheme) {
      if (!$agent) return;
      const like = !liked.has(item.theme.uri);
      if (like) liked.add(item.theme.uri);
      else liked.delete(item.theme.uri);
      item.likeCount += like ? 1 : -1;
      try {
          await setThemeLike($agent, item.theme, like);
      } catch (e) {
          console.error(e);
          if (like) liked.delete(item.theme.uri);
          else liked.add(item.theme.uri);
          item.likeCount += like ? -1 : 1;
          toast.error($_('theme_like_error'));
      }
  }

  load();
  if ($agent) {
      listLikedThemeUris($agent).then((uris) => uris.forEach((uri) => liked.add(uri))).catch(() => {});
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
    <p class="theme-store-supporter-recommend">{$_('theme_store_supporter_recommend_1')}<a href="https://tokimeki.fanbox.cc/" target="_blank">pixivFANBOX</a>{$_('theme_store_supporter_recommend_2')}</p>

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
            onclick={() => changeSort(value)}
          >{$_(`theme_sort_${value}`)}</button>
        {/each}
      </div>

      {#each themes as item (item.theme.uri)}
        <ThemeItem
          remote={item.theme}
          likeCount={item.likeCount}
          installCount={item.installCount}
          liked={liked.has(item.theme.uri)}
          onlike={$agent ? () => toggleLike(item) : undefined}
        ></ThemeItem>
      {/each}

      {#if failed}
        <p class="settings-description">{$_('theme_store_load_error')}</p>
      {:else if cursor}
        <button class="text-button theme-store-more" onclick={() => load(true)} disabled={loading}>{$_('theme_store_more')}</button>
      {/if}
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

  .theme-store-more {
      display: block;
      margin: 0 auto;
  }
</style>