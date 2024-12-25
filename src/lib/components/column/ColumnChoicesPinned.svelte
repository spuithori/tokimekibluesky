<script lang="ts">
  import {onMount} from "svelte";
  import {agent} from '$lib/stores';
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import ColumnListAdder from "$lib/components/column/ColumnListAdder.svelte";

  let { _agent = $agent } = $props();
  let feeds = $state([]);
  let pinnedColumns = $derived.by(() => {
    return feeds.map(feed => {
      let type = 'default';
      let algorithm;
      let name = 'HOME';

      if (feed.type === 'feed') {
        type = 'custom';
        algorithm = feed.value;
        name = feed.name;
      } else if (feed.type === 'list') {
        type = 'officialList';
        algorithm = feed.value;
        name = feed.name;
      }

      return {
        id: self.crypto.randomUUID(),
        algorithm: {
          type: type,
          algorithm: algorithm,
          name: name,
        },
        style: 'default',
        settings: defaultDeckSettings,
        did: _agent.did(),
        handle: _agent.handle(),
        data: {
          feed: [],
          cursor: '',
        }
      }
    });
  });

  onMount(async () => {
    try {
      const pinned = await _agent.getV2PinnedFeeds();

      const feedsPromises = pinned.map(async (feed) => {
        try {
          if (feed.type === 'feed') {
            const res = await _agent.agent.api.app.bsky.feed.getFeedGenerator({ feed: feed.value });
            return {
              ...feed,
              name: res?.data?.view?.displayName,
            };
          } else if (feed.type === 'list') {
            const res = await _agent.agent.api.app.bsky.graph.getList({ list: feed.value });
            return {
              ...feed,
              name: res?.data?.list?.name,
            };
          } else {
            return feed;
          }
        } catch (e) {
          console.error(`Error ${feed.type}: ${feed.value}`, e);
          return { ...feed, error: true };
        }
      });

      feeds = await Promise.allSettled(feedsPromises);

      feeds = feeds.map(result => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error('Promise rejected:', result.reason);
          return { error: true, reason: result.reason };
        }
      });
    } catch (e) {
      console.error("An unexpected error occurred:", e);
    }
  });
</script>

{#if (pinnedColumns.length)}
  <ColumnListAdder {_agent} items={pinnedColumns} on:add></ColumnListAdder>
{/if}