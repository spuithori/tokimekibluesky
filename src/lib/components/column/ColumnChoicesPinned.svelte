<script lang="ts">
  import {onMount} from "svelte";
  import {_} from 'tokimeki-i18n';
  import Layers from '@lucide/svelte/icons/layers';
  import {agent, isColumnModalOpen} from '$lib/stores';
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import ColumnListAdder from "$lib/components/column/ColumnListAdder.svelte";
  import {runCommand} from "$lib/commands/registry.svelte";

  let { _agent = $agent } = $props();

  function addAsFeedTabs() {
      runCommand('column.feedtabs');
      isColumnModalOpen.set(false);
  }
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
    const agent = _agent;
    try {
      const pinned = await agent.getV2PinnedFeeds();

      const feedsPromises = pinned.map(async (feed) => {
        try {
          if (feed.type === 'feed') {
            const res = await agent.xrpc.get('app.bsky.feed.getFeedGenerator', { feed: feed.value });
            return {
              ...feed,
              name: res?.view?.displayName,
            };
          } else if (feed.type === 'list') {
            const res = await agent.xrpc.get('app.bsky.graph.getList', { list: feed.value });
            return {
              ...feed,
              name: res?.list?.name,
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
  <button class="button button--sm button--border feed-tabs-add-button" onclick={addAsFeedTabs}>
    <Layers size="16"></Layers>
    {$_('feed_tabs_add_pinned')}
  </button>

  <ColumnListAdder {_agent} items={pinnedColumns} on:add></ColumnListAdder>
{/if}

<style lang="postcss">
  .feed-tabs-add-button {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 12px;
  }
</style>