<script lang="ts">
  import { m } from "$lib/paraglide/messages.js";
  import { isColumnModalOpen } from "$lib/stores";
  import ColumnList from "$lib/components/column/ColumnList.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {SquarePlus} from "lucide-svelte";

  let { onviewcolumn = () => {} } = $props();
  const columnState = getColumnState();
  const columns = columnState.columns;
</script>

<div class="side-columns">
  {#if (columns.length)}
    <ColumnList items={columns} {onviewcolumn}></ColumnList>
  {/if}

  <button class="column-add-button" onclick={() => {$isColumnModalOpen = true}}>
    <SquarePlus color="var(--bg-color-1)" size="20"></SquarePlus>
    {m.feed_quick_add()}
  </button>
</div>

<style lang="postcss">
  .side-columns {
      padding: 16px;
  }

  .column-add-button {
      color: var(--bg-color-1);
      background-color: var(--primary-color);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      height: 40px;
      border-radius: var(--border-radius-3);
      width: 100%;
      margin-top: 16px;
      font-weight: bold;
  }
</style>