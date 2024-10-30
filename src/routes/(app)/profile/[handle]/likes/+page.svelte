<script lang="ts">
  import { _ } from 'svelte-i18n';
  import type { LayoutData } from '../$types';
  import {agent} from "$lib/stores";
  import TimelineItem from '../../../TimelineItem.svelte';
  import InfiniteLoading from 'svelte-infinite-loading';
  import {BskyAgent} from "@atproto/api";
  import {tick} from "svelte";

  let feeds = $state([]);
  let cursor = '';
  let tempActive = $state(false);

  interface Props {
    author?: string;
    data: LayoutData;
  }

  let { author = '', data }: Props = $props();
  const _agent = new BskyAgent({service: $agent.service()});

  async function getFeedsFromRecords(records) {
      const uris = records.map(record => {
          return record.value.subject.uri;
      })

      const res = await $agent.agent.api.app.bsky.feed.getPosts({uris: uris});
      let feeds = [];
      res.data.posts.forEach(post => {
          feeds.push({
              post: post,
          })
      });
      return  feeds;
  }

  async function getRecords() {
      return await _agent.api.com.atproto.repo.listRecords({
          collection: "app.bsky.feed.like",
          limit: 20,
          reverse: false,
          cursor: cursor,
          repo: data.params.handle});
  }

  const handleLoadMore = async ({ detail: { loaded, complete } }) => {
      try {
          const likesArrayRes = await getRecords();
          cursor = likesArrayRes.data.cursor;
          feeds = [...feeds, ...await getFeedsFromRecords(likesArrayRes.data.records)];

          if (cursor) {
              loaded();
          } else {
              complete();
          }
      } catch (e) {
          console.error(e);
          complete();
      }
  }

  tick().then(() => {
      tempActive = true;
  })
</script>

<svelte:head>
  <title>{data.params.handle} {$_('page_title_likes')} - TOKIMEKI</title>
</svelte:head>

{#if (tempActive)}
  <div class="timeline">
    {#each feeds as data (data)}
      <TimelineItem data={ data }></TimelineItem>
    {/each}

    <InfiniteLoading on:infinite={handleLoadMore}>
      {#snippet noMore()}
        <p  class="infinite-nomore"><span>{$_('no_more')}</span></p>
      {/snippet}
      {#snippet noResults()}
        <p  class="infinite-nomore"><span>{$_('no_more')}</span></p>
      {/snippet}
    </InfiniteLoading>
  </div>
{/if}