<script lang="ts">
    import {isColumnModalOpen} from '$lib/stores';
    import DeckRow from "./DeckRow.svelte";
    import {_} from "svelte-i18n";
    import DeckPopupWrap from "./DeckPopupWrap.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {publishState} from "$lib/classes/publishState.svelte";
    let unique = Symbol();
    const columnState = getColumnState();
</script>

<div class="deck-wrap">
  <div class="deck-divider" class:deck-divider--compact={publishState.isBottom}></div>

  {#if columnState.columns.length}
    <div class="deck">
      {#each columnState.columns as column, index (column.id)}
        {#if !column?.settings?.isPopup}
          <DeckRow {column} {index} {unique}></DeckRow>
        {:else}
          <DeckPopupWrap {column} {index} {unique}></DeckPopupWrap>
        {/if}
      {/each}
    </div>
  {:else}
    <div class="deck-empty">
      <div class="deck-empty__icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ghost"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>
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
          width: 64px;
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
      border-radius: var(--decks-border-radius, 0);
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