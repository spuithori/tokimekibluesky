<script lang="ts">
    import { _ } from 'svelte-i18n';
    import {createEventDispatcher} from 'svelte';
    import {liveQuery} from "dexie";
    import {accountsDb} from "$lib/db";
    import ProfileMenuItem from "$lib/components/acp/ProfileMenuItem.svelte";
    const dispatch = createEventDispatcher();

    function close() {
        dispatch('close');
    }

    $: profiles = liveQuery(async () => {
        const profiles = await accountsDb.profiles
            .limit(3)
            .toArray();
        return profiles;
    });

    $: currentProfile = Number(localStorage.getItem('currentProfile') || profiles[0].id );
</script>

<div class="p-menu">
  {#if $profiles}
    <div class="p-menu-profiles">
      {#each $profiles as profile}
        <ProfileMenuItem {profile} isCurrent={currentProfile === profile.id} on:reload></ProfileMenuItem>
      {/each}
    </div>
  {/if}

  <div class="p-menu-profiles-more">
    <p class="p-menu-profiles-more__title"><a href="/settings/profiles" on:click={close}>{$_('profiles_and_accounts_management')}</a></p>
  </div>

  <ul class="p-menu-nav">
    <li class="p-menu-nav__item">
      <div class="p-menu-nav__icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
      </div>
      <p class="p-menu-nav__title"><a href="/settings" on:click={close}>{$_('settings')}</a></p>
    </li>

    <li class="p-menu-nav__item">
      <div class="p-menu-nav__icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-palette"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
      </div>
      <p class="p-menu-nav__title"><a href="/settings/design" on:click={close}>{$_('settings_design')}</a></p>
    </li>

    <li class="p-menu-nav__item">
      <div class="p-menu-nav__icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-gantt-chart-square"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 8h7"/><path d="M8 12h6"/><path d="M11 16h5"/></svg>
      </div>
      <p class="p-menu-nav__title"><a href="/settings/timeline" on:click={close}>{$_('settings_timeline')}</a></p>
    </li>

    <li class="p-menu-nav__item">
      <div class="p-menu-nav__icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-whole-word"><circle cx="7" cy="12" r="3"/><path d="M10 9v6"/><circle cx="17" cy="12" r="3"/><path d="M14 7v8"/><path d="M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1"/></svg>
      </div>
      <p class="p-menu-nav__title"><a href="/settings/keyword-mutes" on:click={close}>{$_('settings_keyword_mutes')}</a></p>
    </li>

    <li class="p-menu-nav__item">
      <div class="p-menu-nav__icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell-ring"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/><path d="M22 8c0-2.3-.8-4.3-2-6"/></svg>
      </div>
      <p class="p-menu-nav__title"><a href="/settings/push-notification" on:click={close}>{$_('settings_push_notification')}</a></p>
    </li>

    <li class="p-menu-nav__item">
      <div class="p-menu-nav__icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-heart"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
      </div>
      <p class="p-menu-nav__title"><a href="/settings/about" on:click={close}>{$_('settings_about')}</a></p>
    </li>
  </ul>
</div>

<style lang="postcss">
  .p-menu {
      position: absolute;
      padding: 20px;
      box-shadow: 0 3px 6px var(--box-shadow-color-1);
      border-radius: 6px;
      width: max-content;
      max-width: 340px;
      background-color: var(--bg-color-1);
      z-index: 14;

      @media (max-width: 767px) {
          max-width: calc(100vw - 40px);
      }
  }

  .p-menu-profiles {
      margin-bottom: 10px;
  }

  .p-menu-profiles-more {
      margin-bottom: 10px;

      a {
          display: inline-block;
          padding: 5px 0;
      }
  }

  .p-menu-nav {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      list-style: none;
      text-align: center;

      &__icon {
          width: 36px;
          height: 36px;
          display: grid;
          place-content: center;
      }

      &__item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          border-radius: 4px;
          background-color: var(--bg-color-2);
          padding: 10px 5px 5px;
          aspect-ratio: 1/1;
          transition: background-color .15s ease-in-out;
          gap: 4px;

          &:hover {
              background-color: var(--border-color-1);
          }
      }

      &__title {
          line-height: 1.3;
          font-size: 13px;
          height: 36px;
          display: flex;
          align-items: center;
          letter-spacing: -.05em;

          a {
              color: inherit;

              &:hover {
                  text-decoration: none;
              }

              &::before {
                  content: '';
                  display: block;
                  position: absolute;
                  left: 0;
                  right: 0;
                  bottom: 0;
                  top: 0;
              }
          }
      }
  }
</style>