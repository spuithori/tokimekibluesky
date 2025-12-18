<script lang="ts">
  import {_} from 'svelte-i18n';
  import type {LayoutData} from "./$types";
  import {page} from "$app/stores";
  import { ArrowLeft, BellRing, Database, GanttChartSquare, Hand, Heart, Layers, Palette, Settings, WholeWord, X, CalendarClock } from "lucide-svelte";
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

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/schedule'}>
            <div class="p-menu-nav__icon">
              <CalendarClock size="24" color="var(--text-color-1)"></CalendarClock>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/schedule">{$_('schedule_post_title')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/data'}>
            <div class="p-menu-nav__icon">
              <Database size="24" color="var(--text-color-1)"></Database>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/data">{$_('settings_data_management')}</a></p>
          </li>

          <li class="p-menu-nav__item p-menu-nav__item--bottom" class:p-menu-nav__item--current={$page.url.pathname === '/settings/about'}>
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

          <li class="p-menu-nav__item p-menu-nav__item--icons">
            <div class="settings-social-list">
              <a class="settings-social-list__item" href="/profile/tokimeki.blue" aria-label="Bluesky">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M439.8 358.7C436.5 358.3 433.1 357.9 429.8 357.4C433.2 357.8 436.5 358.3 439.8 358.7zM320 291.1C293.9 240.4 222.9 145.9 156.9 99.3C93.6 54.6 69.5 62.3 53.6 69.5C35.3 77.8 32 105.9 32 122.4C32 138.9 41.1 258 47 277.9C66.5 343.6 136.1 365.8 200.2 358.6C203.5 358.1 206.8 357.7 210.2 357.2C206.9 357.7 203.6 358.2 200.2 358.6C106.3 372.6 22.9 406.8 132.3 528.5C252.6 653.1 297.1 501.8 320 425.1C342.9 501.8 369.2 647.6 505.6 528.5C608 425.1 533.7 372.5 439.8 358.6C436.5 358.2 433.1 357.8 429.8 357.3C433.2 357.7 436.5 358.2 439.8 358.6C503.9 365.7 573.4 343.5 593 277.9C598.9 258 608 139 608 122.4C608 105.8 604.7 77.7 586.4 69.5C570.6 62.4 546.4 54.6 483.2 99.3C417.1 145.9 346.1 240.4 320 291.1z"/></svg>
              </a>

              <a class="settings-social-list__item" href="https://discord.gg/DAU6RJsqj3" target="_blank" rel="noopener" aria-label="Discord">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M524.5 133.8C524.3 133.5 524.1 133.2 523.7 133.1C485.6 115.6 445.3 103.1 404 96C403.6 95.9 403.2 96 402.9 96.1C402.6 96.2 402.3 96.5 402.1 96.9C396.6 106.8 391.6 117.1 387.2 127.5C342.6 120.7 297.3 120.7 252.8 127.5C248.3 117 243.3 106.8 237.7 96.9C237.5 96.6 237.2 96.3 236.9 96.1C236.6 95.9 236.2 95.9 235.8 95.9C194.5 103 154.2 115.5 116.1 133C115.8 133.1 115.5 133.4 115.3 133.7C39.1 247.5 18.2 358.6 28.4 468.2C28.4 468.5 28.5 468.7 28.6 469C28.7 469.3 28.9 469.4 29.1 469.6C73.5 502.5 123.1 527.6 175.9 543.8C176.3 543.9 176.7 543.9 177 543.8C177.3 543.7 177.7 543.4 177.9 543.1C189.2 527.7 199.3 511.3 207.9 494.3C208 494.1 208.1 493.8 208.1 493.5C208.1 493.2 208.1 493 208 492.7C207.9 492.4 207.8 492.2 207.6 492.1C207.4 492 207.2 491.8 206.9 491.7C191.1 485.6 175.7 478.3 161 469.8C160.7 469.6 160.5 469.4 160.3 469.2C160.1 469 160 468.6 160 468.3C160 468 160 467.7 160.2 467.4C160.4 467.1 160.5 466.9 160.8 466.7C163.9 464.4 167 462 169.9 459.6C170.2 459.4 170.5 459.2 170.8 459.2C171.1 459.2 171.5 459.2 171.8 459.3C268 503.2 372.2 503.2 467.3 459.3C467.6 459.2 468 459.1 468.3 459.1C468.6 459.1 469 459.3 469.2 459.5C472.1 461.9 475.2 464.4 478.3 466.7C478.5 466.9 478.7 467.1 478.9 467.4C479.1 467.7 479.1 468 479.1 468.3C479.1 468.6 479 468.9 478.8 469.2C478.6 469.5 478.4 469.7 478.2 469.8C463.5 478.4 448.2 485.7 432.3 491.6C432.1 491.7 431.8 491.8 431.6 492C431.4 492.2 431.3 492.4 431.2 492.7C431.1 493 431.1 493.2 431.1 493.5C431.1 493.8 431.2 494 431.3 494.3C440.1 511.3 450.1 527.6 461.3 543.1C461.5 543.4 461.9 543.7 462.2 543.8C462.5 543.9 463 543.9 463.3 543.8C516.2 527.6 565.9 502.5 610.4 469.6C610.6 469.4 610.8 469.2 610.9 469C611 468.8 611.1 468.5 611.1 468.2C623.4 341.4 590.6 231.3 524.2 133.7zM222.5 401.5C193.5 401.5 169.7 374.9 169.7 342.3C169.7 309.7 193.1 283.1 222.5 283.1C252.2 283.1 275.8 309.9 275.3 342.3C275.3 375 251.9 401.5 222.5 401.5zM417.9 401.5C388.9 401.5 365.1 374.9 365.1 342.3C365.1 309.7 388.5 283.1 417.9 283.1C447.6 283.1 471.2 309.9 470.7 342.3C470.7 375 447.5 401.5 417.9 401.5z"/></svg>
              </a>

              <a class="settings-social-list__item" href="https://github.com/spuithori/tokimekibluesky" target="_blank" rel="noopener" aria-label="GitHub">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640"><path d="M237.9 461.4C237.9 463.4 235.6 465 232.7 465C229.4 465.3 227.1 463.7 227.1 461.4C227.1 459.4 229.4 457.8 232.3 457.8C235.3 457.5 237.9 459.1 237.9 461.4zM206.8 456.9C206.1 458.9 208.1 461.2 211.1 461.8C213.7 462.8 216.7 461.8 217.3 459.8C217.9 457.8 216 455.5 213 454.6C210.4 453.9 207.5 454.9 206.8 456.9zM251 455.2C248.1 455.9 246.1 457.8 246.4 460.1C246.7 462.1 249.3 463.4 252.3 462.7C255.2 462 257.2 460.1 256.9 458.1C256.6 456.2 253.9 454.9 251 455.2zM316.8 72C178.1 72 72 177.3 72 316C72 426.9 141.8 521.8 241.5 555.2C254.3 557.5 258.8 549.6 258.8 543.1C258.8 536.9 258.5 502.7 258.5 481.7C258.5 481.7 188.5 496.7 173.8 451.9C173.8 451.9 162.4 422.8 146 415.3C146 415.3 123.1 399.6 147.6 399.9C147.6 399.9 172.5 401.9 186.2 425.7C208.1 464.3 244.8 453.2 259.1 446.6C261.4 430.6 267.9 419.5 275.1 412.9C219.2 406.7 162.8 398.6 162.8 302.4C162.8 274.9 170.4 261.1 186.4 243.5C183.8 237 175.3 210.2 189 175.6C209.9 169.1 258 202.6 258 202.6C278 197 299.5 194.1 320.8 194.1C342.1 194.1 363.6 197 383.6 202.6C383.6 202.6 431.7 169 452.6 175.6C466.3 210.3 457.8 237 455.2 243.5C471.2 261.2 481 275 481 302.4C481 398.9 422.1 406.6 366.2 412.9C375.4 420.8 383.2 435.8 383.2 459.3C383.2 493 382.9 534.7 382.9 542.9C382.9 549.4 387.5 557.3 400.2 555C500.2 521.8 568 426.9 568 316C568 177.3 455.5 72 316.8 72zM169.2 416.9C167.9 417.9 168.2 420.2 169.9 422.1C171.5 423.7 173.8 424.4 175.1 423.1C176.4 422.1 176.1 419.8 174.4 417.9C172.8 416.3 170.5 415.6 169.2 416.9zM158.4 408.8C157.7 410.1 158.7 411.7 160.7 412.7C162.3 413.7 164.3 413.4 165 412C165.7 410.7 164.7 409.1 162.7 408.1C160.7 407.5 159.1 407.8 158.4 408.8zM190.8 444.4C189.2 445.7 189.8 448.7 192.1 450.6C194.4 452.9 197.3 453.2 198.6 451.6C199.9 450.3 199.3 447.3 197.3 445.4C195.1 443.1 192.1 442.8 190.8 444.4zM179.4 429.7C177.8 430.7 177.8 433.3 179.4 435.6C181 437.9 183.7 438.9 185 437.9C186.6 436.6 186.6 434 185 431.7C183.6 429.4 181 428.4 179.4 429.7z"/></svg>
              </a>
            </div>
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
                      background-color: var(--border-color-2);
                  }
              }
          }
      }
  }

  .settings-social-list {
    display: flex;
    justify-content: center;
    gap: 16px;
    width: 100%;
    background-color: var(--bg-color-2);
    padding: 8px 8px 6px;
    border-radius: var(--border-radius-4);

    &__item {
      width: 30px;
      height: 30px;
      display: grid;
      place-items: center;
    }

    svg {
      width: 24px;
      height: 24px;
      fill: var(--text-color-2);
    }
  }
</style>