<script lang="ts">
  import { run } from 'svelte/legacy';

  import {_} from "svelte-i18n";
  import {agent, realtime} from '$lib/stores';
  import TimelineItem from "./TimelineItem.svelte";
  import InfiniteLoading from 'svelte-infinite-loading';
  import MediaTimelineItem from "./MediaTimelineItem.svelte";
  import {getPostRealtime} from "$lib/realtime";
  import {getDbFollows} from "$lib/getActorsList";
  import {assignCursorFromLatest} from "$lib/components/column/releaseTimeline";
  import {playSound} from "$lib/sounds";
  import MoreDivider from "$lib/components/post/MoreDivider.svelte";
  import {isReasonRepost, isReasonPin} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
  import {toast} from "svelte-sonner";
  import {AppBskyEmbedImages} from "@atproto/api";

  let {
    column = $bindable(),
    index,
    _agent = $agent,
    hideReply,
    hideRepost
  } = $props();

  let isActorsListFinished = false;
  let actors = [];
  let realtimeCounter = 0;
  let isDividerLoading = $state(false);
  let dividerFillerHeight = $state(0);
  let retryCount = 0;

  if (column.settings?.autoRefresh === -1) {
      getActors();
  }

  function insertRealtimeData(realtime) {
      if (!isActorsListFinished) {
          return false;
      }

      getPostRealtime(realtime, actors, _agent)
          .then(value => {
              if (!value) {
                  return false;
              }

              column.data.feed = [value, ...column.data.feed];
              realtimeCounter = realtimeCounter + 1;

              if (realtimeCounter === 20) {
                  realtimeCounter = 0;
                  assignCursorFromLatest(_agent, column);
              }

            if (column.settings?.playSound) {
              playSound(value?.post.indexedAt, column.lastRefresh, column.settings.playSound)
            }
          });
  }

  async function getActors() {
      if (column.algorithm.type === 'default') {
          actors = await getDbFollows(_agent);
      }

      if (column.algorithm.type === 'officialList') {
          actors = await _agent.getListActors(column.algorithm.algorithm);

      }
      isActorsListFinished = true;
  }

  function handleDividerClick(index, cursor, e) {
      column.data.cursor = cursor;
      column.data.feed[index].isDivider = false;
      isDividerLoading = true;
      dividerFillerHeight = e.detail.pos;
      column.data.feed.splice(index + 1);
      column.data.feed = column.data.feed;
  }

  function isDuplicatePost(oldFeed, newFeed) {
      return newFeed.reason
          ? oldFeed.post.uri === newFeed.post.uri && oldFeed.reason?.indexedAt === newFeed.reason.indexedAt
          : oldFeed.post.uri === newFeed.post.uri;
  }

  const handleLoadMore = async ({ detail: { loaded, complete } }) => {
      try {
          const res = await _agent.getTimeline({limit: 20, cursor: column.data.cursor, algorithm: column.algorithm});
          column.data.cursor = res.data.cursor;

          const feed = res.data.feed.filter(feed => {
              return !column.data.feed.some(item => isDuplicatePost(item, feed));
          }).map(item => {
              item.memoryCursor = res.data.cursor;
              return item;
          });

          if (column.algorithm.type === 'author') {
              column.data.feed =  [...column.data.feed, ...feed].filter((feed, index, _feeds) => {
                  if (isReasonRepost(feed.reason)) {
                      return true;
                  }

                  return !_feeds.some(_feed => _feed?.reply?.parent?.uri === feed?.post?.uri);
              }).map((feed, index, _feeds) => {
                  const duplicate = feed.reply && _feeds.slice(0, index).some(_feed => _feed?.reply?.root?.uri === feed?.reply?.root?.uri);

                  return duplicate ? { ...feed, isRootHide: true } : feed;
              });
          } else {
              column.data.feed.push(...feed);
          }

          isDividerLoading = false;

          if (column.data.cursor) {
              if (retryCount > 5) {
                  throw new Error('Retry limit exceeded');
              }

              if (!res.data.feed.length) {
                  retryCount = retryCount + 1;
              } else {
                  retryCount = 0;
              }

              loaded();
          } else {
              complete();
          }
      } catch (e) {
          console.error(e);

          if (e.message === 'BlockedActor') {
              toast.error($_('error_get_posts_because_blocking'));
          }

          if (e.message === 'BlockedByActor') {
              toast.error($_('error_get_posts_because_blocked'));
          }

          complete();
      }
  }
  run(() => {
    insertRealtimeData($realtime);
  });
</script>

<div class="timeline timeline--{column.style}">
  {#if (column.style === 'default')}
    {#each column.data.feed as data, index (data)}
      {#if (data?.post?.author?.did)}
        <TimelineItem
                data={ data }
                index={index}
                column={column}
                {_agent}
                isProfile={column.algorithm.type === 'author'}
                isReplyExpanded={column.algorithm.type === 'author' && !data.isRootHide}
                isPinned={isReasonPin(data?.reason)}
                {hideReply}
                {hideRepost}
        ></TimelineItem>
      {/if}

      {#if data.isDivider}
        <MoreDivider on:click={(e) => {handleDividerClick(index, data.memoryCursor, e)}}></MoreDivider>
      {/if}
    {/each}
  {:else}
    <div class="media-list">
      {#each column.data.feed as data, index (data)}
        {#if (AppBskyEmbedImages.isView(data.post?.embed) || AppBskyEmbedImages.isView(data.post?.embed?.media))}
          <MediaTimelineItem data={data} {_agent}></MediaTimelineItem>
        {/if}
      {/each}
    </div>
  {/if}

  <InfiniteLoading on:infinite={handleLoadMore}>
    {#snippet noMore()}
        <p  class="infinite-nomore"><span>{$_('no_more')}</span></p>
      {/snippet}
    {#snippet noResults()}
        <p  class="infinite-nomore"><span>{$_('no_more')}</span></p>
      {/snippet}
  </InfiniteLoading>

  {#if (isDividerLoading)}
    <div class="more-divider-filler" style="--more-divider-filler-height: {dividerFillerHeight}px"></div>
  {/if}
</div>
