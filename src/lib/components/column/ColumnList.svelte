<script lang="ts">
    import { flip } from 'svelte/animate';
    import { dragHandleZone, dragHandle } from 'svelte-dnd-action';
    import { pauseColumn } from "$lib/stores";
    import { getColumnState } from "$lib/classes/columnState.svelte";
    import {GripVertical, XCircle} from "lucide-svelte";
    import {iconMap} from "$lib/columnIcons";
    import ColumnIcon from "$lib/components/column/ColumnIcon.svelte";
    const columnState = getColumnState();

    let { items, onviewcolumn = () => {} } = $props();
    const flipDurationMs = 300;
    function handleDndConsider(e) {
        $pauseColumn = true;
        items = e.detail.items;
    }
    function handleDndFinalize(e) {
        $pauseColumn = false;
        items = e.detail.items;
        columnState.columns = items;
    }

    function columnRemove(column) {
        columnState.columns = columnState.columns.filter(_column => _column !== column);
        items = columnState.columns;
    }
</script>

<div class="column-list" use:dragHandleZone={{items: items, flipDurationMs}} onconsider={handleDndConsider} onfinalize={handleDndFinalize}>
  {#each items as column, index (column.id)}
    <div class="column-list__item" animate:flip="{{duration: flipDurationMs}}">
      <div class="column-list__grab" use:dragHandle>
        <GripVertical size="20" color="var(--border-color-1)"></GripVertical>
      </div>

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

      <button class="column-list__remove" onclick={() => {columnRemove(column)}} ontouchend={() => {columnRemove(column)}} aria-label="Remove">
        <XCircle color="var(--text-color-1)" size="20"></XCircle>
      </button>
    </div>
  {/each}
</div>

<style lang="postcss">
    .column-list {
        display: grid;
        gap: 8px;
        grid-auto-rows: min-content;
        height: 100%;

        &__grab {
            position: absolute;
            left: 4px;
            top: 0;
            bottom: 0;
            display: grid;
            place-content: center;
        }

        &__item {
            position: relative;
            display: flex;
            gap: 10px;
            align-items: center;
            padding: 6px 12px 6px 28px;
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