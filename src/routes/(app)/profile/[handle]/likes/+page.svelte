<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { LayoutData } from '../$types';
  import {getAgentContext} from "../state.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import DeckRow from "../../../DeckRow.svelte";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import type { Snapshot } from './$types';
  import {settings} from "$lib/stores";

  interface Props {
      data: LayoutData;
  }

  let { data }: Props = $props();

  const agentContext = getAgentContext();
  const columnState = getColumnState(true);
  let columnId = $derived(`like_${data.params.handle}_${agentContext.agent.did()}`);

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