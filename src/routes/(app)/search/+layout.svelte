<script lang="ts">
import {_} from "svelte-i18n";
import type { LayoutData } from './$types';
import {agent, settings} from "$lib/stores";

export let data: LayoutData;

let currentPage = data.url.pathname.split('/')[2] ?? 'posts';
</script>

<div class="modal-page modal-page--{$settings.design?.layout}">
  <div class="modal-page-content">
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

    <div class="page-search">
      <ul class="gn-tab">
        <li class="gn-tab__item" on:click={() => currentPage = 'posts'} class:gn-tab__item--active={currentPage === 'posts'}><a href="/search/" data-sveltekit-noscroll>{$_('posts')}</a></li>
        <li class="gn-tab__item" on:click={() => currentPage = 'user'} class:gn-tab__item--active={currentPage === 'user'}><a href="/search/user/" data-sveltekit-noscroll>{$_('user')}</a></li>
      </ul>

      <slot></slot>
    </div>
  </div>
</div>

<style lang="postcss">
  .gn-tab {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      list-style: none;
      text-align: center;
      padding: 16px 0;

      &__item {
          border-bottom: 2px solid var(--border-color-1);
          font-size: 16px;
          font-weight: 600;
          letter-spacing: .025em;

          @media (max-width: 959px) {
              font-size: 16px;
          }

          &--active {
              border-bottom-color: var(--primary-color);
          }

          a {
              color: inherit;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
          }
      }
  }
</style>