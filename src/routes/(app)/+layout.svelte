<script lang="ts">
  import {_, isLoading, locale} from 'svelte-i18n'
  import '../styles.css';
  import {
      agent, agents, settings,
      preferences,
      columns,
      singleColumn,
      isMobileDataConnection,
      isAfterReload, profileStatus,
      isColumnModalOpen, timelines, cursors, globalUnique, currentTimeline
  } from '$lib/stores';
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import { inject } from '@vercel/analytics';
  import { pwaInfo } from 'virtual:pwa-info';
  import { onMount } from 'svelte';
  import toast, { Toaster } from 'svelte-french-toast';
  import viewPortSetting from '$lib/viewport';
  import {scrollDirection} from "$lib/scrollDirection";
  import Footer from "./Footer.svelte";
  import { page } from '$app/stores';
  import { liveQuery } from 'dexie';
  import {accountsDb} from '$lib/db';
  import ReportObserver from "$lib/components/report/ReportObserver.svelte";
  import {resumeAccountsSession} from "$lib/resumeAccountsSession";
  import ProfileStatusObserver from "$lib/components/acp/ProfileStatusObserver.svelte";
  import Side from "./Side.svelte";
  import ColumnModal from "$lib/components/column/ColumnModal.svelte";
  import Single from "./Single.svelte";
  import Decks from "./Decks.svelte";
  import NotificationCountObserver from "$lib/components/utils/NotificationCountObserver.svelte";

  let loaded = false;
  let wrap;

  inject(
      {
          mode: dev ? 'development' : 'production',
          beforeSend: event => {
              if (event.url.includes('/settings') || event.url.includes('/login') || event.url.includes('/search') || event.url.includes('/shared') || event.url.includes('#post')) {
                  return null;
              }
              return event;
          }
      },
  );

  let accounts = liveQuery(
      () => accountsDb.accounts.toArray()
  );

  let profiles = liveQuery(
      () => accountsDb.profiles.toArray()
  );

  $: {
      if ($profiles) {
          initProfile($profiles);
      }
  }

  async function initProfile(profiles) {
    const anyAccounts = await accountsDb.accounts
            .toArray();

    if (!anyAccounts.length) {
      console.log('Accounts are nothing');
      await goto('/login');
      return false;
    }

    if (loaded) {
        return false;
    }

    if (!profiles.length) {
        console.log('Profiles are empty. create new profile.');
        const acs = anyAccounts.map(account => account.id);
        const id = await accountsDb.profiles.put({
          accounts: acs as number[],
          columns: [],
          createdAt: "",
          name: "New Profile",
          primary: acs[0] as number,
        })
      localStorage.setItem('currentProfile', id);
    }

    const currentProfile = Number(localStorage.getItem('currentProfile') || profiles[0].id );
    const profile = profiles.find(profile => profile.id === currentProfile);
    const accounts = await accountsDb.accounts
        .where('id')
        .anyOf(profile.accounts)
        .toArray();

    if (!accounts && !profile) {
        console.log('Account is empty in this profile.');
        loaded = true;
        return false;
    }

    if (!profile.accounts.length) {
        console.log('There is no account in this profile.');
        profileStatus.set(1);
        loaded = true;
        return false;
    }

    if (!accounts.length) {
        console.log('Attached accounts are missing in this profile');
        profileStatus.set(2);
        loaded = true;
        return  false;
    }

    let agentsMap = await resumeAccountsSession(accounts);
    let pid;

    if (!profile.primary) {
        try {
            pid = await accountsDb.profiles.update(profile.id, {
                primary: accounts[0].id,
            });
        } catch (e) {
            console.error(e);
        }
    }

    agents.set(agentsMap);
    agent.set($agents.get(profile.primary || accounts[0].id));

    loaded = true;
  }

  let direction = 'up';
  let scrolly;
  let isDarkMode = false;

  if (!$settings.version) {
      $settings.version = 1;
  }
  console.log('settings version: ' + $settings.version || 0);

  if ($settings.version < 2) {
      $settings.design.publishPosition = 'left';
      $settings.design.skin = 'default';
      $settings.version = 2;
  }

  if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
          isMobileDataConnection.set(navigator.connection.type === 'cellular');
      })
  }

  if ($settings?.general.language) {
      locale.set($settings.general.language);
  }

  $: {
      localStorage.setItem('settings', JSON.stringify($settings));
      locale.set($settings.general.language);

      localStorage.setItem('columns', JSON.stringify($columns));
      localStorage.setItem('singleColumn', JSON.stringify($singleColumn));
      localStorage.setItem('currentTimeline', JSON.stringify($currentTimeline));

      if ($settings?.design.darkmode === true) {
          isDarkMode = true;
      } else if ($settings?.design.darkmode === 'prefer') {
          isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
          isDarkMode = false;
      }
  }

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      if ($settings?.design.darkmode === 'prefer') {
          isDarkMode = event.matches
      }
  })

  function handleReload() {
      loaded = false;
  }

  onMount(async() => {
      if (pwaInfo) {
          const { registerSW } = await import('virtual:pwa-register')
          registerSW({
              immediate: true,
              onRegistered(r) {
                 r && setInterval(() => {
                     r.update();
                 }, 20000)

                  console.log(`SW Registered`)
              },
              onRegisterError(error) {
                  console.log('SW registration error', error)
              }
          })
      }

      /* const prefRes = await $agent.agent.api.app.bsky.actor.getPreferences();
      preferences.set(prefRes.data.preferences); */

      sessionStorage.clear();
      isAfterReload.set(false);
  });

  function handleScroll(event) {
      const scroll = scrollDirection(event);

      if (scroll) {
          direction = scroll;
      }
  }

  function handleColumnModalClose(event) {
      $columns = event.detail.columns;
      $timelines = [];
      $cursors = [];
      isColumnModalOpen.set(false);
      globalUnique.set(Symbol());
  }

  viewPortSetting();
