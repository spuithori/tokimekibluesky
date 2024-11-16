<script lang="ts">
  import {agent, notificationCount} from "$lib/stores";
  import {getColumnState} from "$lib/classes/columnState.svelte";

  const columnState = getColumnState();

  let {
    column,
    index,
    _agent = $agent,
    unique = Symbol()
  } = $props();

  async function notificationRead() {
      await _agent.agent.api.app.bsky.notification.updateSeen( {seenAt: new Date().toISOString()});
      notificationCount.set(0);
  }
  
  function threadClose() {
      columnState.remove(column.id);
  }
</script>

{#if (column.algorithm.type === 'thread')}
  <button aria-label="close this column" class="column-heading-button" onclick={threadClose}>
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  </button>
{/if}
