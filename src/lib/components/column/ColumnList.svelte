<script lang="ts">
    import { flip } from 'svelte/animate';
    import { dndzone } from 'svelte-dnd-action';
    import IconColumnsFeed from "$lib/icons/columns/IconColumnsFeed.svelte";
    import IconColumnsList from "$lib/icons/columns/IconColumnsList.svelte";
    import IconColumnsBookmark from "$lib/icons/columns/IconColumnsBookmark.svelte";
    import IconColumnsHome from "$lib/icons/columns/IconColumnsHome.svelte";
    import {columns, pauseColumn} from "$lib/stores";
    import IconColumnsNotification from "$lib/icons/columns/IconColumnsNotification.svelte";
    import {createEventDispatcher} from "svelte";
    import IconColumnsSearch from "$lib/icons/columns/IconColumnsSearch.svelte";
    import IconColumnsLike from "$lib/icons/columns/IconColumnsLike.svelte";
    import IconColumnsMyPost from "$lib/icons/columns/IconColumnsMyPost.svelte";
    import IconColumnsMyMedia from "$lib/icons/columns/IconColumnsMyMedia.svelte";
    const dispatch = createEventDispatcher();

    export let _agent;
    export let items;
    const flipDurationMs = 300;
    function handleDndConsider(e) {
        $pauseColumn = true;
        items = e.detail.items;
    }
    function handleDndFinalize(e) {
        $pauseColumn = false;
        items = e.detail.items;
        $columns = items;
    }

    function columnRemove(column) {
        dispatch('remove', {
            column: column,
        });
    }
</script>

<div class="column-list" use:dndzone={{items: items, flipDurationMs}} on:consider={handleDndConsider} on:finalize={handleDndFinalize}>
  {#each items as column, index (column.id)}
    <div class="column-list__item" animate:flip="{{duration: flipDurationMs}}">
      <div class="column-list__content">
        <p class="column-list__title">
          {column.algorithm.name}
        </p>

        {#if (column.handle)}
          <p class="column-list__handle">
            {column.handle}
          </p>
        {/if}
      </div>

      {#if (column.algorithm.type === 'custom')}
        <IconColumnsFeed></IconColumnsFeed>
      {:else if (column.algorithm.type === 'list')}
        <IconColumnsList></IconColumnsList>
      {:else if (column.algorithm.type === 'bookmark')}
        <IconColumnsBookmark></IconColumnsBookmark>
      {:else if (column.algorithm.type === 'notification')}
        <IconColumnsNotification></IconColumnsNotification>
      {:else if (column.algorithm.type === 'officialList')}
        <IconColumnsList></IconColumnsList>
      {:else if (column.algorithm.type === 'search')}
        <IconColumnsSearch></IconColumnsSearch>
      {:else if (column.algorithm.type === 'like')}
        <IconColumnsLike></IconColumnsLike>
      {:else if (column.algorithm.type === 'myPost')}
        <IconColumnsMyPost></IconColumnsMyPost>
      {:else if (column.algorithm.type === 'myMedia')}
        <IconColumnsMyMedia></IconColumnsMyMedia>
      {:else}
        <IconColumnsHome></IconColumnsHome>
      {/if}

      <button class="column-list__remove" on:click={() => {columnRemove(column)}} aria-label="Remove">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
      </button>
    </div>
  {/each}
</div>

<style lang="postcss">
    .column-list {
        display: grid;
        gap: 12px;
        grid-auto-rows: min-content;
        height: 100%;

        &__item {
            position: relative;
            display: flex;
            gap: 10px;
            align-items: center;
            padding: 6px 10px 6px 40px;
            box-shadow: 0 0 10px var(--box-shadow-color-1);
            border-radius: 6px;
            font-weight: bold;
            background-color: var(--bg-color-1);
            cursor: default;
        }

        &__content {
            flex: 1;
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