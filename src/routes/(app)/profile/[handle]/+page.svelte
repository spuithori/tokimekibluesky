<script lang="ts">
  import type {LayoutData, Snapshot} from './$types';
  import {settings} from '$lib/stores';
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import DeckRow from "../../DeckRow.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {getAgentContext} from "./state.svelte";
  import {captureScrollSnapshot, restoreScrollSnapshot, type ScrollSnapshotData} from "$lib/components/virtual/scroll-helpers";

  interface Props {
    data: LayoutData;
  }
  let { data }: Props = $props();

  const agentContext = getAgentContext();
  const columnState = getColumnState(true);

  if (!columnState.hasColumn('profile_' + data.params.handle)) {
      columnState.add({
          id: 'profile_' + data.params.handle,
          algorithm: {
              algorithm: data.params.handle,
              type: 'author',
              name: '@' + data.params.handle,
          },
          style: 'default',
          settings: {
            ...defaultDeckSettings,
            timeline: {
              hideReply: 'all',
              hideRepost: 'all',
              hideQuote: false,
              hideMention: 'all',
              simpleReply: false,
            }
          },
          did: agentContext.agent.did(),
          handle: agentContext.agent.handle(),
          data: {
              feed: [],
              cursor: '',
          }
      });
  }

  const columnId = 'profile_' + data.params.handle;

  const getColData = () => columnState.hasColumn(columnId)
      ? columnState.getColumn(columnState.getColumnIndex(columnId))?.data as any
      : null;
  const isSingle = () => $settings.design?.layout !== 'decks';

  export const snapshot: Snapshot<ScrollSnapshotData> = {
      capture: () => captureScrollSnapshot(getColData, isSingle()),
      restore: (value) => restoreScrollSnapshot(value, getColData, isSingle()),
  };
</script>

<svelte:head>
  <title>{data.params.handle} - TOKIMEKI</title>
</svelte:head>

{#if (columnState.hasColumn('profile_' + data.params.handle))}
  <DeckRow index={columnState.getColumnIndex('profile_' + data.params.handle)} isJunk={true} _agent={agentContext.agent}></DeckRow>
{/if}
