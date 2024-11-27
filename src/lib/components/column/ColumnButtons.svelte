<script lang="ts">
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {X} from "lucide-svelte";

  const columnState = getColumnState();

  let { column } = $props();
  
  function threadClose() {
      columnState.remove(column.id);
  }
</script>

{#if (column.algorithm.type === 'thread')}
  <button aria-label="close this column" class="column-heading-button" onclick={threadClose}>
    <X color="var(--text-color-1)"></X>
  </button>
{/if}