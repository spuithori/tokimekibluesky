<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { LayoutData } from '../$types';
  import {tick} from "svelte";
  import {getAgentContext} from "../state.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
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
  let tempActive = $state(false);
  let columnId = $derived(`like_${data.params.handle}_${agentContext.agent.did()}`);

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

  tick().then(() => {
      tempActive = true;
  })
</script>

<svelte:head>
  <title>{data.params.handle} {$_('page_title_likes')} - TOKIMEKI</title>
</svelte:head>

{#if (columnState.hasColumn(columnId) && tempActive)}
  <DeckRow index={columnState.getColumnIndex(columnId)} isJunk={true}></DeckRow>
{/if}