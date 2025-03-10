<script lang="ts">
    import { getColumnState } from "$lib/classes/columnState.svelte";
    import {XCircle} from "lucide-svelte";
    import {iconMap} from "$lib/columnIcons";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    import Sortable from "$lib/components/utils/Sortable.svelte";
    const columnState = getColumnState();

    let { items, onviewcolumn = () => {} } = $props();

    function columnRemove(column) {
        columnState.columns = columnState.columns.filter(_column => _column !== column);
        items = columnState.columns;
    }

    function handleSort(orderedItems) {
        items = orderedItems;
        columnState.columns = items;
    }
</script>

<Sortable {items} onsort={handleSort}>
  {#snippet content(column, index)}
    <div class="column-list__item">
      <div class="column-list__icon">
        {#if column.settings?.icon}
          {@const SvelteComponent = iconMap.get(column.settings.icon)}
          <SvelteComponent color="var(--deck-heading-icon-color)"></SvelteComponent>
        {:else}
          <ColumnIcon type={column.algorithm.type}></ColumnIcon>
        {/if}
      </div>

      <div role="button" class="column-list__content" onclick={() => {onviewcolumn(column, index)}}>
        <p class="column-list__title">{column.algorithm.name}</p>

        {#if (column.handle)}
          <p class="column-list__handle">{column.handle}</p>
        {/if}
      </div>

      <button class="column-list__remove" onclick={() => {columnRemove(column)}} aria-label="Remove">
        <XCircle color="var(--text-color-1)"></XCircle>
      </button>
    </div>
  {/snippet}
</Sortable>

<style lang="postcss">
    .column-list {
        &__item {
            position: relative;
            display: flex;
            gap: 10px;
            align-items: center;
            padding: 6px 12px 6px 24px;
            border-radius: 6px;
            font-weight: bold;
            background-color: var(--bg-color-1);
            cursor: default;
            border: 2px solid var(--border-color-1);
        }

        &__content {
            flex: 1;
            text-align: left;
        }

        &__title {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-right: auto;
            font-size: 14px;
            line-height: 1.3;
        }

        &__handle {
            font-size: 12px;
            color: var(--text-color-3);
            line-height: 1.2;
        }
    }
</style>