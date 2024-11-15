<script lang="ts">
  import {onMount} from "svelte";
  import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import DeckRow from "../../../../DeckRow.svelte";
  import {getDidByHandle} from "$lib/util";
  import {getColumnState} from "$lib/classes/columnState.svelte";

  interface Props {
    id: any;
    handle: any;
    title?: string;
  }

  let { id, handle = $bindable(), title = $bindable(''), _agent }: Props = $props();

  const columnState = getColumnState(true);
  let feed = $state();
  let columnId = $derived(`feed_${id}_${_agent.did()}`);
  let savedFeeds = [];

  async function getSavedFeeds () {
      const preferenceRes = await _agent.agent.api.app.bsky.actor.getPreferences()
      const preference = preferenceRes.data.preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')
      savedFeeds = preference[0]?.saved || [];
  }

  function isSaved(feed) {
      const uri = feed.uri;
      return savedFeeds.includes(uri);
  }

  onMount(async () => {
      await getSavedFeeds();
      handle = await getDidByHandle(handle, _agent);

      if (!columnState.hasColumn(columnId)) {
          columnState.add({
              id: columnId,
              algorithm: {
                  algorithm: 'at://' + handle + '/app.bsky.feed.generator/' + id,
                  type: 'custom',
                  name: '',
              },
              style: 'default',
              settings: defaultDeckSettings,
              did: _agent.did(),
              handle: _agent.handle(),
              data: {
                  feed: [],
                  cursor: '',
              }
          });
      }

      const res = await _agent.agent.api.app.bsky.feed.getFeedGenerator({feed: 'at://' + handle + '/app.bsky.feed.generator/' + id});

      if (res.data.isOnline) {
          feed = res.data.view;
          title = feed.displayName;
      }
  })
</script>

<div class="page-feeds-item">
  {#if (feed)}
    <FeedsItem feed={feed} subscribed={isSaved(feed)} layout={'page'} {_agent} on:close></FeedsItem>
  {/if}
</div>

{#if (columnState.hasColumn(columnId))}
  <DeckRow index={columnState.getColumnIndex(columnId)} isJunk={true} name={title} {_agent}></DeckRow>
{/if}

<style lang="postcss">
    .page-feeds-item {
        padding: 16px 16px 0;
    }
</style>