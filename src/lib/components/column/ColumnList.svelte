<script lang="ts">
    import { flip } from 'svelte/animate';
    import { dndzone } from 'svelte-dnd-action';
    import IconColumnsFeed from "$lib/icons/columns/IconColumnsFeed.svelte";
    import IconColumnsList from "$lib/icons/columns/IconColumnsList.svelte";
    import IconColumnsBookmark from "$lib/icons/columns/IconColumnsBookmark.svelte";
    import IconColumnsHome from "$lib/icons/columns/IconColumnsHome.svelte";
    import {bookmarkModal, listModal} from "$lib/stores";
    import IconColumnsEdit from "$lib/icons/columns/IconColumnsEdit.svelte";
    import IconColumnsNotification from "$lib/icons/columns/IconColumnsNotification.svelte";
    export let items;
    const flipDurationMs = 300;
    function handleDndConsider(e) {
        items = e.detail.items;
    }
    function handleDndFinalize(e) {
        items = e.detail.items;
    }

    console.log(items)
</script>

<div class="column-list" use:dndzone={{items: items, flipDurationMs}} on:consider={handleDndConsider} on:finalize={handleDndFinalize}>
  {#each items as column, index (column.id)}
    <div class="column-list__item" animate:flip="{{duration: flipDurationMs}}">
      <p class="column-list__title">{column.algorithm.name}</p>

      {#if (column.algorithm.type === 'custom')}
        <IconColumnsFeed></IconColumnsFeed>
      {:else if (column.algorithm.type === 'list')}
        <IconColumnsList></IconColumnsList>
        <button
            class="algo-nav-edit"
            on:click={() => {listModal.set({open: true, data: column.algorithm.algorithm })}}
            aria-label="Edit list"
        >
          <IconColumnsEdit></IconColumnsEdit>
        </button>
      {:else if (column.algorithm.type === 'bookmark')}
        <IconColumnsBookmark></IconColumnsBookmark>
        <button
            class="algo-nav-edit"
            on:click={() => {bookmarkModal.set({open: true, data: Number(column.algorithm.algorithm) })}}
            aria-label="Edit Bookmark"
        >
          <IconColumnsEdit></IconColumnsEdit>
        </button>
      {:else if (column.algorithm.type === 'notification')}
        <IconColumnsNotification></IconColumnsNotification>
      {:else}
        <IconColumnsHome></IconColumnsHome>
      {/if}
    </div>
  {/each}
</div>

<style lang="postcss">
    .column-list {
        display: grid;
        gap: 15px;
        grid-auto-rows: min-content;
        height: 100%;

        &__item {
            position: relative;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 20px 10px 40px;
            box-shadow: 0 0 10px var(--box-shadow-color-1);
            border-radius: 6px;
            font-weight: 600;
            background-color: var(--bg-color-1);
        }

        &__title {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
        }
    }
</style>