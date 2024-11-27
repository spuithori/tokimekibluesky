<script lang="ts">
    import { flip } from 'svelte/animate';
    import { dndzone } from 'svelte-dnd-action';
    import { pauseColumn } from "$lib/stores";
    import {createEventDispatcher} from "svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import { Bell, Bookmark, Heart, Home, Image, List, MessageCircleMore, Newspaper, Pencil, Search, UserRound, XCircle } from "lucide-svelte";
    const dispatch = createEventDispatcher();
    const columnState = getColumnState();

    let { _agent, items } = $props();
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
        dispatch('remove', {
            column: column,
        });
    }
</script>

<div class="column-list" use:dndzone={{items: items, flipDurationMs}} onconsider={handleDndConsider} onfinalize={handleDndFinalize}>
  {#each items as column, index (column.id)}
    <div class="column-list__item" animate:flip="{{duration: flipDurationMs}}">
      <div class="column-list__icon">
        {#if (column.algorithm.type === 'custom')}
          <Newspaper size="20" color="var(--text-color-1)"></Newspaper>
        {:else if (column.algorithm.type === 'list')}
          <List size="20" color="var(--text-color-1)"></List>
        {:else if (column.algorithm.type === 'bookmark')}
          <Bookmark size="20" color="var(--text-color-1)"></Bookmark>
        {:else if (column.algorithm.type === 'cloudBookmark')}
          <Bookmark size="20" color="var(--text-color-1)"></Bookmark>
        {:else if (column.algorithm.type === 'notification')}
          <Bell size="20" color="var(--text-color-1)"></Bell>
        {:else if (column.algorithm.type === 'officialList')}
          <List size="20" color="var(--text-color-1)"></List>
        {:else if (column.algorithm.type === 'search')}
          <Search size="20" color="var(--text-color-1)"></Search>
        {:else if (column.algorithm.type === 'like')}
          <Heart size="20" color="var(--text-color-1)"></Heart>
        {:else if (column.algorithm.type === 'myPost')}
          <Pencil size="20" color="var(--text-color-1)"></Pencil>
        {:else if (column.algorithm.type === 'myMedia')}
          <Image size="20" color="var(--text-color-1)"></Image>
        {:else if (column.algorithm.type === 'author')}
          <UserRound size="20" color="var(--text-color-1)"></UserRound>
        {:else if (column.algorithm.type === 'chat')}
          <MessageCircleMore size="20" color="var(--text-color-1)"></MessageCircleMore>
        {:else}
          <Home size="20" color="var(--text-color-1)"></Home>
        {/if}
      </div>

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

      <button class="column-list__remove" onclick={() => {columnRemove(column)}} ontouchend={() => {columnRemove(column)}} aria-label="Remove">
        <XCircle color="var(--text-color-1)"></XCircle>
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
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: bold;
            background-color: var(--bg-color-1);
            cursor: default;
            border: 2px solid var(--border-color-1);
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