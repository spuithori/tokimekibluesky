<script lang="ts">
    import {columns, globalUnique, settings} from '$lib/stores';
    import DeckRow from "./DeckRow.svelte";
    import {accountsDb} from "$lib/db";
    import {_} from "svelte-i18n";
    import { dndzone, SOURCES, TRIGGERS } from 'svelte-dnd-action';
    let unique = Symbol();
    let dragDisabled = true;

    if (Array.isArray($columns) && !$columns.length) {
        columns.set([]);
    }

    $: modifyColumns($columns);

    const flipDurationMs = 0;
    function handleDndConsider(e) {
        const {items: newItems, info: {source, trigger}} = e.detail;
        columns.set(newItems);

        if (source === SOURCES.KEYBOARD && trigger === TRIGGERS.DRAG_STOPPED) {
            dragDisabled = true;
        }
    }
    function handleDndFinalize(e) {
        const {items: newItems, info: {source}} = e.detail;
        columns.set(newItems);

        if (source === SOURCES.POINTER) {
            dragDisabled = true;
        }

        unique = Symbol();
    }

    function startDrag(e) {
        e.preventDefault();
        dragDisabled = false;
    }

    function handleKeyDown(e) {
        if ((e.key === "Enter" || e.key === " ") && dragDisabled) {
            dragDisabled = false;
        }
    }

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

    function transformDraggedElement(draggedEl, data, index) {
        draggedEl.classList.add('dragged-content');
    }
</script>

<div class="deck-wrap">
  <div class="deck-divider"></div>

  {#if $columns.length}
    {#key $globalUnique}
      <div class="deck"
           class:deck--left-sidebar={$settings.design?.publishPosition === 'left'}
           class:deck--bottom={$settings.design?.publishPosition === 'bottom'}
           use:dndzone="{{
               items: $columns,
               dragDisabled,
               flipDurationMs,
               transformDraggedElement,
               type: 'columns',
               dropFromOthersDisabled: true,
               dropTargetClasses: ['dragging'],
           }}" on:consider="{handleDndConsider}" on:finalize="{handleDndFinalize}"
      >

            {#each $columns as column, index (column.id)}
              <div class="deck-drag-area-wrap">
                <div class="deck-drag-area"
                     style={dragDisabled ? 'cursor: grab' : 'cursor: grabbing'}
                     on:mousedown={startDrag}
                     on:touchstart={startDrag}
                     on:keydown={handleKeyDown}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--border-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-grip-vertical"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
                </div>

                <DeckRow {column} {index} {unique}></DeckRow>
              </div>
            {/each}
      </div>
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

<style lang="postcss">
  .deck-wrap {
      display: flex;
  }

  .deck {
      left: 0;
      bottom: 0;
      display: flex;
      gap: var(--decks-gap);
      overflow-x: scroll;
      padding: var(--decks-padding) 0;
      height: 100dvh;

      &::-webkit-scrollbar {
          display: none;
      }

      @media (max-width: 767px) {
          scroll-snap-type: x mandatory;
          top: 85px;
          padding: 0;
          height: calc(100dvh - 70px);
      }

      &--left-sidebar {
          @media (min-width: 768px) {
              left: 360px;
              /* width: calc(100vw - 360px); */
              height: 100dvh;
              z-index: auto;
              position: static;
          }
      }

      &--bottom {

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

      &__title {
          font-size: 24px;
          letter-spacing: .05em;
      }
  }

  .deck-drag-area-wrap {
      position: relative;
  }

  .deck-drag-area {
      width: 24px;
      height: 52px;
      display: grid;
      place-content: center;
      position: absolute;
      z-index: 100;

      @media (max-width: 767px) {
          display: none;
      }
  }
</style>