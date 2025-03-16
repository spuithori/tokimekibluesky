<script lang="ts">
  import {_} from "svelte-i18n";
  import {agent, realtime} from '$lib/stores';
  import TimelineItem from "./TimelineItem.svelte";
  import {getPostRealtime} from "$lib/realtime";
  import {getDbFollows} from "$lib/getActorsList";
  import {playSound} from "$lib/sounds";
  import MoreDivider from "$lib/components/post/MoreDivider.svelte";
  import {isReasonRepost, isReasonPin} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
  import {toast} from "svelte-sonner";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {isAfter} from "date-fns";
  import {tick} from "svelte";
  import Infinite from "$lib/components/utils/Infinite.svelte";

  let {
    index,
    _agent = $agent,
    isJunk,
    unique,
  } = $props();

  const columnState = getColumnState(isJunk);
  const column = columnState.getColumn(index);
  let isActorsListFinished = false;
  let actors = [];
  let realtimeCounter = 0;
  let isDividerLoading = $state(false);
  let dividerFillerHeight = $state(0);

  $effect(() => {
      insertRealtimeData($realtime);
  })

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

              column.data.feed.unshift(value);
              realtimeCounter = realtimeCounter + 1;

              if (realtimeCounter === 20) {
                  realtimeCounter = 0;

                  _agent.getTimeline({limit: 20, cursor: '', algorithm: column.algorithm})
                      .then((res) => {
                          const refPost = res.data.feed.slice(-1)[0];
                          const cursor = res.data.cursor;
                          let i = 0;

                          while (i < 20) {
                              column.data.feed[i].memoryCursor = cursor;

                              if (isDuplicatePost(column.data.feed[i], refPost)) {
                                  break;
                              }

                              i++;
                          }
                      });
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

  function handleDividerClick(index, cursor, pos) {
      column.data.cursor = cursor;
      column.data.feed[index].isDivider = false;
      isDividerLoading = true;
      dividerFillerHeight = pos;
      column.data.feed.splice(index + 1);
  }

  async function handleDividerUp(index, cursor) {
    try {
      const res = await _agent.getTimeline({limit: 100, cursor: cursor, algorithm: column.algorithm});
      const last = column.data.feed[index + 1];

      if (!last) {
        return false;
      }

      const feed = res.data.feed.filter(feed => {
        if (isReasonRepost(feed.reason)) {
          if (isAfter(feed?.reason?.indexedAt, last?.reason?.indexedAt || last?.post?.indexedAt)) {
            return true;
          }
        } else {
          if (isAfter(feed?.post?.indexedAt, last?.reason?.indexedAt || last?.post?.indexedAt)) {
            return true;
          }
        }

        return false;
      }).map(item => {
        item.memoryCursor = res.data.cursor;
        return item;
      });

      column.data.feed.splice(index + 1, 0, ...feed);
      column.data.feed[index].isDivider = false;
      column.data.feed[index + feed.length].isDivider = true;

      if (feed.length !== res.data.feed.length) {
        tick().then(() => {
          column.data.feed[index + feed.length].isDivider = false;
        })
      }
    } catch (e) {
      console.error(e);
    }
  }

  function isDuplicatePost(oldFeed, newFeed) {
      return newFeed.reason
          ? oldFeed.post.uri === newFeed.post.uri && oldFeed.reason?.indexedAt === newFeed.reason.indexedAt
          : oldFeed.post.uri === newFeed.post.uri;
  }

  const handleLoadMore = async (loaded, complete) => {
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
</script>

<div class="timeline timeline--{column.style}">
  <div class:media-list={column.style === 'media'} class:video-list={column.style === 'video'}>
    {#each column.data.feed as data, index (data)}
      {#if (data?.post?.author?.did)}
        <svelte:boundary>
          <TimelineItem
                  {data}
                  {index}
                  {column}
                  {_agent}
                  isProfile={column.algorithm.type === 'author'}
                  isReplyExpanded={column.algorithm.type === 'author' && !data.isRootHide}
                  isPinned={isReasonPin(data?.reason)}
          ></TimelineItem>

          {#snippet failed(error, reset)}
            <p style="padding: 16px;">post load error!!</p>
          {/snippet}
        </svelte:boundary>
      {/if}

      {#if data?.isDivider}
        <MoreDivider onDividerClick={(pos) => {handleDividerClick(index, data.memoryCursor, pos)}} onDividerUp={() => {handleDividerUp(index, data.memoryCursor)}} column={column}></MoreDivider>
      {/if}
    {/each}
  </div>

  {#key unique}
    <Infinite oninfinite={handleLoadMore}></Infinite>
  {/key}

  {#if (isDividerLoading)}
    <div class="more-divider-filler" style="--more-divider-filler-height: {dividerFillerHeight}px"></div>
  {/if}
</div>
