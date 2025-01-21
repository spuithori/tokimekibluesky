<script lang="ts">
  import {onMount} from "svelte";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import DeckRow from "../../../../DeckRow.svelte";
  import {getDidByHandle} from "$lib/util";
  import {getColumnState} from "$lib/classes/columnState.svelte";

  let { id, handle, title, _agent, contentMode } = $props();

  const columnState = getColumnState(true);
  let feed = $state();
  let columnId = $derived(`feed_${id}_${_agent.did()}`);

  onMount(async () => {
      handle = await getDidByHandle(handle, _agent);

      if (!columnState.hasColumn(columnId)) {
          columnState.add({
              id: columnId,
              algorithm: {
                  algorithm: 'at://' + handle + '/app.bsky.feed.generator/' + id,
                  type: 'custom',
                  name: title || '',
              },
              style: contentMode === 'app.bsky.feed.defs#contentModeVideo' ? 'video' : 'default',
              settings: defaultDeckSettings,
              did: _agent.did(),
              handle: _agent.handle(),
              data: {
                  feed: [],
                  cursor: '',
              }
          });
      }
  })
</script>

{#if (columnState.hasColumn(columnId))}
  <DeckRow index={columnState.getColumnIndex(columnId)} isJunk={true} name={title} {_agent}></DeckRow>
{/if}
