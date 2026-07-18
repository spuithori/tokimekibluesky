<script lang="ts">
  import {_} from "tokimeki-i18n";
  import {agent, realtime, settings, changedFollowData} from '$lib/stores';
  import TimelineItem from "./TimelineItem.svelte";
  import {getPostRealtime} from "$lib/realtime";
  import {getDbFollows} from "$lib/getActorsList";
  import {playSound} from "$lib/sounds";
  import MoreDivider from "$lib/components/post/MoreDivider.svelte";
  import {isReasonRepost, isReasonPin} from "$lib/atproto-guards";
  import {toast} from "svelte-sonner";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {tick} from "svelte";
  import Infinite from "$lib/components/utils/Infinite.svelte";
  import VirtualTimeline from "$lib/components/timeline/VirtualTimeline.svelte";
  import {isVirtualTimelineEnabled} from "$lib/components/timeline/virtualGate";
  import {trimFeedAtBorder} from "$lib/components/timeline/feedTrim";
  import {makeFeedKeys} from "$lib/components/timeline/feedKeys";

  let { index, _agent = $agent, isJunk, unique, isSplit = false, column: columnProp = undefined, isTopScrolling = false } = $props();

  let virtualTimelineRef: ReturnType<typeof VirtualTimeline> | undefined = $state();

  const columnState = getColumnState(isJunk);
  const column = columnProp ?? columnState.getColumn(index);
  const useVirtualList = $derived(isVirtualTimelineEnabled(column));
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
                          const refPost = res.feed.slice(-1)[0];
                          const cursor = res.cursor;
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

  function getReleaseScrollElement(): HTMLElement {
      if ($settings.design?.layout !== 'decks') {
          return document.documentElement;
      }
      if (isJunk && column.scrollElement) {
          return (column.scrollElement.closest('.modal-page-content') as HTMLElement) ?? column.scrollElement;
      }
      return column.scrollElement || document.documentElement;
  }

  function releaseOldPosts() {
      const scrollEl = getReleaseScrollElement();
      const scrollTop = scrollEl?.scrollTop ?? 0;

      if (scrollTop !== 0) {
          return;
      }

      const plan = trimFeedAtBorder(columnState.getFeed(column.id), column.style);
      if (plan) {
          columnState.updateFeed(column.id, f => { f.splice(plan.spliceStart); });
          column.data.cursor = plan.cursor;
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
      controller?.abort();
      column.data.cursor = cursor;
      columnState.updateFeed(column.id, f => {
          f[index] = { ...f[index], isDivider: false };
          f.splice(index + 1);
      });
      isDividerLoading = true;
      dividerFillerHeight = pos;

      if (useVirtualList) {
          tick().then(() => {
              virtualTimelineRef?.forceLoad?.();
          });
      }
  }

  async function handleDividerUp(index, cursor, dividerEl: HTMLElement | undefined) {
    try {
      const res = await _agent.getTimeline({limit: 100, cursor: cursor, algorithm: column.algorithm});
      const currentFeed = columnState.getFeed(column.id);

      if (!currentFeed[index]?.isDivider) {
        index = currentFeed.findIndex(item => item?.isDivider && item?.memoryCursor === cursor);
        if (index === -1) {
          return false;
        }
      }

      const last = currentFeed[index + 1];

      if (!last) {
        return false;
      }

      const feed = res.feed.filter(feed => {
        if (isReasonRepost(feed.reason)) {
          if (new Date(feed?.reason?.indexedAt) > new Date(last?.reason?.indexedAt || last?.post?.indexedAt)) {
            return true;
          }
        } else {
          if (new Date(feed?.post?.indexedAt) > new Date(last?.reason?.indexedAt || last?.post?.indexedAt)) {
            return true;
          }
        }

        return false;
      }).map(item => {
        item.memoryCursor = res.cursor;
        return item;
      });

      const gapRemains = res.feed.length > 0 && feed.length === res.feed.length;
      const newDividerIndex = index + feed.length;
      const seamY = dividerEl?.isConnected ? dividerEl.getBoundingClientRect().bottom : undefined;
      const bottomEl = dividerEl?.nextElementSibling as HTMLElement | undefined;

      columnState.updateFeed(column.id, f => {
          f.splice(index + 1, 0, ...feed);
          f[index] = { ...f[index], isDivider: false };
          if (gapRemains) {
            f[newDividerIndex] = { ...f[newDividerIndex], isDivider: true };
          }
      });

      if (useVirtualList && virtualTimelineRef) {
        tick().then(() => {
          const target = Math.min(newDividerIndex + 1, columnState.getFeed(column.id).length - 1);
          if (seamY !== undefined) {
            virtualTimelineRef?.scrollToIndexAt(target, seamY);
          } else {
            virtualTimelineRef?.scrollToIndex(target, { align: 'start', offset: 0 });
          }
        });
      } else if (bottomEl && seamY !== undefined) {
        tick().then(() => {
          if (!bottomEl.isConnected) return;
          const scrollEl: HTMLElement = $settings.design?.layout === 'decks' ? column.scrollElement || document.documentElement : document.documentElement;
          scrollEl.scrollTop += bottomEl.getBoundingClientRect().top - seamY;
        });
      }
    } catch (e) {
      console.error(e);
    }
  }

  function isDuplicatePost(oldFeed, newFeed) {
      if (!oldFeed?.post || !newFeed?.post) return false;
      return newFeed.reason
          ? oldFeed.post.uri === newFeed.post.uri && oldFeed.reason?.indexedAt === newFeed.reason.indexedAt
          : oldFeed.post.uri === newFeed.post.uri;
  }

  const handleLoadMore = async (loaded, complete) => {
      let addedCount = 0;
      try {
        controller = new AbortController();
        const epoch = unique;
        const res = await _agent.getTimeline({limit: 20, cursor: column.data.cursor, algorithm: column.algorithm, lang: $settings?.general?.userLanguage}, controller.signal);

        if (unique !== epoch) {
            return;
        }

          column.data.cursor = res.cursor;

        if (res.hitsTotal !== undefined) {
            column.data.hitsTotal = res.hitsTotal;
        }

        const existingFeedMap = new Map(
            columnState.getFeed(column.id).filter(item => item?.post?.uri).map(item => [
                item.reason ? `${item.post.uri}|${item.reason.indexedAt}` : item.post.uri,
                item
            ])
        );

        const feed = res.feed
            .filter(feed => {
                const key = feed.reason ? `${feed.post.uri}|${feed.reason.indexedAt}` : feed.post.uri;
                const existing = existingFeedMap.get(key);
                return !existing || !isDuplicatePost(existing, feed);
            })
            .map(item => {
                item.memoryCursor = res.cursor;
                return item;
            });

        if (column.algorithm.type === 'author' || column.algorithm.type === 'authorReplies') {
            const first = res.feed?.[0];
            const target = first?.reason?.by ?? first?.post?.author;
            if (target?.did && column.algorithm.algorithm !== target.did) {
                column.algorithm.algorithm = target.did;
            }

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
            addedCount = processedFeed.length;
          } else {
            columnState.updateFeed(column.id, f => { f.push(...feed); });
            addedCount = feed.length;
          }

          if (isDividerLoading && (addedCount > 0 || !res.cursor)) {
              tick().then(() => {
                  isDividerLoading = false;
              });
          }

          if (column.data.cursor) {
              loaded();
          } else {
              complete();
          }
      } catch (e: any) {
          if (e?.name === 'AbortError' || controller?.signal.aborted) {
              complete();
              return;
          }

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

  const feedKeys = $derived(makeFeedKeys(columnState.getFeed(column.id)));
</script>

{#if useVirtualList}
  <VirtualTimeline
    {column}
    {_agent}
    {isJunk}
    {unique}
    {handleLoadMore}
    {handleDividerClick}
    {handleDividerUp}
    onScrollStateSave={(state) => { if (column.data) column.data.scrollState = state; }}
    onScrollStateClear={() => { if (column.data) column.data.scrollState = null; }}
    bind:this={virtualTimelineRef}
  />

  {#if (isDividerLoading)}
    <div class="more-divider-filler" style="--more-divider-filler-height: {dividerFillerHeight}px"></div>
  {/if}
{:else}
  <div class="timeline timeline--{column.style || 'default'}">
    <div class:media-list={column.style === 'media'} class:media-list--1={column.style === 'media' && column?.settings?.mediaColumns === 1} class:media-list--2={column.style === 'media' && column?.settings?.mediaColumns === 2} class:video-list={column.style === 'video'}>
      {#each columnState.getFeed(column.id) as data, index (feedKeys[index])}
        {#if (data?.post?.author?.did)}
          <svelte:boundary>
            <TimelineItem
                    {data}
                    {index}
                    {column}
                    {_agent}
                    feed={columnState.getFeed(column.id)}
                    isReplyExpanded={(column.algorithm.type === 'author' || column.algorithm.type === 'authorReplies') && !data.isRootHide}
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
