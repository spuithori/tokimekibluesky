<script lang="ts">
  import {_} from 'svelte-i18n';
  import type {LayoutData} from "./$types";
  import {page} from "$app/stores";
  import { ArrowLeft, BellRing, Database, GanttChartSquare, Hand, Heart, Layers, Palette, Rocket, Settings, WholeWord, X } from "lucide-svelte";
  import { scale } from 'svelte/transition';

  interface Props {
    data: LayoutData;
    children?: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();
</script>

<div class="settings-modal" class:settings-modal--transparent-bg={$page.url.pathname === '/settings/design'}>
  <div class="settings-modal-content" in:scale={{duration: 250, opacity: 0, start: 0.98}}>
    <div class="settings-column" data-path="{data.pathname}">
      <div class="settings-toc">
        <div class="column-heading only-mobile">
          <div class="column-heading__buttons">
            <button class="settings-back" aria-label="Back" onclick={() => {history.back()}}>
              <ArrowLeft size="24" color="var(--text-color-1)"></ArrowLeft>
            </button>
          </div>

          <h1 class="column-heading__title">{$_('settings')}</h1>

          <div class="column-heading__buttons column-heading__buttons--right">
            <a class="settings-back" href="/">
              <X size="24" color="var(--text-color-1)"></X>
            </a>
          </div>
        </div>

        <ul class="p-menu-nav">
          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/profiles'}>
            <div class="p-menu-nav__icon">
              <Layers size="24" color="var(--text-color-1)"></Layers>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/profiles">{$_('settings_profiles')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/general'}>
            <div class="p-menu-nav__icon">
              <Settings size="24" color="var(--text-color-1)"></Settings>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/general">{$_('settings_general')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/design'}>
            <div class="p-menu-nav__icon">
              <Palette size="24" color="var(--text-color-1)"></Palette>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/design">{$_('settings_design')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/timeline'}>
            <div class="p-menu-nav__icon">
              <GanttChartSquare size="24" color="var(--text-color-1)"></GanttChartSquare>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/timeline">{$_('settings_timeline')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/moderation'}>
            <div class="p-menu-nav__icon">
              <Hand size="24" color="var(--text-color-1)"></Hand>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/moderation">{$_('settings_moderation')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/keyword-mutes'}>
            <div class="p-menu-nav__icon">
              <WholeWord size="24" color="var(--text-color-1)"></WholeWord>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/keyword-mutes">{$_('settings_keyword_mutes')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/push-notification'}>
            <div class="p-menu-nav__icon">
              <BellRing size="24" color="var(--text-color-1)"></BellRing>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/push-notification">{$_('settings_push_notification')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/data'}>
            <div class="p-menu-nav__icon">
              <Database size="24" color="var(--text-color-1)"></Database>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/data">{$_('settings_data_management')}</a></p>
          </li>

          <li class="p-menu-nav__item p-menu-nav__item--bottom" class:p-menu-nav__item--current={$page.url.pathname === '/settings/news'}>
            <div class="p-menu-nav__icon">
              <Rocket size="24" color="var(--text-color-1)"></Rocket>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/news">{$_('settings_news')}</a></p>
            <span class="new-label">NEW</span>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/about'}>
            <div class="p-menu-nav__icon">
              <Heart size="24" color="var(--text-color-1)"></Heart>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/about">{$_('settings_about')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/support'}>
            <div class="p-menu-nav__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="22.006" height="21.998"><defs><linearGradient id="supportIcon" x1=".196" x2=".943" y1="-.064" y2=".909" gradientUnits="objectBoundingBox"><stop offset="0" stop-color="#ca2d95"/><stop offset="1" stop-color="#e0965d"/></linearGradient></defs><g fill="url(#supportIcon)" data-name="グループ 3" transform="translate(-.989 -1.005)"><path d="M12 1a4.975 4.975 0 0 1 3.815 1.767q.216-.019.433-.019a5 5 0 0 1 4.982 5.433 5 5 0 0 1 0 7.628 4.972 4.972 0 0 1-1.443 3.963 5.034 5.034 0 0 1-3.539 1.468q-.21 0-.419-.018a5 5 0 0 1-7.644 0q-.214.018-.429.018a5 5 0 0 1-4.983-5.419 5 5 0 0 1 0-7.657 5 5 0 0 1 4.982-5.411q.215 0 .43.019A4.975 4.975 0 0 1 12 1Zm3.37 3.85a1 1 0 0 1-.842-.461 3 3 0 0 0-5.055 0 1 1 0 0 1-1.061.437A3 3 0 0 0 4.826 8.4a1 1 0 0 1-.441 1.062 3 3 0 0 0 0 5.07 1 1 0 0 1 .441 1.068 3 3 0 0 0 3.585 3.577 1 1 0 0 1 1.063.439 3 3 0 0 0 5.063 0 1 1 0 0 1 1.06-.439 3 3 0 0 0 3.577-3.585 1 1 0 0 1 .437-1.061 3 3 0 0 0 0-5.055 1 1 0 0 1-.437-1.062 3 3 0 0 0-3.585-3.585 1 1 0 0 1-.219.021Z" data-name="パス 4"/><path d="M12 19a1 1 0 0 1-1-1v-6.586L8.293 8.707a1 1 0 0 1 1.414-1.414l3 3A1 1 0 0 1 13 11v7a1 1 0 0 1-1 1Z" data-name="パス 5"/><path d="M12 12a1 1 0 0 1-.707-1.707l3-3a1 1 0 0 1 1.414 1.414l-3 3A1 1 0 0 1 12 12Z" data-name="パス 6"/><path d="M15 13H9a1 1 0 0 1 0-2h6a1 1 0 0 1 0 2Z" data-name="パス 7"/><path d="M15 17H9a1 1 0 0 1 0-2h6a1 1 0 0 1 0 2Z" data-name="パス 8"/></g></svg>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/support">{$_('settings_support')}</a></p>
          </li>
        </ul>
      </div>

      <div class="settings-content">
        {#key data.pathname}
          <div class="settings-content-container">
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

      &[data-path='/settings'] {
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

  .p-menu-nav {
      @media (min-width: 768px) {
          display: flex;
          flex-direction: column;
          height: 100%;

          &__item {


              &--bottom {
                  position: relative;
                  margin-top: auto;

                  &::after {
                      content: '';
                      display: block;
                      position: absolute;
                      top: -8px;
                      left: 0;
                      right: 0;
                      height: 1px;
                      width: 100%;
                      background-color: var(--border-color-1);
                  }
              }
          }
      }
  }
</style>