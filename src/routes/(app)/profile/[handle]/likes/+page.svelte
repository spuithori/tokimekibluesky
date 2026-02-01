<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { LayoutData } from '../$types';
  import {getAgentContext} from "../state.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import DeckRow from "../../../DeckRow.svelte";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import type { Snapshot } from './$types';
  import {settings} from "$lib/stores";
  import {captureScrollSnapshot, restoreScrollSnapshot, type ScrollSnapshotData} from "$lib/components/virtual/scroll-helpers";

  interface Props {
      data: LayoutData;
  }

  let { data }: Props = $props();

  const agentContext = getAgentContext();
  const columnState = getColumnState(true);
  let columnId = $derived(`like_${data.params.handle}_${agentContext.agent.did()}`);

  const getColData = () => columnState.hasColumn(columnId)
      ? columnState.getColumn(columnState.getColumnIndex(columnId))?.data as any
      : null;
  const isSingle = () => $settings.design?.layout !== 'decks';

  export const snapshot: Snapshot<ScrollSnapshotData> = {
    capture: () => captureScrollSnapshot(getColData, isSingle()),
    restore: (value) => restoreScrollSnapshot(value, getColData, isSingle()),
  };

  if (!columnState.hasColumn(columnId)) {
      columnState.add({
          id: columnId,
          algorithm: {
              algorithm: data.params.handle,
              type: 'authorLike',
              name: '',
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: agentContext.agent.did(),
          handle: agentContext.agent.handle(),
          data: {
              feed: [],
              cursor: '',
          }
      });
  }
</script>

<svelte:head>
  <title>{data.params.handle} {$_('page_title_likes')} - TOKIMEKI</title>
</svelte:head>

{#if (columnState.hasColumn(columnId))}
  <DeckRow index={columnState.getColumnIndex(columnId)} isJunk={true}></DeckRow>
{/if}