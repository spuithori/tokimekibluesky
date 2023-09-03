<script lang="ts">
    import {agents, columns, cursors, globalUnique, settings, timelines} from '$lib/stores';
    import ColumnModal from "$lib/components/column/ColumnModal.svelte";
    import DeckRow from "./DeckRow.svelte";
    import {accountsDb} from "$lib/db";
    import {_} from "svelte-i18n";
    let isColumnModalOpen = false;
    let unique = Symbol();

    if (Array.isArray($columns) && !$columns.length) {
        columns.set([]);
    }

    $: modifyColumns($columns);

    async function modifyColumns(columns) {
        if (!columns) {
            return false
        }

        let _columns = [];

        columns.forEach(column => {
            let c = {};
            for (const [key, value] of Object.entries(column)) {
                if (key !== 'scrollElement') {
                    c[key] = value;
                }
            }

            _columns.push(c);
        })

        const profileId = Number(localStorage.getItem('currentProfile'));
        if (!profileId) {
            return false;
        }

        const id = await accountsDb.profiles.update(profileId, {
            columns: _columns,
        });
    }
</script>

<div class="deck-wrap">
  <div class="deck"
       class:deck--left-sidebar={$settings.design?.publishPosition === 'left'}
       class:deck--bottom={$settings.design?.publishPosition === 'bottom'}
  >
    <div class="deck-divider"></div>

    {#if $columns.length}
      {#key $globalUnique}
        {#each $columns as column, index (column.id)}
          <DeckRow {column} {index}></DeckRow>
        {/each}
      {/key}
    {:else}
      <div class="deck-empty">
        <div class="deck-empty__icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-3)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ghost"><path d="M9 10h.01"/><path d="M15 10h.01"/><path d="M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>
        </div>

        <h2 class="deck-empty__title">{$_('decks_empty_title')}</h2>
        <p class="deck-empty__text">{$_('decks_empty_text')}</p>
      </div>
    {/if}
  </div>
</div>

<style lang="postcss">
  .deck {
      left: 0;
      bottom: 0;
      display: flex;
      gap: 8px;
      overflow-x: scroll;
      padding: 4px 0;
      height: 100svh;

      &::-webkit-scrollbar {
          display: none;
      }

      @media (max-width: 767px) {
          scroll-snap-type: x mandatory;
          top: 85px;
          padding: 0;
          height: calc(100svh - 70px);
      }

      &--left-sidebar {
          @media (min-width: 768px) {
              left: 360px;
              /* width: calc(100vw - 360px); */
              height: 100svh;
              z-index: auto;
              position: static;
          }
      }

      &--bottom {

      }
  }

  .decks-nav {
      position: absolute;
      left: 0;
      top: 0;
  }

  .decks-button {
      width: 48px;
      height: 48px;
      border-radius: 5px;
      background-color: transparent;
      display: grid;
      place-content: center;
      position: fixed;
      top: 56px;
      left: 8px;
      z-index: 2000;
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

      &__title {
          font-size: 24px;
          letter-spacing: .05em;
      }
  }
</style>