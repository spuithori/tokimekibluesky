<script lang="ts">
  import { _, locale  } from 'svelte-i18n'
  import Header from './Header.svelte';
  import '../styles.css';
  import { agent, isLogin, theme, nonoto, service, supabase, supabaseSession, settings, currentAlgorithm } from '$lib/stores';
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
  import {PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL} from "$env/static/public";
  import { createClient } from '@supabase/supabase-js'

  import {scrollDirection} from "$lib/scrollDirection";
  import Footer from "./Footer.svelte";

  inject({ mode: dev ? 'development' : 'production' });

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

  const sbClient = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);
  supabase.set(sbClient);

  sbClient.auth.getSession().then(({ data }) => {
      supabaseSession.set(data.session);
  });

  sbClient.auth.onAuthStateChange((_event, _session) => {
      supabaseSession.set(_session);
  });

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
  });

  async function syncSignOut() {
      await $supabase.auth.signOut();
      location.reload();
  }

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

  <main class="main">
    <div class="sync-nav">
      {#if ($supabaseSession)}
        TOKIMEKI Sync version private beta.<br>
        同期サービスログイン中 / <button style="color: var(--primary-color);" on:click={syncSignOut}>ログアウト</button>
      {:else}
        <a href="/sync/login/">同期サービスにログイン</a>
      {/if}
    </div>

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

  .sync-nav {
      text-align: center;
      margin-bottom: 15px;
  }
</style>
