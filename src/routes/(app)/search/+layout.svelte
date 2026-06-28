<script lang="ts">
  import {_} from "svelte-i18n";
  import { setContext } from "svelte";
  import type { LayoutData } from './$types';
  import SearchForm from "../SearchForm.svelte";
  import PageModal from "$lib/components/ui/PageModal.svelte";
  import CashtagCard from "$lib/components/post/CashtagCard.svelte";
  import {page} from "$app/stores";
  import {agent} from "$lib/stores";
  import { SAVED_FEEDS_CONTEXT, type SavedFeedsContext } from "./savedFeedsContext";

  interface Props {
    data: LayoutData;
    children?: import('svelte').Snippet;
  }

  let { children }: Props = $props();
  let currentPage = $derived($page.url.pathname.split('/')[2] ?? 'posts');
  let q = $derived($page.url.searchParams.get('q') ?? '');
  let searchKey = $derived($page.url.search);

  let savedFeeds = $state<string[]>([]);
  let savedFeedsRequested = false;
  setContext<SavedFeedsContext>(SAVED_FEEDS_CONTEXT, {
    get value() { return savedFeeds; },
    ensure() {
      if (savedFeedsRequested) return;
      savedFeedsRequested = true;
      (async () => {
        try {
          const res = await $agent.xrpc.get('app.bsky.actor.getPreferences');
          const pref = res.preferences.find((p: any) => p.$type === 'app.bsky.actor.defs#savedFeedsPref');
          savedFeeds = pref?.saved ?? [];
        } catch (e) {
          console.error(e);
          savedFeedsRequested = false;
        }
      })();
    },
  });

  let cashtagInfo = $derived.by(() => {
      const query = q;
      const usMatch = query.match(/^#?\$([A-Za-z][A-Za-z0-9]{0,4})$/);
      if (usMatch) return { symbol: usMatch[1].toUpperCase(), japanese: false };
      const jpMatch = query.match(/^#?\$[\\¥](\d{4,5})$/);
      if (jpMatch) return { symbol: jpMatch[1], japanese: true };
      return null;
  });
</script>

<PageModal>
  <div class="column-heading column-heading--search">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}} aria-label="Back">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <SearchForm path={$page.url.pathname}></SearchForm>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/" aria-label="Close">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="page-search">
    {#if cashtagInfo}
      <CashtagCard symbol={cashtagInfo.symbol} japanese={cashtagInfo.japanese} />
    {/if}

    <ul class="profile-tab">
      <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'posts'}><a href="/search?q={encodeURIComponent(q)}" aria-current={currentPage === 'posts' ? 'page' : undefined} data-sveltekit-noscroll data-sveltekit-replacestate>{$_('posts')}</a></li>
      <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'user'}><a href="/search/user?q={encodeURIComponent(q)}" aria-current={currentPage === 'user' ? 'page' : undefined} data-sveltekit-noscroll data-sveltekit-replacestate>{$_('user')}</a></li>
      <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'feeds'}><a href="/search/feeds?q={encodeURIComponent(q)}" aria-current={currentPage === 'feeds' ? 'page' : undefined} data-sveltekit-noscroll data-sveltekit-replacestate>{$_('feeds')}</a></li>
      <li class="profile-tab__item" class:profile-tab__item--active={currentPage === 'articles'}><a href="/search/articles?q={encodeURIComponent(q)}" aria-current={currentPage === 'articles' ? 'page' : undefined} data-sveltekit-noscroll data-sveltekit-replacestate>{$_('network_feed')}</a></li>
    </ul>

    <div class="page-search-content">
      {#key searchKey}
        {@render children?.()}
      {/key}
    </div>
  </div>
</PageModal>

<style lang="postcss">
  .page-search {
      position: relative;
  }
</style>