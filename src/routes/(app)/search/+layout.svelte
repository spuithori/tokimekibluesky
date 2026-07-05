<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
  import {_} from "tokimeki-i18n";
  import type { LayoutData } from './$types';
  import SearchForm from "../SearchForm.svelte";
  import PageModal from "$lib/components/ui/PageModal.svelte";
  import CashtagCard from "$lib/components/post/CashtagCard.svelte";
  import {page} from "$app/stores";

  interface Props {
    data: LayoutData;
    children?: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();
  let currentPage = $state(data.url.pathname.split('/')[2] ?? 'posts');
  let params = $derived($page.url.searchParams.get('q'));
  let q = $state();

  $effect(() => {
      q = params || '';
  })

  let cashtagInfo = $derived.by(() => {
      const query = params || '';
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
      <button class="settings-back" onclick={() => {history.back()}}>
        <ArrowLeft color="var(--text-color-1)" />
      </button>
    </div>

    <SearchForm path={data.url.pathname} bind:search={q}></SearchForm>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <X color="var(--text-color-1)" />
      </a>
    </div>
  </div>

  <div class="page-search">
    {#if cashtagInfo}
      <CashtagCard symbol={cashtagInfo.symbol} japanese={cashtagInfo.japanese} />
    {/if}

    <ul class="profile-tab">
      <li class="profile-tab__item" onclick={() => currentPage = 'posts'} class:profile-tab__item--active={currentPage === 'posts'}><a href="/search?q={encodeURIComponent(q)}" data-sveltekit-noscroll data-sveltekit-replacestate>{$_('posts')}</a></li>
      <li class="profile-tab__item" onclick={() => currentPage = 'user'} class:profile-tab__item--active={currentPage === 'user'}><a href="/search/user?q={encodeURIComponent(q)}" data-sveltekit-noscroll data-sveltekit-replacestate>{$_('user')}</a></li>
      <li class="profile-tab__item" onclick={() => currentPage = 'feeds'} class:profile-tab__item--active={currentPage === 'feeds'}><a href="/search/feeds?q={encodeURIComponent(q)}" data-sveltekit-noscroll data-sveltekit-replacestate>{$_('feeds')}</a></li>
      <li class="profile-tab__item" onclick={() => currentPage = 'articles'} class:profile-tab__item--active={currentPage === 'articles'}><a href="/search/articles?q={encodeURIComponent(q)}" data-sveltekit-noscroll data-sveltekit-replacestate>{$_('network_feed')}</a></li>
    </ul>

    <div class="page-search-content">
      {#key params}
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