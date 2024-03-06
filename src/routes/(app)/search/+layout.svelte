<script lang="ts">
import {_} from "svelte-i18n";
import type { LayoutData } from './$types';
import SearchForm from "../SearchForm.svelte";
import PageModal from "$lib/components/ui/PageModal.svelte";
import {page} from "$app/stores";

export let data: LayoutData;
let unique = Symbol();

let currentPage = data.url.pathname.split('/')[2] ?? 'posts';
let q;

$: handleChangeParams($page.url.searchParams.get('q'));

function handleChangeParams(searchQuery) {
    q = searchQuery;
    unique = Symbol();
}
</script>

<PageModal>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h2 class="column-heading__title">{$_('search')}</h2>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="search-form-wrap">
    <SearchForm path={data.url.pathname} bind:search={q}></SearchForm>
  </div>

  {#key unique}
    {#key data.url.pathname}
      <div class="page-search">
        <ul class="profile-tab">
          <li class="profile-tab__item" on:click={() => currentPage = 'posts'} class:profile-tab__item--active={currentPage === 'posts'}><a href="/search?q={encodeURIComponent(q)}" data-sveltekit-noscroll data-sveltekit-replacestate>{$_('posts')}</a></li>
          <li class="profile-tab__item" on:click={() => currentPage = 'user'} class:profile-tab__item--active={currentPage === 'user'}><a href="/search/user?q={encodeURIComponent(q)}" data-sveltekit-noscroll data-sveltekit-replacestate>{$_('user')}</a></li>
          <li class="profile-tab__item" on:click={() => currentPage = 'feeds'} class:profile-tab__item--active={currentPage === 'feeds'}><a href="/search/feeds?q={encodeURIComponent(q)}" data-sveltekit-noscroll data-sveltekit-replacestate>{$_('feeds')}</a></li>
        </ul>

        <div class="page-search-content">
          <slot></slot>
        </div>
      </div>
    {/key}
  {/key}
</PageModal>

<style lang="postcss">
  .page-search-content {
      margin-top: 16px;
  }

  .search-form-wrap {
      margin: 16px 16px 0;
  }
</style>