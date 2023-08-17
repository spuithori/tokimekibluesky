<script lang="ts">
  import { _, locale  } from 'svelte-i18n'
  import Header from './Header.svelte';
  import '../styles.css';
  import {agent, agents, settings,
    preferences,
    columns,
    singleColumn,
    isMobileDataConnection,
    isAfterReload
  } from '$lib/stores';
  import { Agent } from '$lib/agent';
  import { AtpAgent, AtpSessionData, AtpSessionEvent } from '@atproto/api';
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import { inject } from '@vercel/analytics';
  import Publish from "./Publish.svelte";
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
  import HeaderCollapseButton from "$lib/components/header/HeaderCollapseButton.svelte";

  let loaded = false;

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
        const id = await accountsDb.profiles.put({
          accounts: anyAccounts.map(account => account.id) as number[],
          columns: [],
          createdAt: "",
          name: "",
          primary: 0
        })
      localStorage.setItem('currentProfile', id);
    }

    const currentProfile = Number(localStorage.getItem('currentProfile') || profiles[0].id );
    const profile = profiles.find(profile => profile.id === currentProfile);
    console.log(profile);
    const accounts = await accountsDb.accounts
        .where('id')
        .anyOf(profile.accounts)
        .toArray();

    if (!accounts && !profile) {
        console.log('Account is empty in this profile.');
        // await goto('/login');
        return false;
    }

    if (!profile.accounts.length) {
        console.log('There is no account in this profile.');
        // await goto('/login');
        return false;
    }

    let agentsArray = [];

    for (const account of accounts) {
        const ag = new AtpAgent({
            service: account.service,
            persistSession: async (evt: AtpSessionEvent, sess?: AtpSessionData) => {
                if (sess) {
                    account.session = sess;
                }

                const id = await accountsDb.accounts.put({
                    id: account.id,
                    session: account.session,
                    did: sess.did,
                    service: account.service
                })
            }
        })

        await ag.resumeSession(account.session);

        //agentsMap.set(account.id, new Agent(ag));
      agentsArray = [...agentsArray, new Agent(ag)];
    }

    agents.set(agentsArray);
    agent.set(agentsArray[0]);

    console.log($agent);

    loaded = true;
  }

  //let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
  // let currentAccount = Number(localStorage.getItem('currentAccount') || '0' );
  let direction = 'up';
  let scrolly;
  let isDarkMode = false;

  if (navigator.connection) {
      navigator.connection.addEventListener('change', () => {
          isMobileDataConnection.set(navigator.connection.type === 'cellular');
      })
  }

  /* if (accounts.length <= currentAccount && currentAccount > 0) {
      currentAccount = currentAccount - 1;
      localStorage.setItem('currentAccount', String(currentAccount))
  }

  const session = accounts[currentAccount]?.session;
  if (!session) {
      goto('/login');
  } */

  if ($settings?.general.language) {
      locale.set($settings.general.language);
  }

  /* try {
      let ag = new AtpAgent({
          service: accounts[currentAccount].service,
          persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
              accounts[currentAccount].session = sess;
              localStorage.setItem('accounts', JSON.stringify(accounts))
          }
      });

      ag.resumeSession(accounts[currentAccount].session);
      agent.set(new Agent(ag));
  } catch (e) {
      goto('/login');
  } */

  $: {
      localStorage.setItem('settings', JSON.stringify($settings));
      locale.set($settings.general.language);

      localStorage.setItem('columns', JSON.stringify($columns));
      localStorage.setItem('singleColumn', JSON.stringify($singleColumn));

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

  onMount(async() => {
      if (pwaInfo) {
          const { registerSW } = await import('virtual:pwa-register')
          registerSW({
              immediate: true,
              onRegistered(r) {
                 r && setInterval(() => {
                     r.update()
                 }, 20000)

                  console.log(`SW Registered`)
              },
              onRegisterError(error) {
                  console.log('SW registration error', error)
              }
          })
      }

      const prefRes = await $agent.agent.api.app.bsky.actor.getPreferences();
      preferences.set(prefRes.data.preferences);

      sessionStorage.clear();
      isAfterReload.set(false);
  });

  function handleScroll(event) {
      const scroll = scrollDirection(event);

      if (scroll) {
          direction = scroll;
      }
  }

  viewPortSetting();
</script>

<svelte:window on:scroll={handleScroll} bind:scrollY={scrolly}></svelte:window>

{#if (loaded)}
  <div
    class:nonoto={$settings?.design.nonoto || false}
    class:darkmode={isDarkMode}
    class:twilight={$settings.design?.darkmode === 'twilight'}
    class:scrolled={scrolly > 100}
    class:sidebar={$settings.design?.publishPosition === 'left'}
    class="app scroll-{direction} theme-{$settings?.design.theme} {$_('dir', {default: 'ltr'})} lang-{$locale}"
    dir="{$_('dir', {default: 'ltr'})}"
    class:header-hide={$settings?.design.layout === 'decks' && $settings?.design.headerHide && $page.url.pathname === '/'}class:compact={$settings.design?.postsLayout === 'compact'}
    class:minimum={$settings.design?.postsLayout === 'minimum'}
  >
    <Header />

    {#if ($settings.design?.layout === 'decks' && $page.url.pathname === '/') && $settings.design?.publishPosition !== 'left'}
      <HeaderCollapseButton></HeaderCollapseButton>
    {/if}

    <div class="wrap" class:layout-sidebar={$settings.design?.publishPosition === 'left'}>
      <main class="main" class:layout-decks={$settings.design.layout === 'decks'}>
        <slot />
      </main>

      <Publish></Publish>
    </div>

    <Footer></Footer>
    <Toaster></Toaster>
    <ReportObserver></ReportObserver>
  </div>
{:else}
  <div>

  </div>
{/if}

<style lang="postcss">
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 100%;
    max-width: 780px;
    padding: 30px 20px 0;
    margin: 0 auto 40px;
    box-sizing: border-box;

    @media (max-width: 767px) {
        margin-bottom: 20px;
    }
  }
</style>
