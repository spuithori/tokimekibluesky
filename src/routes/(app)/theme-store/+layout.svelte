<script lang="ts">
    import {_} from 'svelte-i18n';
    import { fly } from 'svelte/transition';
    import type {LayoutData} from "./$types";
    import {page} from "$app/stores";

    export let data: LayoutData;
    let navs = [];
</script>

<div class="settings-modal">
  <div class="settings-modal-content">
    <div class="settings-column" data-path="{data.pathname}">
      <div class="settings-toc">
        <div class="column-heading only-mobile">
          <div class="column-heading__buttons">
            <button class="settings-back" on:click={() => {history.back()}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
            </button>
          </div>

          <h1 class="column-heading__title">{$_('theme_store')}</h1>

          <div class="column-heading__buttons column-heading__buttons--right">
            <a class="settings-back" href="/">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </a>
          </div>
        </div>

        <ul class="p-menu-nav">
          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/theme-store'}>
            <div class="p-menu-nav__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-palette"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
            </div>
            <p class="p-menu-nav__title"><a href="/theme-store" on:click={close}>{$_('theme_store')}</a></p>
          </li>
        </ul>
      </div>

      <div class="settings-content">
        {#key data.pathname}
          <div class="settings-content-container" in:fly={{ x: 25, duration: 100, delay: 100 }}
               out:fly={{ duration: 100 }}>
            <slot></slot>
          </div>
        {/key}
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
    .settings-column {
        background-color: var(--bg-color-1);
        display: grid;
        grid-template-columns: 300px 1fr;
        height: 100%;

        @media (max-width: 767px) {
            display: block;
        }

        &[data-path='/theme-store'] {
            .settings-toc {
                @media (max-width: 767px) {
                    display: block;
                    border-right: none;
                }
            }
        }
    }

    .settings-content {
        min-width: 0;
        height: 100%;
        overflow-y: scroll;

        @media (max-width: 767px) {
            padding-left: 0;
        }
    }

    .settings-toc {
        padding: 16px;
        border-right: 1px solid var(--border-color-2);

        @media (max-width: 767px) {
            display: none;
            padding: 0;

            .p-menu-nav {
                padding: 16px;
            }
        }
    }
</style>