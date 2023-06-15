<script lang="ts">
    import { agent, timelines, cursors, settings } from '$lib/stores';
    import TimelineItem from './TimelineItem.svelte';
    import InfiniteLoading from 'svelte-infinite-loading';
    import MediaTimelineItem from './MediaTimelineItem.svelte';
    import { db } from '$lib/db';

    export let column;
    export let index;
    let il;

    let paged = 0;
    let feeds;

    if (typeof $cursors[index] !== 'number') {
        $cursors[index] = 0;
    }

    async function getQuery(paged) {
        const feeds = await db.feeds
            .orderBy('indexedAt')
            .reverse()
            .filter(feed => feed.bookmark === Number(column.algorithm.list))
            .offset(paged * 20)
            .limit(20)
            .toArray();

        return feeds;
    }

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
        feeds = await getQuery($cursors[index]);

        if (feeds?.length) {
            const uris = feeds.map(feed => feed.uri);
            console.log(uris)
            const res = await $agent.getTimeline({algorithm: column.algorithm, uris: uris});

            const posts = res.data.posts.map(post => {
                const id = feeds.find(feed => feed.cid === post.cid)?.id || undefined;
                return { post: post, bookmarkId: id };
            })
            $timelines[index] = [...$timelines[index], ...posts];

            console.log($timelines[index]);

            //cursor.set($cursor + 1);
            $cursors[index] = $cursors[index] + 1;
            loaded();
        } else {
            complete();
        }
    }
</script>

<div class="timeline timeline--main" class:hide-repost={$settings?.timeline.hideRepost} class:hide-reply={$settings?.timeline.hideReply}>
  {#if (column.style === 'default')}
    {#each $timelines[index] as data, index (data)}
      <TimelineItem data={ data } index={index}></TimelineItem>
    {/each}
  {:else}
    <div class="media-list">
      {#each $timelines[index] as data (data)}
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