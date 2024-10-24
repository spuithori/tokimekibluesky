<script lang="ts">
  import {agent} from "$lib/stores";
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

  let { id, handle = $bindable(), title = $bindable('') }: Props = $props();

  const columnState = getColumnState(true);

  let feed = $state();
  let savedFeeds = [];

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
      handle = await getDidByHandle(handle, $agent);

      if (!columnState.hasColumn('feed_' + id)) {
          columnState.add({
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
          });
      }

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

{#if (columnState.hasColumn('feed_' + id))}
  <DeckRow index={columnState.getColumnIndex('feed_' + id)} isJunk={true} name={title}></DeckRow>
{/if}

<style lang="postcss">
    .page-feeds-item {
        padding: 16px 16px 0;
    }
</style>