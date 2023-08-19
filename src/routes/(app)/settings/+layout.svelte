<script lang="ts">
  import {_} from 'svelte-i18n';
  import { fly } from 'svelte/transition';
  import type {LayoutData} from "./$types";

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
</script>

<div class="timeline">
  <h1 class="page-nav-title">{$_('settings')}</h1>

  <div class="settings-column" data-path="{data.pathname}">
    <nav class="settings-nav">
      <ul class="settings-nav-list">
        {#each navs as nav}
          <li class="settings-nav-list__item" class:settings-nav-list__item--current={data.pathname === nav.path}>
            <a href="/settings/{nav.name}">{nav.display}</a>
          </li>
        {/each}
      </ul>
    </nav>

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

<style lang="postcss">
  .settings-column {
      display: grid;
      grid-template-columns: 180px 1fr;
      min-height: calc(100vh - 180px);

      @media (max-width: 767px) {
          display: block;
      }

      &[data-path='/settings'] {
          .settings-nav {
              @media (max-width: 767px) {
                  display: block;
                  border-right: none;
              }
          }

          .settings-content {
              background-image: url(/settings-logo-bg.png);
              background-position: center;
          }
      }
  }

  .settings-nav {
      border-right: 1px solid var(--border-color-1);

      @media (max-width: 767px) {
          display: none;
      }
  }

  .settings-nav-list {
      list-style: none;

      &__item {
          color: var(--text-color-3);
          border-left: 3px solid transparent;

          &--current {
              border-left: 3px solid var(--primary-color);
              color: var(--text-color-1);
              font-weight: 600;
          }
      }

      a {
          display: block;
          color: inherit;
          width: 100%;
          padding: 8px 10px;

          &:hover {
              background-color: var(--bg-color-2);
          }
      }
  }

  .settings-content {
      padding-left: 30px;
      min-width: 0;

      @media (max-width: 767px) {
          padding-left: 0;
      }
  }
</style>