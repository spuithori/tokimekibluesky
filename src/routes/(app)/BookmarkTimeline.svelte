<script lang="ts">
    import { agent, cursor } from '$lib/stores';
    import { timeline, hideRepost, hideReply, currentAlgorithm, timelineStyle, supabase } from '$lib/stores';
    import TimelineItem from './TimelineItem.svelte';
    import InfiniteLoading from 'svelte-infinite-loading';
    import {afterUpdate, onMount} from 'svelte';
    import MediaTimelineItem from './MediaTimelineItem.svelte';
    import { db } from '$lib/db';

    export let isRefreshing;
    let il;

    let paged = 0;
    let feeds;

    if (typeof $cursor !== 'number') {
        cursor.set(0);
    }

    async function getQuery(paged) {
        /* const feeds = await db.feeds
            .orderBy('indexedAt')
            .reverse()
            .filter(feed => feed.bookmark === Number($currentAlgorithm.list))
            .offset(paged * 20)
            .limit(20)
            .toArray(); */

        const {data, error} = await $supabase
            .from('feeds')
            .select()
            .eq('bookmark', $currentAlgorithm.list)
            .order('indexed_at', {ascending: false})
            .range(paged * 20, paged * 20 + 19)

        return data;
    }

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        if (!isRefreshing) {
            feeds = await getQuery($cursor);

            if (feeds?.length) {
                const uris = feeds.map(feed => feed.uri);
                console.log(uris)
                const res = await $agent.getTimeline({algorithm: $currentAlgorithm, uris: uris});
                timeline.update(function (tl) {
                    let posts = [];
                    res.data.posts.forEach(post => {
                        const id = feeds.find(feed => feed.cid === post.cid)?.id || undefined;
                        posts.push({post: post, bookmarkId: id});
                    })
                    return [...tl, ...posts];
                });

                console.log($timeline);

                cursor.set($cursor + 1);
                loaded();
            } else {
                complete();
            }
        }
    }

    afterUpdate(async() => {
        il.$$.update();
    })
</script>

<div class="timeline timeline--main" class:hide-repost={$hideRepost === 'true'} class:hide-reply={$hideReply === 'true'}>
  {#if ($timelineStyle === 'default')}
    {#each $timeline as data, index (data)}
      <TimelineItem data={ data } index={index}></TimelineItem>
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