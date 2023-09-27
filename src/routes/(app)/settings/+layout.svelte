<script lang="ts">
  import {_} from 'svelte-i18n';
  import type {LayoutData} from "./$types";
  import {page} from "$app/stores";

  export let data: LayoutData;
  let navs = [];

  $: {
      navs = [
          {
              name: 'profiles',
              path: '/settings/profiles',
              display: $_('settings_profiles'),
              disabled: false,
          },
          {
              name: 'general',
              path: '/settings/general',
              display: $_('settings_general'),
              disabled: false,
          },
          {
              name: 'design',
              path: '/settings/design',
              display: $_('settings_design'),
              disabled: false,
          },
          {
              name: 'timeline',
              path: '/settings/timeline',
              display: $_('settings_timeline'),
              disabled: false,
          },
          {
              name: 'moderation',
              path: '/settings/moderation',
              display: $_('settings_moderation'),
              disabled: false,
          },
          {
              name: 'blocks',
              path: '/settings/blocks',
              display: $_('settings_blocks'),
              disabled: false,
          },
          {
              name: 'mutes',
              path: '/settings/mutes',
              display: $_('settings_mutes'),
              disabled: false,
          },
          {
              name: 'keyword-mutes',
              path: '/settings/keyword-mutes',
              display: $_('settings_keyword_mutes'),
              disabled: false,
          },
          {
              name: 'lang-filter',
              path: '/settings/lang-filter',
              display: $_('settings_lang_filter'),
              disabled: false,
          },
          {
              name: 'invite-codes',
              path: '/settings/invite-codes',
              display: $_('settings_invite_codes'),
              disabled: false,
          },
          {
              name: 'push-notification',
              path: '/settings/push-notification',
              display: $_('settings_push_notification'),
              disabled: false,
          },
          {
              name: 'about',
              path: '/settings/about',
              display: $_('settings_about'),
              disabled: false,
          },
      ]
  }

  function close() {

  }
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

          <h1 class="column-heading__title">{$_('settings')}</h1>

          <div class="column-heading__buttons column-heading__buttons--right">
            <a class="settings-back" href="/">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </a>
          </div>
        </div>

        <ul class="p-menu-nav">
          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/profiles'}>
            <div class="p-menu-nav__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder-heart"><path d="M11 20H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H20a2 2 0 0 1 2 2v1.5"/><path d="M21.29 13.7a2.43 2.43 0 0 0-2.65-.52c-.3.12-.57.3-.8.53l-.34.34-.35-.34a2.43 2.43 0 0 0-2.65-.53c-.3.12-.56.3-.79.53-.95.94-1 2.53.2 3.74L17.5 21l3.6-3.55c1.2-1.21 1.14-2.8.19-3.74Z"/></svg>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/profiles" on:click={close}>{$_('settings_profiles')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/general'}>
            <div class="p-menu-nav__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/general" on:click={close}>{$_('settings_general')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/design'}>
            <div class="p-menu-nav__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-palette"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/design" on:click={close}>{$_('settings_design')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/timeline'}>
            <div class="p-menu-nav__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gantt-chart-square"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 8h7"/><path d="M8 12h6"/><path d="M11 16h5"/></svg>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/timeline" on:click={close}>{$_('settings_timeline')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/moderation'}>
            <div class="p-menu-nav__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hand"><path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/><path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/moderation" on:click={close}>{$_('settings_moderation')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/keyword-mutes'}>
            <div class="p-menu-nav__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-whole-word"><circle cx="7" cy="12" r="3"/><path d="M10 9v6"/><circle cx="17" cy="12" r="3"/><path d="M14 7v8"/><path d="M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1"/></svg>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/keyword-mutes" on:click={close}>{$_('settings_keyword_mutes')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/lang-filter'}>
            <div class="p-menu-nav__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe-2"><path d="M21.54 15H17a2 2 0 0 0-2 2v4.54"/><path d="M7 3.34V5a3 3 0 0 0 3 3v0a2 2 0 0 1 2 2v0c0 1.1.9 2 2 2v0a2 2 0 0 0 2-2v0c0-1.1.9-2 2-2h3.17"/><path d="M11 21.95V18a2 2 0 0 0-2-2v0a2 2 0 0 1-2-2v-1a2 2 0 0 0-2-2H2.05"/><circle cx="12" cy="12" r="10"/></svg>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/lang-filter" on:click={close}>{$_('settings_lang_filter')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/invite-codes'}>
            <div class="p-menu-nav__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-qr-code"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/invite-codes" on:click={close}>{$_('settings_invite_codes')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/push-notification'}>
            <div class="p-menu-nav__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell-ring"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/><path d="M22 8c0-2.3-.8-4.3-2-6"/></svg>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/push-notification" on:click={close}>{$_('settings_push_notification')}</a></p>
          </li>

          <li class="p-menu-nav__item" class:p-menu-nav__item--current={$page.url.pathname === '/settings/about'}>
            <div class="p-menu-nav__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
            </div>
            <p class="p-menu-nav__title"><a href="/settings/about" on:click={close}>{$_('settings_about')}</a></p>
          </li>
        </ul>
      </div>

      <div class="settings-content">
        {#key data.pathname}
          <div class="settings-content-container">
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
</style>