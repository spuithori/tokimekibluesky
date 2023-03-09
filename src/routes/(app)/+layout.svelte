<script lang="ts">
  import Header from "./Header.svelte";
  import "../styles.css";
  import { agent, isLogin } from '$lib/stores';
  import { Agent } from "$lib/agent";
  import {onMount} from "svelte";
  import {AtpAgent, AtpSessionData, AtpSessionEvent} from "@atproto/api";
  import {goto} from "$app/navigation";
  import { dev } from '$app/environment';
  import { inject } from '@vercel/analytics';

  inject({ mode: dev ? 'development' : 'production' });

  const session = localStorage.getItem('session');
  if (!session) {
      goto('/login');
  }

  let ag = new AtpAgent({
      service: 'https://bsky.social',
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

<div class="app">
  <Header />

  <main>
    <slot />
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  main {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1rem;
    width: 100%;
    max-width: 64rem;
    margin: 0 auto;
    box-sizing: border-box;
  }

  footer {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 12px;
  }

  footer a {
    font-weight: bold;
  }

  @media (min-width: 480px) {
    footer {
      padding: 12px 0;
    }
  }
</style>
