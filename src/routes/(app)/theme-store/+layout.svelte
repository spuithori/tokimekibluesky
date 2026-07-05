<script lang="ts">
    import Palette from '@lucide/svelte/icons/palette';
    import Folder from '@lucide/svelte/icons/folder';
    import Ticket from '@lucide/svelte/icons/ticket';
    import {_} from 'tokimeki-i18n';
    import { fly } from 'svelte/transition';
    import type {LayoutData} from "./$types";
    import {page} from "$app/stores";

  interface Props {
    data: LayoutData;
    children?: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();
    let navs = [];
</script>

<div class="settings-modal">
  <div class="settings-modal-content">
    <div class="settings-column" data-path="{data.pathname}">
      <div class="settings-toc">
        <ul class="p-menu-nav p-menu-nav--separate">
          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/theme-store'}>
            <div class="p-menu-nav__icon">
              <Palette color="var(--text-color-1)" />
            </div>
            <p class="p-menu-nav__title"><a href="/theme-store">{$_('theme_store')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/theme-store/mytheme'}>
            <div class="p-menu-nav__icon">
              <Folder color="var(--text-color-1)" />
            </div>
            <p class="p-menu-nav__title"><a href="/theme-store/mytheme">{$_('theme_store_my_theme')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/theme-store/code'}>
            <div class="p-menu-nav__icon">
              <Ticket color="var(--text-color-1)" />
            </div>
            <p class="p-menu-nav__title"><a href="/theme-store/code">{$_('theme_store_code')}</a></p>
          </li>

          <li class="p-menu-nav__item p-menu-nav__item--bottom">
            <div class="p-menu-nav__icon">
              <Palette color="var(--text-color-1)" />
            </div>
            <p class="p-menu-nav__title"><a href="/settings/design" onclick={close}>{$_('settings_design_in_themes')}</a></p>
          </li>
        </ul>
      </div>

      <div class="settings-content">
        {#key data.pathname}
          <div class="settings-content-container" in:fly={{ x: 25, duration: 100, delay: 100 }}
               out:fly={{ duration: 100 }}>
            {@render children?.()}
          </div>
        {/key}
      </div>
    </div>
  </div>

  <a class="modal-background-close" aria-hidden="true" href="/"></a>
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