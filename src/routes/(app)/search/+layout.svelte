<script lang="ts">
import {_} from "svelte-i18n";
import type { LayoutData } from './$types';

export let data: LayoutData;

let currentPage = data.url.pathname.split('/')[2] ?? 'posts';
</script>

<div class="page-search">
  <ul class="gn-tab">
    <li class="gn-tab__item" on:click={() => currentPage = 'posts'} class:gn-tab__item--active={currentPage === 'posts'}><a href="/search/" data-sveltekit-noscroll>{$_('posts')}</a></li>
    <li class="gn-tab__item" on:click={() => currentPage = 'user'} class:gn-tab__item--active={currentPage === 'user'}><a href="/search/user/" data-sveltekit-noscroll>{$_('user')}</a></li>
  </ul>

  <slot></slot>
</div>

<style lang="postcss">
  .gn-tab {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      list-style: none;
      text-align: center;
      margin-bottom: 20px;

      &__item {
          border-bottom: 2px solid var(--border-color-1);
          font-size: 18px;
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