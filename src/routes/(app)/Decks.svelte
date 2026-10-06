<script lang="ts">
    import {agentsByDid} from '$lib/stores';
    import DeckEmptyState from "$lib/components/column/DeckEmptyState.svelte";
    import DeckSlot from "./DeckSlot.svelte";
    import ColumnResumePlaceholder from "$lib/components/column/ColumnResumePlaceholder.svelte";
    import ColumnsLoadError from "$lib/components/column/ColumnsLoadError.svelte";
    import ColumnErrorPanel from "$lib/components/column/ColumnErrorPanel.svelte";
    import BootStatus from "$lib/components/utils/BootStatus.svelte";
    import TilingDragOverlay from "$lib/components/deck/TilingDragOverlay.svelte";
    import TilingDragGhost from "$lib/components/deck/TilingDragGhost.svelte";
    import {recordError} from "$lib/errorLog";
    import DeckPopupWrap from "./DeckPopupWrap.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {publishState} from "$lib/classes/publishState.svelte";
    import {appState} from "$lib/classes/appState.svelte";
    const columnState = getColumnState();

    function trackDeckMounted() {
        columnState.setDeckMounted(true);
        return () => columnState.setDeckMounted(false);
    }
</script>

<TilingDragOverlay></TilingDragOverlay>
<TilingDragGhost></TilingDragGhost>

<div class="deck-wrap" {@attach appState.ready && trackDeckMounted}>
  <div class="deck-divider" class:deck-divider--compact={publishState.isBottom}></div>

  {#if columnState.loadFailed}
    <div class="deck-empty">
      <ColumnsLoadError></ColumnsLoadError>
    </div>
  {:else if columnState.slots.length}
    <div class="deck">
      {#if appState.ready}
        {#each columnState.slots as slot, index (slot.id)}
          {@const column = columnState.getSlotColumn(index)}
          {@const gate = appState.getColumnResumeGate($agentsByDid, column?.did)}
          {#if gate !== 'mount'}
            {#if !column?.settings?.isPopup}
              <ColumnResumePlaceholder {column}></ColumnResumePlaceholder>
            {/if}
          {:else if !column?.settings?.isPopup}
            <svelte:boundary onerror={(error) => recordError(error, 'column')}>
              <DeckSlot {index}></DeckSlot>

              {#snippet failed(error, reset)}
                <ColumnErrorPanel {column} {reset}></ColumnErrorPanel>
              {/snippet}
            </svelte:boundary>
          {:else}
            <svelte:boundary onerror={(error) => recordError(error, 'column')}>
              <DeckPopupWrap {index}></DeckPopupWrap>

              {#snippet failed(error, reset)}{/snippet}
            </svelte:boundary>
          {/if}
        {/each}
      {:else}
        <BootStatus></BootStatus>
      {/if}
    </div>
  {:else if !appState.ready}
    <div class="deck-empty">
      <BootStatus></BootStatus>
    </div>
  {:else if appState.ready && columnState.isColumnsLoaded}
    <div class="deck-empty">
      <DeckEmptyState></DeckEmptyState>
    </div>
  {/if}
</div>

<style lang="postcss">
  .deck-wrap {
      display: flex;
  }

  .deck-divider {
      width: var(--deck-divider-width);
      flex-shrink: 0;

      @media (max-width: 767px) {
          display: none;
      }

      &--compact {
          width: var(--deck-divider-compact-width, 64px);
      }
  }

  .deck {
      display: flex;
      gap: var(--decks-gap);
      overflow-x: var(--decks-overflow-x, auto);
      overflow-y: hidden;
      padding: var(--decks-padding-top, var(--decks-padding)) var(--decks-padding-right, var(--decks-padding)) var(--decks-padding-bottom, var(--decks-padding)) var(--decks-padding-left, var(--decks-padding));
      margin: var(--decks-margin) var(--decks-margin) var(--decks-margin-bottom, var(--decks-margin)) 0;
      height: var(--decks-height, calc(100dvh - var(--decks-margin, 0px) * 2));
      flex: var(--decks-flex, initial);
      background-color: var(--decks-bg-color, transparent);
      border-radius: var(--decks-border-radius, 0);
      border: var(--decks-border, none);
      border-left: var(--decks-border-left, 0);
      border-bottom: var(--decks-border-bottom, 0);
      box-shadow: var(--decks-box-shadow, none);

      &::-webkit-scrollbar {
          height: var(--decks-scroll-bar-size, 8px);

          @media (max-width: 767px) {
              display: none;
          }
      }

      &::-webkit-scrollbar-thumb {
          background: var(--scroll-bar-color);
          background-clip: padding-box;
          border: var(--scroll-bar-thumb-inset, 0px) solid transparent;
          border-radius: var(--scroll-bar-border-radius, 0);
      }

      &::-webkit-scrollbar-track {
          background: var(--scroll-bar-bg-color);
          margin-inline: var(--decks-scroll-bar-inset, 0px);
      }

      @media (max-width: 767px) {
          scroll-snap-type: x mandatory;
          top: 85px;
          padding: 0;
          height: 100dvh;
          margin: 0;
          border: none;
          border-radius: 0;
          box-shadow: none;
      }
  }

  .deck-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      flex: 1;
      gap: 10px;
      color: var(--text-color-3);
      height: 100dvh;
  }
</style>
