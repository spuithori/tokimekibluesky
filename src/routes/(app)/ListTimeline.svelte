<script lang="ts">
    import { agent, cursor } from '$lib/stores';
    import { timeline, hideRepost, hideReply, currentAlgorithm, userLists, timelineStyle } from '$lib/stores';
    import TimelineItem from './TimelineItem.svelte';
    import InfiniteLoading from 'svelte-infinite-loading';
    import { afterUpdate, onMount } from 'svelte';
    import { parseISO } from 'date-fns';
    import MediaTimelineItem from "./MediaTimelineItem.svelte";

    export let isRefreshing;

    let actors = [];
    let cursors = [];
    let il;

    let feedPool = [];
    let feed = [];

    timeline.set([]);

    let list = $currentAlgorithm.list;
    if (!list.members.length) {
        throw new Error('Empty List.');
    }

    list.members.forEach(member => {
        actors.push({
            actor: member,
            limit: 20,
            cursor: '',
        })
    })

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        if (!isRefreshing) {
            const ress = await $agent.getTimeline({limit: 20, cursor: '', algorithm: $currentAlgorithm, actors: actors});

            ress.forEach((res, index) => {
                feedPool.push(...res.data.feed);
                cursors.push({
                    actor: actors[index].actor,
                    cursor: res.data.cursor,
                })
            })
            cursors = cursors;
            feedPool = feedPool.sort((a, b) => {
                if (a.reason) {
                    if ( parseISO(a.reason.indexedAt).getTime() < parseISO(b.post.indexedAt).getTime()) {
                        return 1;
                    }
                }

                if (b.reason) {
                    if ( parseISO(a.post.indexedAt).getTime() < parseISO(b.reason.indexedAt).getTime()) {
                        return 1;
                    }
                }

                if ( parseISO(a.post.indexedAt).getTime() < parseISO(b.post.indexedAt).getTime()) {
                    return 1;
                }

                if ( parseISO(a.post.indexedAt).getTime() > parseISO(b.post.indexedAt).getTime()) {
                    return -1;
                }

                return 0;
            });
            feed = feedPool.slice(0, 20);
            feedPool = feedPool.slice(20);
            console.log(feedPool);

            if (cursors.some(item => item.cursor !== undefined)) {
                await poolRecalc(feedPool);

                timeline.update(function (tl) {
                    return [...tl, ...feed];
                });
                console.log($timeline)

                loaded();
            } else {
                complete();
            }
        }
    }

    async function poolRecalc(currentPool: []) {
        let feedPerActorMap = new Map();
        list.members.forEach(member => {
            feedPerActorMap.set(member, []);
        });

        console.log(feedPerActorMap)

        currentPool.forEach(feed => {
            if (feed.reason) {
                feedPerActorMap.set(feed.reason.by.did, [...feedPerActorMap.get(feed.reason.by.did), feed])
            } else {
                feedPerActorMap.set(feed.post.author.did, [...feedPerActorMap.get(feed.post.author.did), feed])
            }
        })

        actors = [];
        feedPerActorMap.forEach((value, key) => {
            if (value.length < 20) {
                actors.push({
                    actor: key,
                    limit: 20 - value.length,
                    cursor: cursors.find(item => item.actor === key)?.cursor || undefined
                })
                cursors = cursors.filter(item => item.actor !== key);
            }
        })
        actors = actors;
    }

    afterUpdate(async() => {
        il.$$.update();
    })
</script>

<div class="timeline timeline--main" class:hide-repost={$hideRepost === 'true'} class:hide-reply={$hideReply === 'true'}>
  {#if ($timelineStyle === 'default')}
    {#each $timeline as data (data)}
      <TimelineItem data={ data }></TimelineItem>
    {/each}
  {:else}
    <div class="media-list">
      {#each $timeline as data (data)}
        {#if (data.post.embed?.images)}
          <MediaTimelineItem data={data}></MediaTimelineItem>
        {/if}
      {/each}
    </div>
  {/if}

  <InfiniteLoading on:infinite={handleLoadMore} bind:this={il}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style>

</style>