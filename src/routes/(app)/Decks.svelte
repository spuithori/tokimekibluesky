<script lang="ts">
    import Ghost from '@lucide/svelte/icons/ghost';
    import {agents, isColumnModalOpen} from '$lib/stores';
    import DeckRow from "./DeckRow.svelte";
    import ColumnResumePlaceholder from "$lib/components/column/ColumnResumePlaceholder.svelte";
    import ColumnsLoadError from "$lib/components/column/ColumnsLoadError.svelte";
    import ColumnErrorPanel from "$lib/components/column/ColumnErrorPanel.svelte";
    import BootStatus from "$lib/components/utils/BootStatus.svelte";
    import {recordError} from "$lib/errorLog";
    import {_} from "tokimeki-i18n";
    import DeckPopupWrap from "./DeckPopupWrap.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {publishState} from "$lib/classes/publishState.svelte";
    import {appState} from "$lib/classes/appState.svelte";
    const columnState = getColumnState();
</script>

<div class="deck-wrap">
  <div class="deck-divider" class:deck-divider--compact={publishState.isBottom}></div>

  {#if columnState.loadFailed}
    <div class="deck-empty">
      <ColumnsLoadError></ColumnsLoadError>
    </div>
  {:else if columnState.columns.length}
    <div class="deck">
      {#if appState.ready}
        {#each columnState.columns as column, index (column.id)}
          {@const gate = appState.getColumnResumeGate($agents, column?.did)}
          {#if gate !== 'mount'}
            {#if !column?.settings?.isPopup}
              <ColumnResumePlaceholder {column}></ColumnResumePlaceholder>
            {/if}
          {:else if !column?.settings?.isPopup}
            <svelte:boundary onerror={(error) => recordError(error, 'column')}>
              <DeckRow {index}></DeckRow>

              {#snippet failed(error, reset)}
                <ColumnErrorPanel {column} {reset}></ColumnErrorPanel>
              {/snippet}
            </svelte:boundary>
          {:else}
            <svelte:boundary onerror={(error) => recordError(error, 'column')}>
              <DeckPopupWrap {column} {index}></DeckPopupWrap>

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
      <div class="deck-empty__icon">
        <Ghost size={64} color="var(--text-color-3)" />
      </div>

      <h2 class="deck-empty__title">{$_('decks_empty_title')}</h2>
      <p class="deck-empty__text">{$_('decks_empty_text')}</p>
      <button class="button" onclick={() => {$isColumnModalOpen = true}}>{$_('feed_quick_add')}</button>
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
      overflow-y: hidden;
      padding: var(--decks-padding-top, var(--decks-padding)) var(--decks-padding-right, var(--decks-padding)) var(--decks-padding-bottom, var(--decks-padding)) var(--decks-padding-left, var(--decks-padding));
      margin: var(--decks-margin) var(--decks-margin) var(--decks-margin-bottom, var(--decks-margin)) 0;
      height: var(--decks-height, calc(100dvh - var(--decks-margin, 0px) * 2));
      flex: var(--decks-flex, initial);
      background-color: var(--decks-bg-color, transparent);
      border: var(--decks-border, none);
      border-left: var(--decks-border-left, 0);
      border-bottom: var(--decks-border-bottom, 0);
      box-shadow: var(--decks-box-shadow, none);

      &::-webkit-scrollbar {
          height: 8px;

          @media (max-width: 767px) {
              display: none;
          }
      }

      &::-webkit-scrollbar-thumb {
          background: var(--scroll-bar-color);
      }

      &::-webkit-scrollbar-track {
          background: var(--scroll-bar-bg-color);
      }

      @media (max-width: 767px) {
          scroll-snap-type: x mandatory;
          top: 85px;
          padding: 0;
          height: 100dvh;
          margin: 0;
          border: none;
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

      &__title {
          font-size: 24px;
          letter-spacing: .05em;
      }
  }
</style>