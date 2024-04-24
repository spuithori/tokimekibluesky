<script lang="ts">
  import {agent, junkColumns} from "$lib/stores";
  import {onMount} from "svelte";
  import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import DeckRow from "../../../../DeckRow.svelte";

  export let id;
  export let handle;
  export let title = '';

  let feed;
  let savedFeeds = [];

  if ($junkColumns.findIndex(_column => _column.id === 'feed_' + id) === -1) {
      junkColumns.set([...$junkColumns, {
          id: 'feed_' + id,
          algorithm: {
              algorithm: 'at://' + handle + '/app.bsky.feed.generator/' + id,
              type: 'custom',
              name: '',
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

  async function getSavedFeeds () {
      const preferenceRes = await $agent.agent.api.app.bsky.actor.getPreferences()
      const preference = preferenceRes.data.preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')
      savedFeeds = preference[0]?.saved || [];
  }

  function isSaved(feed) {
      const uri = feed.uri;
      return savedFeeds.includes(uri);
  }

  onMount(async () => {
      await getSavedFeeds();
      const res = await $agent.agent.api.app.bsky.feed.getFeedGenerator({feed: 'at://' + handle + '/app.bsky.feed.generator/' + id});

      if (res.data.isOnline) {
          feed = res.data.view;
          title = feed.displayName;
      }
  })
</script>

<div class="page-feeds-item">
  {#if (feed)}
    <FeedsItem feed={feed} subscribed={isSaved(feed)} layout={'page'} on:close></FeedsItem>
  {/if}
</div>

{#if ($junkColumns.findIndex(_column => _column.id === 'feed_' + id) !== -1)}
  <DeckRow column={$junkColumns[$junkColumns.findIndex(_column => _column.id === 'feed_' + id)]} isJunk={true} name={title}></DeckRow>
{/if}

<style lang="postcss">
    .page-feeds-item {
        padding: 16px 16px 0;
    }
</style>