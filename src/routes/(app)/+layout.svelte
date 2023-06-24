<script lang="ts">
  import { _, locale  } from 'svelte-i18n'
  import Header from './Header.svelte';
  import '../styles.css';
  import {agent, settings, preferences, columns, singleColumn} from '$lib/stores';
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

  let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
  let currentAccount = Number(localStorage.getItem('currentAccount') || '0' );
  let direction = 'up';
  let scrolly;
  let isDarkMode = false;

  if (accounts.length <= currentAccount && currentAccount > 0) {
      currentAccount = currentAccount - 1;
      localStorage.setItem('currentAccount', String(currentAccount))
  }

  const session = accounts[currentAccount]?.session;
  if (!session) {
      goto('/login');
  }

  if ($settings?.general.language) {
      locale.set($settings.general.language);
  }

  try {
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
  }

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

<div
    class:nonoto={$settings?.design.nonoto || false}
    class:darkmode={isDarkMode}
    class:scrolled={scrolly > 100}
    class="app scroll-{direction} theme-{$settings?.design.theme} {$_('dir', {default: 'ltr'})} lang-{$locale}"
    dir="{$_('dir', {default: 'ltr'})}"
>
  <Header />

  <main class="main" class:layout-decks={$settings.design.layout === 'decks'}>
    <slot />
  </main>

  <Footer></Footer>

  <Publish></Publish>
  <Toaster></Toaster>
</div>

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
