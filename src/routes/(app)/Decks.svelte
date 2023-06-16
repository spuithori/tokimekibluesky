<script lang="ts">
    import {agent, columns, currentAlgorithm, cursor, notificationCount, timeline} from '$lib/stores';
    import {_} from "svelte-i18n";
    import TimelineSelector from "./TimelineSelector.svelte";
    import ColumnModal from "$lib/components/column/ColumnModal.svelte";
    let isColumnModalOpen = false;

    function handleColumnModalClose() {
        isColumnModalOpen = false;
    }

    if (Array.isArray($columns) && !$columns.length) {
        columns.set([
            {
                algorithm: {
                    type: 'default',
                    name: 'HOME'
                },
                style: 'default'
            },
        ]);
    }
</script>

<h1 class="page-nav-title">DECKS</h1>

{#if isColumnModalOpen}
  <ColumnModal on:close={handleColumnModalClose}></ColumnModal>
{/if}

<div class="decks-nav">
  <button class="button" on:click={() => {isColumnModalOpen = true}}>せってい</button>
</div>

<div class="deck-wrap">
  <div class="deck">
    {#each $columns as column, index (column)}
      <div class="deck-row">
        <div class="deck-row__title">{column.algorithm.name}</div>

        <div class="deck-row__content" bind:this={column.scrollElement}>
          <TimelineSelector column={column} index={index}></TimelineSelector>
        </div>
      </div>
    {/each}
  </div>
</div>

<style lang="postcss">
  .deck {
      position: fixed;
      /* top: 100px; */
      left: 0;
      bottom: 0;
      width: 100%;
      display: flex;
      gap: 20px;
      height: calc(100vh - 90px);
      overflow-x: scroll;
      padding-top: 10px;
      margin-top: -10px;

      @media (max-width: 767px) {
          scroll-snap-type: x mandatory;
      }
  }

  .deck-row {
      width: 450px;
      flex-shrink: 0;
      height: 100%;
      position: relative;
      padding-top: 40px;

      @media (max-width: 767px) {
          width: calc(100vw - 20px);
          scroll-snap-align: start;
          box-shadow: none;
      }

      &__content {
          height: calc(100% - 40px);
          overflow-y: scroll;
          box-shadow: 0 0 10px var(--box-shadow-color-1);
          background-color: var(--bg-color-1);
          scrollbar-color: var(--primary-color) var(--bg-color-3);

          &::-webkit-scrollbar {
              width: 6px;
          }

          &::-webkit-scrollbar-thumb {
              background: var(--primary-color);
              border-radius: 6px;
          }

          &::-webkit-scrollbar-track {
              background: var(--bg-color-3);
              border-radius: 6px;
          }
      }

      &__title {
          text-align: center;
          font-weight: 900;
          font-size: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 40px;
          position: sticky;
          top: 36px;
          background-color: var(--bg-color-1);
          z-index: 10;
          border-radius: 10px 10px 0 0;
          letter-spacing: .025em;
      }
  }

  .decks-nav {
      position: absolute;
      left: 0;
      top: 0;
  }
</style>