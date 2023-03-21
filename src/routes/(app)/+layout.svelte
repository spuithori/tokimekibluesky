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

  let search = '';

  const session = localStorage.getItem('session');
  if (!session) {
      goto('/login');
  }

  let ag = new AtpAgent({
      service: $service,
      persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
          localStorage.setItem('session', JSON.stringify(sess))
      }
  });

  if (!ag.session) {
      try {
          ag.resumeSession(JSON.parse(localStorage.getItem('session')));
          agent.set(new Agent(ag));
      } catch (e) {
          goto('/login');
      }
  }
</script>

<div class:nonoto={JSON.parse($nonoto)} class:darkmode={JSON.parse($isDarkMode)} class="app theme-{$theme}">
  <Header />

  <div class="search">
    <form action="/search" method="get">
      <input type="text" name="q" required bind:value={search}>
      <button type="submit" class="button button--sm">検索</button>
    </form>
  </div>

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

  .search {
      margin: 20px auto 0;
      max-width: 780px;
      width: 100%;
      padding: 0 20px;

      form {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
      }

      input {
          background-color: var(--bg-color-1);
          border: 1px solid var(--border-color-1);
          height: 40px;
          padding: 0 10px;
          border-radius: 6px;
          flex: 1;
          width: 100%;
      }
  }
</style>
