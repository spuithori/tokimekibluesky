<script lang="ts">
  import { _ } from 'svelte-i18n'
  import Header from './Header.svelte';
  import '../styles.css';
  import { agent, isLogin, theme, nonoto, isDarkMode, service } from '$lib/stores';
  import { Agent } from '$lib/agent';
  import { AtpAgent, AtpSessionData, AtpSessionEvent } from '@atproto/api';
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import { inject } from '@vercel/analytics';
  import Publish from "./Publish.svelte";
  import { pwaInfo } from 'virtual:pwa-info';
  import {onMount} from 'svelte';
  import toast, {Toaster} from 'svelte-french-toast'

  inject({ mode: dev ? 'development' : 'production' });

  let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
  let currentAccount = Number(localStorage.getItem('currentAccount') || '0' );

  if (accounts.length <= currentAccount && currentAccount > 0) {
      currentAccount = currentAccount - 1;
      localStorage.setItem('currentAccount', String(currentAccount))
  }

  const session = accounts[currentAccount]?.session;
  if (!session) {
      goto('/login');
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
  })
</script>

<svelte:head>
</svelte:head>

<div class:nonoto={JSON.parse($nonoto)} class:darkmode={JSON.parse($isDarkMode)} class="app theme-{$theme} {$_('dir', {default: 'ltr'})}" dir="{$_('dir', {default: 'ltr'})}">
  <Header />

  <main class="main">
    <slot />
  </main>

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
