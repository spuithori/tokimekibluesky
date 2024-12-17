<script lang="ts">
  import ColumnList from "$lib/components/column/ColumnList.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";

  let { onviewcolumn = () => {} } = $props();
  const columnState = getColumnState();
  const columns = columnState.columns;
</script>

<div class="side-columns">
  {#if (columns.length)}
    <ColumnList items={columns} {onviewcolumn}></ColumnList>
  {/if}
</div>

<style lang="postcss">
  .side-columns {
      padding: 16px;
  }
</style>