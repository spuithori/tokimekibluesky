<script lang="ts">
  import type {LayoutData, Snapshot} from './$types';
  import {settings} from '$lib/stores';
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import DeckRow from "../../DeckRow.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {tick} from "svelte";
  import {getAgentContext} from "./state.svelte";

  interface Props {
    data: LayoutData;
  }
  let { data }: Props = $props();

  const agentContext = getAgentContext();
  const columnState = getColumnState(true);
  let scrollY = 0;

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

  export const snapshot: Snapshot = {
      capture: () => [$settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector(':root').scrollTop],
      restore: (value) => {
        [scrollY] = value;

        tick().then(() => {
          if ($settings.design.layout === 'decks') {
            document.querySelector('.modal-page-content').scroll(0, scrollY);
          } else {
            document.querySelector(':root').scroll(0, scrollY);
          }
        });
      }
  };
</script>

<svelte:head>
  <title>{data.params.handle} - TOKIMEKI</title>
</svelte:head>

{#if (columnState.hasColumn('profile_' + data.params.handle))}
  <DeckRow index={columnState.getColumnIndex('profile_' + data.params.handle)} isJunk={true} _agent={agentContext.agent}></DeckRow>
{/if}
