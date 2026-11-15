<script lang="ts">
  import { toast } from 'svelte-sonner';
  import { _ } from 'tokimeki-i18n';
  import { api, apiErrorMessage } from '$lib/feedbuilder/api';
  import { feedBuilder, recordToDraft, draftSummary } from '$lib/feedbuilder/feedBuilder.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import type { CustomFeedDefinitionRecord } from '$lib/feedbuilder/types';

  interface Props {
    uri: string;
    onclose: () => void;
  }
  let { uri, onclose }: Props = $props();

  type Version = { replacedAt: string; record: CustomFeedDefinitionRecord };
  let versions = $state<Version[] | null>(null);
  let error = $state<string | null>(null);

  $effect(() => {
    let alive = true;
    api
      .definitionHistory(uri)
      .then((r) => {
        if (alive) versions = r.versions;
      })
      .catch((e) => {
        if (alive) error = e instanceof Error ? apiErrorMessage(e) : $_('tfeeds_sortvis_history_load_failed');
      });
    return () => {
      alive = false;
    };
  });

  function summary(r: CustomFeedDefinitionRecord): string {
    const d = recordToDraft(r);
    return d ? draftSummary(d) : $_('tfeeds_sortvis_history_advanced');
  }

  function when(v: Version): string {
    const t = v.record.updatedAt ?? v.record.createdAt;
    return t ? new Date(t).toLocaleString() : $_('tfeeds_sortvis_history_unknown_date');
  }

  function restore(v: Version) {
    feedBuilder.restoreVersion(v.record);
    toast.success($_('tfeeds_sortvis_history_restored'));
    onclose();
  }
</script>

<Modal title={$_('tfeeds_sortvis_history_title')} {onclose}>
  <div class="history">
    <p class="history__hint">
      {$_('tfeeds_sortvis_history_hint')}
    </p>
    {#if error}
      <p class="history__error">{error}</p>
    {:else if !versions}
      <p class="history__hint">{$_('tfeeds_sortvis_loading')}</p>
    {:else if versions.length === 0}
      <p class="history__hint">{$_('tfeeds_sortvis_history_empty')}</p>
    {:else}
      <ul class="history__list">
        {#each versions as v (v.replacedAt)}
          <li class="history__item">
            <div class="history__text">
              <span class="history__name">{v.record.name}</span>
              <span class="history__meta">{$_('tfeeds_sortvis_history_saved_at', { when: when(v) })}</span>
              <span class="history__summary">{summary(v.record)}</span>
            </div>
            <button type="button" class="history__restore" onclick={() => restore(v)}>{$_('tfeeds_sortvis_history_load')}</button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</Modal>

<style lang="postcss">
  .history {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);

    &__hint {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-color-3);
    }

    &__error {
      margin: 0;
      color: var(--danger-color);
    }

    &__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-3);
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-3);
      background: var(--bg-color-2);
    }

    &__text {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    &__name {
      font-weight: 600;
      color: var(--text-color-1);
      overflow-wrap: anywhere;
    }

    &__meta {
      font-size: 12px;
      color: var(--text-color-3);
    }

    &__summary {
      font-size: 12px;
      color: var(--text-color-2);
      overflow-wrap: anywhere;
    }

    &__restore {
      all: unset;
      flex-shrink: 0;
      padding: 6px var(--space-3);
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-3);
      background: var(--bg-color-1);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-color-2);
      cursor: pointer;

      &:hover {
        background: var(--surface-hover);
        color: var(--primary-color);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }
  }
</style>
