<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { LayoutData } from '../$types';
  import {getAgentContext} from "../state.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {tick} from "svelte";
  import DeckRow from "../../../DeckRow.svelte";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import type { Snapshot } from './$types';
  import {isAfterReload, settings} from "$lib/stores";

  interface Props {
    data: LayoutData;
  }

  let { data }: Props = $props();

  const agentContext = getAgentContext();
  const columnState = getColumnState(true);
  let columnId = $derived(`video_${data.params.handle}_${agentContext.agent.did()}`);

  export const snapshot: Snapshot = {
    capture: () => [$settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector(':root').scrollTop],
    restore: (value) => {
      if(!$isAfterReload) {
        [scrollY] = value;

        tick().then(() => {
          if ($settings.design.layout === 'decks') {
            document.querySelector('.modal-page-content').scroll(0, scrollY);
          } else {
            document.querySelector(':root').scroll(0, scrollY);
          }
        });
      }

      isAfterReload.set(false);
    }
  };

  if (!columnState.hasColumn(columnId)) {
      columnState.add({
          id: columnId,
          algorithm: {
              algorithm: data.params.handle,
              type: 'authorVideo',
              name: 'Video',
          },
          style: 'video',
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
  <title>{data.params.handle} {$_('page_title_media')} - TOKIMEKI</title>
</svelte:head>

{#if (columnState.hasColumn(columnId))}
  <DeckRow index={columnState.getColumnIndex(columnId)} isJunk={true}></DeckRow>
{/if}