</script>

<svelte:window on:scroll={handleScroll} bind:scrollY={scrolly} />

<div
    class:nonoto={$settings?.design.nonoto || false}
    class:darkmode={isDarkMode}
    class:scrolled={scrolly > 52}
    class:sidebar={$settings.design?.publishPosition === 'left'}
    class:bottom={$settings.design?.publishPosition === 'bottom'}
    class="app scroll-{direction} theme-{$settings?.design.theme} {$_('dir', {default: 'ltr'})} lang-{$locale} skin-{$settings.design?.skin}"
    dir="{$_('dir', {default: 'ltr'})}"
    class:compact={$settings.design?.postsLayout === 'compact'}
    class:minimum={$settings.design?.postsLayout === 'minimum'}
    class:single={$settings?.design.layout !== 'decks'}
    class:decks={$settings?.design.layout === 'decks'}
    class:page={$page.url.pathname !== '/'}
>
  {#if (loaded)}
    <div class="wrap"
         class:layout-sidebar={$settings.design?.publishPosition === 'left'}>
      <Side></Side>

      <main class="main" class:layout-decks={$settings.design.layout === 'decks'}>
        {#if $settings.design.layout !== 'decks'}
          <Single></Single>
        {:else}
          <Decks></Decks>
        {/if}

        <slot />
      </main>
    </div>

    {#if $isColumnModalOpen}
      <ColumnModal on:close={handleColumnModalClose} _columns={$columns}></ColumnModal>
    {/if}

    <NotificationCountObserver></NotificationCountObserver>
  {:else}
    <div>

    </div>
  {/if}


  <Footer></Footer>
  <Toaster></Toaster>
  <ReportObserver></ReportObserver>
  <ProfileStatusObserver></ProfileStatusObserver>
</div>

<style lang="postcss">
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100dvh;
  }

  .wrap {
      display: flex;

      @media (max-width: 767px) {
         display: block;
      }
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
  }

  .sidebar {
      .main {
          width: 100%;
      }
  }


  .single {
      .wrap {
          width: 100%;
          max-width: 940px;
          margin: 0 auto;
          align-items: flex-start;
      }

      &.bottom {
          .wrap {
              align-items: stretch;
              max-width: 740px;
          }

          .main {
              @media (max-width: 767px) {
                  padding-top: 0;
              }
          }
      }
  }
</style>
