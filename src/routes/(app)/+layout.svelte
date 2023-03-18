<script lang="ts">
  import Header from './Header.svelte';
  import '../styles.css';
  import { agent, isLogin, theme, nonoto, isDarkMode, service } from '$lib/stores';
  import { Agent } from '$lib/agent';
  import { AtpAgent, AtpSessionData, AtpSessionEvent } from '@atproto/api';
  import { goto } from '$app/navigation';
  import { dev } from '$app/environment';
  import { inject } from '@vercel/analytics';
  import Publish from "./Publish.svelte";

  inject({ mode: dev ? 'development' : 'production' });

  let accounts = JSON.parse(localStorage.getItem('accounts')) || [];
  let currentAccount = Number(localStorage.getItem('currentAccount') || '0' );

  if (accounts.length <= currentAccount) {
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
</script>

<div class:nonoto={JSON.parse($nonoto)} class:darkmode={JSON.parse($isDarkMode)} class="app theme-{$theme}">
  <Header />

  <main class="main">
    <slot />
  </main>

  <Publish></Publish>
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
    margin: 0 auto 160px;
    box-sizing: border-box;

    @media (max-width: 767px) {
        margin-bottom: 20px;
    }
  }
</style>
