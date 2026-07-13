<script module lang="ts">
    const attemptCounts = new Map<string, number>();
</script>

<script lang="ts">
    import {_} from "tokimeki-i18n";
    import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
    import {getColumnState} from "$lib/classes/columnState.svelte";

    let { column, reset } = $props();

    const columnState = getColumnState();
    let attempts = $state(attemptCounts.get(column?.id) ?? 0);

    function bumpAttempts() {
        attempts += 1;
        if (column?.id) {
            attemptCounts.set(column.id, attempts);
        }
    }

    function retry() {
        bumpAttempts();
        reset();
    }

    function clearAndRetry() {
        if (column?.id) {
            columnState.deleteFeed(column.id);
            columnState.clearFeedStatus(column.id);
        }
        if (column) {
            column.data = { feed: [], cursor: '' };
        }
        bumpAttempts();
        reset();
    }

    function removeColumn() {
        if (column?.id) {
            attemptCounts.delete(column.id);
            columnState.remove(column.id);
        }
    }
</script>

<div class="column-error-panel deck-row-wrap column-error-panel--{column?.settings?.width || 'medium'}">
  <TriangleAlert size={40} color="var(--danger-color)" />
  <h2 class="column-error-panel__title">{$_('column_error_title')}</h2>

  <div class="column-error-panel__buttons">
    <button class="button button--sm" onclick={retry}>{$_('retry')}</button>

    {#if attempts >= 1}
      <button class="button button--sm" onclick={clearAndRetry}>{$_('column_error_clear_retry')}</button>
      <button class="button button--border button--sm" onclick={removeColumn}>{$_('delete_column')}</button>
    {/if}
  </div>
</div>

<style lang="postcss">
  .column-error-panel {
      width: 450px;
      flex-shrink: 0;
      height: 100%;
      max-width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 50px 30px;
      color: var(--text-color-2);
      border-radius: var(--deck-border-radius);
      border: var(--deck-border-width) solid var(--deck-border-color);
      background-color: var(--deck-content-bg-color);

      @media (max-width: 767px) {
          width: 100vw;
          scroll-snap-align: start;
          scroll-snap-stop: always;
          height: 100dvh;
          border: none;
          border-radius: 0;
      }

      &--xxs {
          width: var(--deck-xxs-width);
      }

      &--xs {
          width: var(--deck-xs-width);
      }

      &--small {
          width: var(--deck-s-width);
      }

      &--medium {
          width: var(--deck-m-width);
      }

      &--large {
          width: var(--deck-l-width);
      }

      &--xl {
          width: var(--deck-xl-width);
      }

      &--xxl {
          width: var(--deck-xxl-width);
      }

      @media (max-width: 767px) {
          &--xxs, &--xs, &--small, &--medium, &--large, &--xl, &--xxl {
              width: 100vw;
          }
      }

      &__title {
          font-size: 15px;
          text-align: center;
          color: var(--text-color-1);
      }

      &__buttons {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
      }
  }
</style>
