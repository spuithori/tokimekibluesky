<script lang="ts">
  import {_} from "svelte-i18n";
  import {agent, realtime, settings, changedFollowData} from '$lib/stores';
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
  import VirtualTimeline from "$lib/components/timeline/VirtualTimeline.svelte";
  import type {ScrollState} from "$lib/components/virtual/types";

  let { index, _agent = $agent, isJunk, unique, isSplit = false, column: columnProp = undefined, isTopScrolling = false } = $props();

  let virtualTimelineRef: ReturnType<typeof VirtualTimeline> | undefined = $state();
  let isSingleColumnMode = $derived($settings.design?.layout !== 'decks');

  const columnState = getColumnState(isJunk);
  const column = columnProp ?? columnState.getColumn(index);
  let isActorsListFinished = false;
  let actors = [];
  let realtimeCounter = 0;
  let isDividerLoading = $state(false);
  let dividerFillerHeight = $state(0);
  let controller: null | AbortController = null;

  $effect(() => {
      insertRealtimeData($realtime);
  })

  $effect(() => {
      if (column.settings?.autoRefresh === -1 && !isActorsListFinished) {
          getActors();
      }
  })

  $effect(() => {
      if (!$changedFollowData || !isActorsListFinished || column.algorithm?.type !== 'default') {
          return;
      }

      if ($changedFollowData.actor !== column.did) {
          return;
      }

      const { did, following } = $changedFollowData;
      if (following) {
          if (!actors.includes(did)) {
              actors = [...actors, did];
          }
      } else {
          actors = actors.filter(actor => actor !== did);
      }
  })

  function insertRealtimeData(realtime) {
      if (!isActorsListFinished) {
          return false;
      }

      getPostRealtime(realtime, actors, _agent)
          .then(value => {
              if (!value) {
                  return false;
              }

              columnState.updateFeed(column.id, f => { f.unshift(value); });
              realtimeCounter = realtimeCounter + 1;

              if (realtimeCounter === 20) {
                  realtimeCounter = 0;

                  _agent.getTimeline({limit: 20, cursor: '', algorithm: column.algorithm})
                      .then((res) => {
                          const refPost = res.data.feed.slice(-1)[0];
                          const cursor = res.data.cursor;
                          let i = 0;

                          columnState.updateFeed(column.id, f => {
                              while (i < 20 && i < f.length) {
                                  f[i].memoryCursor = cursor;

                                  if (isDuplicatePost(f[i], refPost)) {
                                      break;
                                  }

                                  i++;
                              }
                          });

                          releaseOldPosts();
                      });
              }

              if (column.settings?.playSound) {
                  playSound(value?.post.indexedAt, column.lastRefresh, column.settings.playSound)
              }
          });
  }

  function releaseOldPosts() {
      const scrollEl = $settings.design?.layout === 'decks' ? column.scrollElement || document.querySelector(':root') : document.querySelector(':root');
      const scrollTop = scrollEl?.scrollTop ?? 0;
      const feed = columnState.getFeed(column.id);

      if (scrollTop !== 0 || feed.length <= 40) {
          return;
      }

      const borderItem = feed[39];
      if (borderItem?.memoryCursor) {
          const lastCursorIndex = feed.findLastIndex(item => item.memoryCursor === borderItem.memoryCursor);
          if (lastCursorIndex !== -1) {
              columnState.updateFeed(column.id, f => { f.splice(lastCursorIndex + 1); });
              column.data.cursor = borderItem.memoryCursor;
          }
      }
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
      columnState.updateFeed(column.id, f => {
          f[index] = { ...f[index], isDivider: false };
          f.splice(index + 1);
      });
      isDividerLoading = true;
      dividerFillerHeight = pos;
  }

  async function handleDividerUp(index, cursor, dividerEl: HTMLElement | undefined) {
    try {
      const res = await _agent.getTimeline({limit: 100, cursor: cursor, algorithm: column.algorithm});
      const currentFeed = columnState.getFeed(column.id);
      const last = currentFeed[index + 1];

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

      const newDividerIndex = index + feed.length;
      columnState.updateFeed(column.id, f => {
          f.splice(index + 1, 0, ...feed);
          f[index] = { ...f[index], isDivider: false };
          f[newDividerIndex] = { ...f[newDividerIndex], isDivider: true };
      });

      const useVirtualList = (column.style === 'default' || !column.style) && !isSingleColumnMode && !$settings.general?.useVirtual;
      if (useVirtualList && virtualTimelineRef) {
        tick().then(() => {
          virtualTimelineRef?.scrollToIndex(newDividerIndex, { align: 'start', offset: 0 });
        });
      } else if (dividerEl) {
        const bottomEl = dividerEl.nextElementSibling as HTMLElement;
        if (bottomEl) {
          tick().then(() => {
            const scrollEl: HTMLElement = $settings.design?.layout === 'decks' ? column.scrollElement || document.querySelector(':root') : document.querySelector(':root');
            const offsetTop = bottomEl.offsetTop - 52;
            scrollEl.scrollTo(0, offsetTop);
          });
        }
      }

      if (feed.length !== res.data.feed.length) {
        tick().then(() => {
          columnState.updateFeed(column.id, f => { f[newDividerIndex] = { ...f[newDividerIndex], isDivider: false }; });
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
        controller = new AbortController();
        const res = await _agent.getTimeline({limit: 20, cursor: column.data.cursor, algorithm: column.algorithm, lang: $settings?.general?.userLanguage}, controller.signal);
          column.data.cursor = res.data.cursor;

        const existingFeedMap = new Map(
            columnState.getFeed(column.id).map(item => [
                item.reason ? `${item.post.uri}|${item.reason.indexedAt}` : item.post.uri,
                item
            ])
        );

        const feed = res.data.feed
            .filter(feed => {
                const key = feed.reason ? `${feed.post.uri}|${feed.reason.indexedAt}` : feed.post.uri;
                const existing = existingFeedMap.get(key);
                return !existing || !isDuplicatePost(existing, feed);
            })
            .map(item => {
                item.memoryCursor = res.data.cursor;
                return item;
            });

        if (column.algorithm.type === 'author') {
            const existingParentUris = new Set();
            const existingRootUris = new Set();

            columnState.getFeed(column.id).forEach(f => {
                if (f?.post?.uri) existingParentUris.add(f.post.uri);
                if (f?.reply?.root?.uri) existingRootUris.add(f.reply.root.uri);
            });

            feed.forEach(f => {
                const parentUri = f?.reply?.parent?.uri;
                if (parentUri) existingParentUris.add(parentUri);
            });

            const processedFeed = feed
                .filter(newFeed => {
                    if (isReasonRepost(newFeed.reason)) return true;
                    return !existingParentUris.has(newFeed?.post?.uri);
                })
                .map(newFeed => {
                    const rootUri = newFeed?.reply?.root?.uri;
                    const isDuplicate = rootUri && existingRootUris.has(rootUri);

                    if (rootUri) {
                        existingRootUris.add(rootUri);
                    }

                    return isDuplicate ? { ...newFeed, isRootHide: true } : newFeed;
                });

            columnState.updateFeed(column.id, f => { f.push(...processedFeed); });
          } else {
            columnState.updateFeed(column.id, f => { f.push(...feed); });
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

  $effect(() => {
    return () => {
      if (controller) {
        controller.abort();
      }
    }
  })

  export function getScrollState(): ScrollState | null {
    return virtualTimelineRef?.getScrollState() ?? null;
  }

  export function restoreScrollState(state: ScrollState): void {
    virtualTimelineRef?.restoreScrollState(state);
  }
</script>

{#if (column.style === 'default' || !column.style) && !isSingleColumnMode && !$settings.general?.useVirtual}
  <VirtualTimeline
    {column}
    {_agent}
    {isJunk}
    {unique}
    {handleLoadMore}
    {handleDividerClick}
    {handleDividerUp}
    onScrollStateSave={(state) => { if (column.data) column.data.scrollState = state; }}
    onScrollStateClear={() => { if (column.data) column.data.scrollState = null; if (column.data?._pendingScrollRestore) column.data._pendingScrollRestore = null; }}
    bind:this={virtualTimelineRef}
  />

  {#if (isDividerLoading)}
    <div class="more-divider-filler" style="--more-divider-filler-height: {dividerFillerHeight}px"></div>
  {/if}
{:else}
  <div class="timeline timeline--{column.style || 'default'}">
    <div class:media-list={column.style === 'media'} class:media-list--1={column.style === 'media' && column?.settings?.mediaColumns === 1} class:media-list--2={column.style === 'media' && column?.settings?.mediaColumns === 2} class:video-list={column.style === 'video'}>
      {#each columnState.getFeed(column.id) as data, index (data)}
        {#if (data?.post?.author?.did)}
          <svelte:boundary>
            <TimelineItem
                    {data}
                    {index}
                    {column}
                    {_agent}
                    feed={columnState.getFeed(column.id)}
                    isReplyExpanded={column.algorithm.type === 'author' && !data.isRootHide}
                    isPinned={isReasonPin(data?.reason)}
            ></TimelineItem>

            {#snippet failed(error, reset)}
              <p style="padding: 16px;">post load error!!</p>
            {/snippet}
          </svelte:boundary>
        {/if}

        {#if data?.isDivider}
          <MoreDivider onDividerClick={(pos) => {handleDividerClick(index, data.memoryCursor, pos)}} onDividerUp={(el) => {handleDividerUp(index, data.memoryCursor, el)}}></MoreDivider>
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
{/if}
