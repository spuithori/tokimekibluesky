<script lang="ts">
  import type {LayoutData, Snapshot} from './$types';
  import {agent, isAfterReload, junkColumns, settings} from '$lib/stores';
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import DeckRow from "../../DeckRow.svelte";

  export let data: LayoutData;
  let scrollY = 0;
  let pinnedPost;

  if ($junkColumns.findIndex(_column => _column.id === 'profile_' + data.params.handle) === -1) {
      junkColumns.set([...$junkColumns, {
          id: 'profile_' + data.params.handle,
          algorithm: {
              algorithm: data.params.handle,
              type: 'author',
              name: '@' + data.params.handle,
          },
          style: 'default',
          settings: defaultDeckSettings,
          did: $agent.did(),
          handle: $agent.handle(),
          data: {
              feed: [],
              cursor: '',
          }
      }]);
  }

  export const snapshot: Snapshot = {
      capture: () => [$settings.design.layout === 'decks' ? document.querySelector('.modal-page-content').scrollTop : document.querySelector(':root').scrollTop, pinnedPost],
      restore: (value) => {
        if(!$isAfterReload) {
          [scrollY, pinnedPost] = value;

          setTimeout(() => {
              if ($settings.design.layout === 'decks') {
                  document.querySelector('.modal-page-content').scroll(0, scrollY);
              } else {
                  document.querySelector(':root').scroll(0, scrollY);
              }
          }, 0)
        }

        isAfterReload.set(false);
      }
  };
</script>

<svelte:head>
  <title>{data.params.handle} - TOKIMEKI</title>
</svelte:head>

{#if ($junkColumns.findIndex(_column => _column.id === 'profile_' + data.params.handle) !== -1)}
  <DeckRow column={$junkColumns[$junkColumns.findIndex(_column => _column.id === 'profile_' + data.params.handle)]}
           isJunk={true}></DeckRow>
{/if}
