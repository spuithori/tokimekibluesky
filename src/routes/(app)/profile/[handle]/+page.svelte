<script lang="ts">
  import type {LayoutData, Snapshot} from './$types';
  import {settings} from '$lib/stores';
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import DeckRow from "../../DeckRow.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {getAgentContext} from "./state.svelte";

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

  export const snapshot: Snapshot<{ index: number; key?: string; offset: number; scrollTop?: number; visualY?: number; legacyScrollTop?: number } | null> = {
      capture: () => {
          if (!columnState.hasColumn(columnId)) return null;
          const colData = columnState.getColumn(columnState.getColumnIndex(columnId))?.data as any;
          const s = colData?.scrollState;
          if (s) {
              return { index: s.index, key: s.key, offset: s.offset, scrollTop: s.scrollTop, visualY: s.visualY };
          }
          const el = document.querySelector('.modal-page-content') as HTMLElement | null;
          if (!el) return null;
          return { index: 0, offset: 0, legacyScrollTop: el.scrollTop };
      },
      restore: (value) => {
          if (!value) return;
          if (value.legacyScrollTop != null) {
              requestAnimationFrame(() => {
                  (document.querySelector('.modal-page-content') as HTMLElement)?.scroll(0, value.legacyScrollTop!);
              });
              return;
          }
          if (!columnState.hasColumn(columnId)) return;
          const colData = columnState.getColumn(columnState.getColumnIndex(columnId))?.data as any;
          if (!colData) return;
          colData._pendingScrollRestore = { ...value, heights: [] };
      }
  };
</script>

<svelte:head>
  <title>{data.params.handle} - TOKIMEKI</title>
</svelte:head>

{#if (columnState.hasColumn('profile_' + data.params.handle))}
  <DeckRow index={columnState.getColumnIndex('profile_' + data.params.handle)} isJunk={true} _agent={agentContext.agent}></DeckRow>
{/if}
