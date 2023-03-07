<script lang="ts">
  import Header from "./Header.svelte";
  import "../styles.css";
  import { agent } from '$lib/stores';
  import { Agent } from "$lib/agent";
  import type { LayoutData } from './$types';
  import {onMount} from "svelte";
  import {AtpAgent} from "@atproto/api";
  import {redirect} from "@sveltejs/kit";
  import {goto} from "$app/navigation";

  let ag = new AtpAgent({
      service: 'https://bsky.social',
  });

  try {
      ag.resumeSession(JSON.parse(localStorage.getItem('session')));
      agent.set(new Agent(ag));
  } catch (e) {
      goto('/login');
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
