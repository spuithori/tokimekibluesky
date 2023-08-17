<script lang="ts">
    import Notification from "./Notification.svelte";
    import { agent, notificationCount } from '$lib/stores';

    export let column;
    export let index;

    async function notificationRead() {
        await $agent.agent.api.app.bsky.notification.updateSeen( {seenAt: new Date().toISOString()});
        notificationCount.set(0);
    }
</script>

<div class="timeline">
  <Notification isPage={true}></Notification>
</div>

<button class="notification-column-read-button" on:click={notificationRead}>
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-list-checks"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>
</button>

<style lang="postcss">
  .notification-column-read-button {
      position: absolute;
      right: 10px;
      top: 40px;
      width: 40px;
      height: 40px;
      display: grid;
      place-content: center;
      z-index: 101;
  }
</style>